import crypto from 'crypto';

const base=()=>String(process.env.SMM_PROVIDER_1_API_URL||process.env.SMM_API_URL||'https://app.smmpanel.ng/api/v2').replace(/\/$/,'');
const key=()=>String(process.env.SMM_PROVIDER_1_API_KEY||process.env.SMM_API_KEY||'').trim();
const markup=()=>{const n=Number(process.env.SMM_TEMP_NUMBER_MARKUP_PERCENT||50);return Number.isFinite(n)&&n>=0?n:50};
const moneyKobo=n=>Math.round(Number(n||0)*100);
const normalize=v=>String(v||'').toLowerCase();
async function panel(action,params={}){
  if(!key())throw Object.assign(new Error('Provider 1 API key is not configured on Render.'),{status:503,code:'PROVIDER_NOT_CONFIGURED'});
  const body=new URLSearchParams({key:key(),action,...params});
  const r=await fetch(base(),{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','User-Agent':'FX-Socials/1.0'},body});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d?.error)throw Object.assign(new Error(d?.error||d?.message||`Provider 1 returned HTTP ${r.status}`),{status:r.status||502});
  return d;
}
function candidates(d){
  const list=Array.isArray(d)?d:Array.isArray(d?.services)?d.services:Array.isArray(d?.data)?d.data:[];
  return list.filter(s=>{const t=normalize(`${s.name||''} ${s.category||''} ${s.type||''} ${s.description||''}`);return /temporary|temp/.test(t)&&/number|sms|phone/.test(t)&&/\bus\b|usa|united states|america/.test(t)}).map(s=>{const cost=Number(s.rate||s.price||s.cost||0);return {id:String(s.service||s.id),name:String(s.name||'USA Temporary Number'),type:String(s.type||''),category:String(s.category||''),providerPrice:cost,salePrice:Math.round(cost*(1+markup()/100)*100)/100,min:Number(s.min||1),max:Number(s.max||1),markupPercent:markup()};}).filter(s=>s.id&&s.providerPrice>0)}
export function registerTempNumberRoutes({app,pool,auth}){
 const q=(s,p=[])=>pool.query(s,p);
 const ensure=()=>q(`CREATE TABLE IF NOT EXISTS temp_number_orders(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES users(id),provider_order_id TEXT,service_id TEXT NOT NULL,service_name TEXT NOT NULL,phone TEXT,amount_kobo BIGINT NOT NULL,provider_cost_kobo BIGINT NOT NULL,markup_percent NUMERIC NOT NULL DEFAULT 50,status TEXT NOT NULL DEFAULT 'pending',provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
 app.get('/api/smm/temp-numbers',async(_req,res)=>{try{const d=await panel('services');const items=candidates(d);res.json({configured:true,markupPercent:markup(),services:items});}catch(e){res.status(e.status||502).json({configured:Boolean(key()),markupPercent:markup(),services:[],error:e.message||'Provider 1 temporary-number catalog unavailable'});}});
 app.post('/api/smm/temp-numbers/buy',auth,async(req,res)=>{let orderId=null;try{await ensure();const d=await panel('services'),items=candidates(d),id=String(req.body.serviceId||''),item=items.find(x=>x.id===id);if(!item)return res.status(404).json({error:'USA temporary-number service is not available from Provider 1 right now.'});const amount=moneyKobo(item.salePrice),cost=moneyKobo(item.providerPrice);const c=await pool.connect();try{await c.query('BEGIN');const w=(await c.query('SELECT id,balance_kobo FROM wallets WHERE user_id=$1 FOR UPDATE',[req.user.id])).rows[0];if(!w||Number(w.balance_kobo)<amount)throw Object.assign(new Error('Insufficient FX Socials wallet balance.'),{status:402});await c.query('UPDATE wallets SET balance_kobo=balance_kobo-$1,updated_at=now() WHERE id=$2',[amount,w.id]);const o=(await c.query(`INSERT INTO temp_number_orders(user_id,service_id,service_name,amount_kobo,provider_cost_kobo,markup_percent,status) VALUES($1,$2,$3,$4,$5,$6,'paid') RETURNING id`,[req.user.id,item.id,item.name,amount,cost,markup()])).rows[0];orderId=o.id;await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
    let provider;try{provider=await panel('add',{service:item.id,quantity:'1'});}catch(e){const c=await pool.connect();try{await c.query('BEGIN');await c.query('UPDATE wallets SET balance_kobo=balance_kobo+$1,updated_at=now() WHERE user_id=$2',[amount,req.user.id]);await c.query("UPDATE temp_number_orders SET status='refunded',provider_payload=$1 WHERE id=$2",[JSON.stringify({error:e.message}),orderId]);await c.query('COMMIT')}catch{await c.query('ROLLBACK')}finally{c.release()}throw e}
    const phone=provider?.phone||provider?.number||provider?.phone_number||provider?.data?.phone||provider?.data?.number||null;const providerOrderId=String(provider?.order||provider?.id||provider?.requestId||provider?.data?.order||'');await q('UPDATE temp_number_orders SET provider_order_id=$1,phone=$2,status=$3,provider_payload=$4 WHERE id=$5',[providerOrderId,phone,phone?'active':'pending',JSON.stringify(provider),orderId]);res.json({ok:true,orderId,providerOrderId,phone,service:item.name,amount:item.salePrice,markupPercent:markup(),message:phone?'USA temporary number purchased.':'Provider accepted the request; the number will be shown when returned by the provider.'});
  }catch(e){res.status(e.status||502).json({error:e.message||'Could not purchase USA temporary number'});}});
 app.get('/api/smm/temp-numbers/orders',auth,async(req,res)=>{try{await ensure();const r=await q('SELECT * FROM temp_number_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[req.user.id]);res.json({orders:r.rows.map(x=>({...x,amount:Number(x.amount_kobo)/100,providerCost:Number(x.provider_cost_kobo)/100}))});}catch(e){res.status(500).json({error:e.message})}});
}
