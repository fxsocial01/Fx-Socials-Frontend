import fs from 'node:fs';

const file = new URL('./index.js', import.meta.url);
let s = fs.readFileSync(file, 'utf8');

if (!s.includes('FX_PAYSTACK_CALLBACK_PATCH_V1')) {
  s = s.replace(
    "const FRONTEND_URL=(process.env.FRONTEND_URL||'https://fx-socials-site.onrender.com').replace(/\\/+$/,'');",
    "const FRONTEND_URL=(process.env.FRONTEND_URL||'https://fx-socials-site.onrender.com').replace(/\\/+$/,'');\nconst BACKEND_PUBLIC_URL=(process.env.BACKEND_PUBLIC_URL||'https://fx-socials-api.onrender.com').replace(/\\/+$/,'');"
  );

  s = s.replace(
    "callback_url:`${FRONTEND_URL}/#/wallet`",
    "callback_url:`${BACKEND_PUBLIC_URL}/api/wallet/callback`"
  );

  const marker = "app.post('/api/seller/listings/submit'";
  const routes = `
/* FX_PAYSTACK_CALLBACK_PATCH_V1 */
app.get('/api/wallet/callback',async(req,res)=>{
 const ref=String(req.query?.reference||req.query?.trxref||'').trim();
 const success=\`${FRONTEND_URL}/#/wallet?payment=success\`;
 const failed=\`${FRONTEND_URL}/#/wallet?payment=failed\`;
 if(!ref)return res.redirect(\`${failed}&reason=missing_reference\`);
 try{
  const tx=await paystack(ref);
  if(tx.status!=='success'||String(tx.currency||'').toUpperCase()!=='NGN')return res.redirect(\`${failed}&reason=not_successful\`);
  const amount=Number(tx.amount||0); if(amount<=0)return res.redirect(\`${failed}&reason=invalid_amount\`);
  const c=await pool.connect();
  try{
   await c.query('BEGIN');
   const p=(await c.query('SELECT * FROM payments WHERE reference=$1 FOR UPDATE',[ref])).rows[0];
   if(!p){await c.query('ROLLBACK');return res.redirect(\`${failed}&reason=payment_not_found\`)}
   if(p.status==='success'){await c.query('COMMIT');return res.redirect(\`${success}&reference=${encodeURIComponent(ref)}\`)}
   if(Number(p.requested_kobo)!==amount){await c.query('ROLLBACK');return res.redirect(\`${failed}&reason=amount_mismatch\`)}
   await c.query('UPDATE payments SET charged_kobo=$1,status=$2 WHERE reference=$3',[amount,'success',ref]);
   await c.query('UPDATE users SET balance_kobo=balance_kobo+$1 WHERE id=$2',[amount,p.user_id]);
   await c.query('COMMIT');
   return res.redirect(\`${success}&reference=${encodeURIComponent(ref)}\`);
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 }catch(e){console.error('Paystack callback error',e);return res.redirect(\`${failed}&reason=verification_failed\`)}
});

app.post('/api/wallet/webhook',async(req,res)=>{
 res.sendStatus(200);
 try{
  const secret=process.env.PAYSTACK_SECRET_KEY||'';
  const signature=String(req.headers['x-paystack-signature']||'');
  const raw=req.rawBody||'';
  const hash=crypto.createHmac('sha512',secret).update(raw).digest('hex');
  if(!signature||signature.length!==hash.length||!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(signature)))return;
  if(req.body?.event!=='charge.success')return;
  const ref=String(req.body?.data?.reference||'').trim(); if(!ref)return;
  const tx=await paystack(ref); if(tx.status!=='success'||String(tx.currency||'').toUpperCase()!=='NGN')return;
  const amount=Number(tx.amount||0); if(amount<=0)return;
  const c=await pool.connect();
  try{
   await c.query('BEGIN');
   const p=(await c.query('SELECT * FROM payments WHERE reference=$1 FOR UPDATE',[ref])).rows[0];
   if(!p||p.status==='success'){await c.query('COMMIT');return}
   if(Number(p.requested_kobo)!==amount){await c.query('ROLLBACK');return}
   await c.query('UPDATE payments SET charged_kobo=$1,status=$2 WHERE reference=$3',[amount,'success',ref]);
   await c.query('UPDATE users SET balance_kobo=balance_kobo+$1 WHERE id=$2',[amount,p.user_id]);
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 }catch(e){console.error('Paystack webhook error',e)}
});

`;
  s = s.replace(marker, routes + marker);
  fs.writeFileSync(file, s);
}
