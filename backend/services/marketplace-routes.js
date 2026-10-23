import crypto from 'crypto';
import { marketplaceConfig } from './marketplace-config.js';

const moneyKobo = n => Math.round(Number(n) * 100);
const timingSafe = (a,b) => { const x=Buffer.from(String(a||'')), y=Buffer.from(String(b||'')); return x.length===y.length && crypto.timingSafeEqual(x,y); };

async function socio(path, options={}) {
  if (!marketplaceConfig.sms.apiKey) throw new Error('SMS provider is not configured');
  const base=(marketplaceConfig.sms.baseUrl||'https://sociosms.com/api/public/v1').replace(/\/$/,'');
  const r=await fetch(base+path,{...options,headers:{Authorization:`Bearer ${marketplaceConfig.sms.apiKey}`,Accept:'application/json','Content-Type':'application/json',...(options.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw Object.assign(new Error(d?.error?.message||d?.message||`SMS provider request failed (${r.status})`),{status:r.status});
  return d;
}

export function registerMarketplaceRoutes({app,pool,auth,admin}) {
  const q=(s,p=[])=>pool.query(s,p);
  const schema=async()=>q(`
    CREATE TABLE IF NOT EXISTS marketplace_products(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),category TEXT NOT NULL CHECK(category IN ('esim','sms')),provider TEXT NOT NULL,provider_product_id TEXT,country_code TEXT,service_code TEXT,name TEXT NOT NULL,description TEXT,provider_cost_kobo BIGINT NOT NULL DEFAULT 0,sale_price_kobo BIGINT NOT NULL DEFAULT 0,currency TEXT NOT NULL DEFAULT 'NGN',status TEXT NOT NULL DEFAULT 'active',metadata JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS marketplace_orders(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES users(id),product_id UUID NOT NULL REFERENCES marketplace_products(id),paystack_reference TEXT UNIQUE,provider_order_id TEXT,provider TEXT NOT NULL,category TEXT NOT NULL,amount_kobo BIGINT NOT NULL,provider_cost_kobo BIGINT,gross_margin_kobo BIGINT,status TEXT NOT NULL DEFAULT 'wallet_pending',customer_payload JSONB NOT NULL DEFAULT '{}'::jsonb,provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,refund_credited BOOLEAN NOT NULL DEFAULT false,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS provider_order_id TEXT;
    ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS refund_credited BOOLEAN NOT NULL DEFAULT false;
    CREATE TABLE IF NOT EXISTS wallets(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,balance_kobo BIGINT NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    INSERT INTO wallets(user_id,balance_kobo) SELECT id,balance_kobo FROM users ON CONFLICT(user_id) DO UPDATE SET balance_kobo=EXCLUDED.balance_kobo;
  `);

  const refundIfNeeded=async(orderId)=>{
    const c=await pool.connect();
    try{
      await c.query('BEGIN');
      const r=await c.query('SELECT * FROM marketplace_orders WHERE id=$1 FOR UPDATE',[orderId]);
      const o=r.rows[0];
      if(!o){await c.query('ROLLBACK');return false;}
      if(o.refund_credited){await c.query('COMMIT');return false;}
      await c.query('UPDATE wallets SET balance_kobo=balance_kobo+$1,updated_at=now() WHERE user_id=$2',[Number(o.amount_kobo),o.user_id]);
      await c.query("UPDATE marketplace_orders SET status='refunded',refund_credited=true,updated_at=now() WHERE id=$1",[orderId]);
      await c.query('COMMIT');
      return true;
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  };

  const sync=async(order)=>{
    if(order.category!=='sms'||!order.provider_order_id) return order;
    const d=await socio(`/rentals/${encodeURIComponent(order.provider_order_id)}`), rental=d?.rental;
    if(!rental) return order;
    const ps=String(rental.status||'').toLowerCase();
    const next=ps==='received'||ps==='completed'?'completed':ps==='cancelled'||ps==='expired'?'refunded':ps==='waiting'?'active':order.status;
    if(next==='refunded' && !order.refund_credited) await refundIfNeeded(order.id);
    else await q('UPDATE marketplace_orders SET status=$1,provider_payload=$2,updated_at=now() WHERE id=$3',[next,rental,order.id]);
    return {...order,status:next,provider_payload:rental,refund_credited:next==='refunded'||order.refund_credited};
  };

  const deduct=async(userId,amount,orderId)=>{
    const r=await q("UPDATE wallets SET balance_kobo=balance_kobo-$1,updated_at=now() WHERE user_id=$2 AND balance_kobo>=$1 RETURNING balance_kobo",[amount,userId]);
    if(!r.rowCount) throw Object.assign(new Error('Insufficient FX Socials wallet balance or wallet not found. Please top up your FX Socials wallet first.'),{status:402});
    await q("UPDATE marketplace_orders SET status='paid',updated_at=now() WHERE id=$1 AND status='wallet_pending'",[orderId]);
    return Number(r.rows[0].balance_kobo);
  };

  const fulfill=async(order)=>{
    if(order.category!=='sms') return {status:order.status};
    if(order.provider_order_id) return {status:order.status,providerOrderId:order.provider_order_id};
    const p=(await q('SELECT * FROM marketplace_products WHERE id=$1',[order.product_id])).rows[0];
    if(!p) throw new Error('Marketplace product not found');
    const m=p.metadata||{}, body={service:p.service_code,...(p.country_code?{country:p.country_code}:{}),...(m.server?{server:m.server}:{}),...(m.strategy?{strategy:m.strategy}:{}),...(m.maxPriceNgn?{max_price_ngn:Number(m.maxPriceNgn)}:{}),...(m.autoCancelAfter?{auto_cancel_after:Number(m.autoCancelAfter)}:{})};
    await q("UPDATE marketplace_orders SET status='fulfilling',updated_at=now() WHERE id=$1",[order.id]);
    const d=await socio('/rentals',{method:'POST',body:JSON.stringify(body)}), rental=d?.rental;
    if(!rental?.id) throw new Error('SMS provider did not return a rental');
    await q("UPDATE marketplace_orders SET provider_order_id=$1,status='active',provider_payload=$2,updated_at=now() WHERE id=$3",[rental.id,rental,order.id]);
    return {status:'active',providerOrderId:rental.id,rental};
  };

  app.get('/api/marketplace/live/sms/services',async(_req,res)=>{try{const d=await socio('/services');res.json({services:d.services||[]});}catch(e){res.status(502).json({error:e.message||'Could not load SMS services'});}});
  app.get('/api/marketplace/live/sms/countries',async(req,res)=>{try{const s=String(req.query.service||'').trim();if(!s)return res.status(400).json({error:'Choose a social service first'});const d=await socio(`/countries?service=${encodeURIComponent(s)}`);res.json({countries:d.countries||[]});}catch(e){res.status(502).json({error:e.message||'Could not load countries'});}});
  app.get('/api/marketplace/live/sms/prices',async(req,res)=>{try{const s=String(req.query.service||'').trim(),c=String(req.query.country||'').trim().toUpperCase();if(!s||!c)return res.status(400).json({error:'Choose a service and country first'});const d=await socio(`/prices?service=${encodeURIComponent(s)}&country=${encodeURIComponent(c)}`),markup=Number(process.env.SMS_RENTAL_MARKUP_NGN||500);res.json({servers:(d.servers||[]).map(x=>({...x,providerPrice:Number(x.price_ngn||0),salePrice:Math.round((Number(x.price_ngn||0)+markup)*100)/100})),markup});}catch(e){res.status(502).json({error:e.message||'Could not load SMS prices'});}});
  app.post('/api/marketplace/live/sms/prepare',auth,async(req,res)=>{try{await schema();const s=String(req.body.service||'').trim(),c=String(req.body.country||'').trim().toUpperCase(),server=String(req.body.server||'').trim().toUpperCase();if(!s||!c||!server)return res.status(400).json({error:'Choose service, country and number option'});const d=await socio(`/prices?service=${encodeURIComponent(s)}&country=${encodeURIComponent(c)}`),x=(d.servers||[]).find(v=>String(v.server||'').toUpperCase()===server&&Number(v.stock||0)>0);if(!x)return res.status(409).json({error:'That number option is out of stock. Choose another option.'});const markup=Number(process.env.SMS_RENTAL_MARKUP_NGN||500),cost=Number(x.price_ngn||0),sale=cost+markup,pid=`sociosms:${s}:${c}:${server}`,meta={server,strategy:'best',autoCancelAfter:Number(process.env.SMS_AUTO_CANCEL_AFTER||120)};let r=await q('SELECT id FROM marketplace_products WHERE provider_product_id=$1 LIMIT 1',[pid]);let id=r.rows[0]?.id;if(!id){r=await q(`INSERT INTO marketplace_products(category,provider,provider_product_id,country_code,service_code,name,description,provider_cost_kobo,sale_price_kobo,currency,status,metadata) VALUES('sms',$1,$2,$3,$4,$5,$6,$7,$8,'NGN','active',$9::jsonb) RETURNING id`,[marketplaceConfig.sms.provider||'sociosms',pid,c,s,`${x.country_name||c} · ${s}`,`Live ${s} SMS rental for ${x.country_name||c}.`,moneyKobo(cost),moneyKobo(sale),JSON.stringify(meta)]);id=r.rows[0]?.id;}if(!id)throw Error('Could not prepare the SMS rental');res.json({productId:id,price:sale,providerPrice:cost,country:c,countryName:x.country_name||c,server,stock:Number(x.stock||0)});}catch(e){res.status(502).json({error:e.message||'Could not prepare SMS rental'});}});

  app.get('/api/marketplace/live/esim/catalog',async(req,res)=>{try{await schema();const c=String(req.query.country||'').trim().toUpperCase(),p=[],w=["category='esim'","status='active'"];if(c){p.push(c);w.push(`country_code=$${p.length}`);}const r=await q(`SELECT id,country_code,name,description,sale_price_kobo,currency,metadata FROM marketplace_products WHERE ${w.join(' AND ')} ORDER BY country_code,name`,p);res.json({configured:Boolean(marketplaceConfig.esim.apiKey&&marketplaceConfig.esim.baseUrl),products:r.rows.map(x=>({...x,price:Number(x.sale_price_kobo)/100}))});}catch(e){res.status(500).json({error:e.message||'Could not load eSIM catalog'});}});
  app.post('/api/marketplace/live/esim/products',auth,admin,async(req,res)=>{try{await schema();const{country,name,description,price,provider,providerProductId,metadata}=req.body;if(!country||!name||!Number.isFinite(Number(price))||Number(price)<1)return res.status(400).json({error:'Country, name and price are required'});const r=await q(`INSERT INTO marketplace_products(category,provider,provider_product_id,country_code,name,description,sale_price_kobo,currency,status,metadata) VALUES('esim',$1,$2,$3,$4,$5,$6,'NGN','active',$7::jsonb) RETURNING id`,[provider||marketplaceConfig.esim.provider||'esim-provider',providerProductId||null,String(country).toUpperCase(),name,description||null,moneyKobo(price),JSON.stringify(metadata||{})]);res.json({ok:true,id:r.rows[0].id});}catch(e){res.status(400).json({error:e.message||'Could not add eSIM product'});}});
  app.get('/api/marketplace/catalog',async(req,res)=>{try{await schema();const p=[],w=["status='active'"];if(req.query.category){p.push(String(req.query.category).toLowerCase());w.push(`category=$${p.length}`);}if(req.query.country){p.push(String(req.query.country).toUpperCase());w.push(`country_code=$${p.length}`);}if(req.query.service){p.push(String(req.query.service));w.push(`service_code=$${p.length}`);}const r=await q(`SELECT id,category,provider,provider_product_id,country_code,service_code,name,description,sale_price_kobo,currency,metadata FROM marketplace_products WHERE ${w.join(' AND ')} ORDER BY category,country_code,name`,p);res.json({products:r.rows.map(x=>({...x,price:Number(x.sale_price_kobo)/100}))});}catch(e){res.status(500).json({error:e.message||'Could not load marketplace catalog'});}});

  app.get('/api/marketplace/orders',auth,async(req,res)=>{try{await schema();const rows=(await q('SELECT * FROM marketplace_orders WHERE user_id=$1 ORDER BY created_at DESC',[req.user.id])).rows,orders=[];for(const row of rows){let o=row;if(row.category==='sms'&&row.provider_order_id&&['active','fulfilling'].includes(row.status)){try{o=await sync(row);}catch{}}orders.push({...o,amount:Number(o.amount_kobo)/100,providerPayload:o.provider_payload||{}});}res.json({orders});}catch(e){res.status(500).json({error:e.message||'Could not load marketplace orders'});}});
  app.get('/api/marketplace/orders/:id',auth,async(req,res)=>{try{await schema();let o=(await q('SELECT * FROM marketplace_orders WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0];if(!o)return res.status(404).json({error:'Order not found'});if(o.category==='sms'&&o.provider_order_id&&['active','fulfilling'].includes(o.status)){try{o=await sync(o);}catch{}}res.json({order:{...o,amount:Number(o.amount_kobo)/100,providerPayload:o.provider_payload||{}}});}catch(e){res.status(500).json({error:e.message||'Could not load order'});}});

  app.post('/api/marketplace/orders/purchase',auth,async(req,res)=>{let orderId=null;try{await schema();const p=(await q("SELECT * FROM marketplace_products WHERE id=$1 AND status='active'",[req.body.productId])).rows[0];if(!p)return res.status(404).json({error:'Marketplace product not found'});const amount=Number(p.sale_price_kobo);const o=(await q(`INSERT INTO marketplace_orders(user_id,product_id,provider,category,amount_kobo,provider_cost_kobo,gross_margin_kobo,status,customer_payload) VALUES($1,$2,$3,$4,$5,$6,$7,'wallet_pending',$8) RETURNING *`,[req.user.id,p.id,p.provider,p.category,amount,p.provider_cost_kobo,amount-Number(p.provider_cost_kobo),req.body.customer||{}])).rows[0];orderId=o.id;const balance=await deduct(req.user.id,amount,o.id);const updated=(await q('SELECT * FROM marketplace_orders WHERE id=$1',[o.id])).rows[0];const fulfillment=await fulfill(updated);res.json({ok:true,orderId:o.id,status:fulfillment.status,providerOrderId:fulfillment.providerOrderId||null,rental:fulfillment.rental||null,walletBalance:balance/100});}catch(e){if(orderId){try{const o=(await q('SELECT * FROM marketplace_orders WHERE id=$1',[orderId])).rows[0];if(o?.status==='paid'&&!o.refund_credited)await refundIfNeeded(orderId);}catch{}}res.status(e.status===402?402:502).json({error:e.message||'Marketplace purchase failed'});}});
  app.post('/api/marketplace/orders/initialize',auth,async(req,res)=>{try{await schema();const p=(await q("SELECT * FROM marketplace_products WHERE id=$1 AND status='active'",[req.body.productId])).rows[0];if(!p)return res.status(404).json({error:'Marketplace product not found'});const w=(await q('SELECT balance_kobo FROM wallets WHERE user_id=$1',[req.user.id])).rows[0];if(!w)return res.status(400).json({error:'Wallet not found. Please top up your FX Socials wallet first.'});const amount=Number(p.sale_price_kobo),balance=Number(w.balance_kobo);if(balance<amount)return res.status(402).json({error:'Insufficient FX Socials wallet balance',required:amount/100,balance:balance/100,topUpRequired:(amount-balance)/100});const ref=`FXMKT-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;const o=(await q(`INSERT INTO marketplace_orders(user_id,product_id,paystack_reference,provider,category,amount_kobo,provider_cost_kobo,gross_margin_kobo,status,customer_payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'wallet_pending',$9) RETURNING id`,[req.user.id,p.id,ref,p.provider,p.category,amount,p.provider_cost_kobo,amount-Number(p.provider_cost_kobo),req.body.customer||{}])).rows[0];res.json({ok:true,orderId:o.id,reference:ref,amount:amount/100,walletBalance:balance/100});}catch(e){res.status(500).json({error:e.message||'Could not initialize wallet purchase'});}});

  app.post('/api/marketplace/orders/:id/cancel',auth,async(req,res)=>{try{const o=(await q('SELECT * FROM marketplace_orders WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0];if(!o)return res.status(404).json({error:'Order not found'});if(o.category!=='sms'||!o.provider_order_id)return res.status(400).json({error:'This order cannot be cancelled here'});if(o.refund_credited)return res.json({ok:true,refunded:Number(o.amount_kobo)/100,message:'This order was already refunded.'});const d=await socio(`/rentals/${encodeURIComponent(o.provider_order_id)}/cancel`,{method:'POST'});await refundIfNeeded(o.id);await q('UPDATE marketplace_orders SET provider_payload=$1,updated_at=now() WHERE id=$2',[d?.rental||d,o.id]);const w=(await q('SELECT balance_kobo FROM wallets WHERE user_id=$1',[req.user.id])).rows[0];res.json({ok:true,refunded:Number(o.amount_kobo)/100,walletBalance:Number(w?.balance_kobo||0)/100,message:'Rental cancelled and wallet refunded.'});}catch(e){res.status(e.status===409?409:502).json({error:e.message||'Could not cancel rental'});}});

  app.post('/api/marketplace/webhooks/paystack',async(req,res)=>{const signature=req.headers['x-paystack-signature'];if(!signature||!process.env.PAYSTACK_SECRET_KEY)return res.status(401).json({error:'Webhook authentication unavailable'});const expected=crypto.createHmac('sha512',process.env.PAYSTACK_SECRET_KEY).update(req.rawBody||JSON.stringify(req.body)).digest('hex');if(!timingSafe(signature,expected))return res.status(401).json({error:'Invalid webhook signature'});res.sendStatus(200);});
}
