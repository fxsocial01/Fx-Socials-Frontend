import fs from 'node:fs';
import path from 'node:path';

// Render starts the API with cwd at the repository root and entrypoint=backend/index.js.
// This preload makes the existing API runtime safe without replacing the production server.
const file=path.resolve(process.cwd(),'backend','index.js');
let source=fs.readFileSync(file,'utf8');

source=source.replace("issueStatus:x.issue_status}))});\napp.post('/api/admin/users'","issueStatus:x.issue_status}))});});\napp.post('/api/admin/users'");
source=source.replace("createdAt:x.created_at}))});\napp.post('/api/admin/products/delete'","createdAt:x.created_at}))});});\napp.post('/api/admin/products/delete'");
source=source.replace("app.get('/developers'","app.get('/developers-legacy'");
if(!source.includes("./api-platform.js"))source="import { registerApiPlatform } from './api-platform.js';\nimport { registerDeveloperPortal } from './developer-portal.js';\nimport { registerTempNumberRoutes } from './temp-number-routes.js';\n"+source;
if(!source.includes('registerApiPlatform({app,pool,auth,admin})'))source=source.replace('app.listen(PORT','registerApiPlatform({app,pool,auth,admin});\nregisterDeveloperPortal({app});\nregisterTempNumberRoutes({app,pool,auth});\napp.listen(PORT');

const FRONTEND_URL=(process.env.FRONTEND_URL||'https://fx-socials-site.onrender.com').replace(/\/+$/,'');
const BACKEND_PUBLIC_URL=(process.env.BACKEND_PUBLIC_URL||'https://fx-socials-api.onrender.com').replace(/\/+$/,'');

if(!source.includes('FX_PAYSTACK_CALLBACK_V2')){
  source=source.replace(
    "const FRONTEND_URL=(process.env.FRONTEND_URL||'https://fx-socials-site.onrender.com').replace(/\\/+$/,'');",
    "const FRONTEND_URL=(process.env.FRONTEND_URL||'https://fx-socials-site.onrender.com').replace(/\\/+$/,'');\nconst BACKEND_PUBLIC_URL=(process.env.BACKEND_PUBLIC_URL||'https://fx-socials-api.onrender.com').replace(/\\/+$/,'');"
  );
  source=source.replace(
    "callback_url:`${FRONTEND_URL}/#/wallet`",
    "callback_url:`${BACKEND_PUBLIC_URL}/api/wallet/callback`"
  );
  const paystackRoutes=`
/* FX_PAYSTACK_CALLBACK_V2 */
app.get('/api/wallet/callback',async(req,res)=>{const ref=String(req.query?.reference||req.query?.trxref||'').trim();const ok=\`${FRONTEND_URL}/#/wallet?payment=success\`;const fail=\`${FRONTEND_URL}/#/wallet?payment=failed\`;if(!ref)return res.redirect(\`${fail}&reason=missing_reference\`);try{const tx=await paystack(ref);if(tx.status!=='success'||String(tx.currency||'').toUpperCase()!=='NGN')return res.redirect(\`${fail}&reason=not_successful\`);const amount=Number(tx.amount||0);if(!Number.isSafeInteger(amount)||amount<=0)return res.redirect(\`${fail}&reason=invalid_amount\`);const c=await pool.connect();try{await c.query('BEGIN');const p=(await c.query('SELECT user_id,requested_kobo,status FROM payments WHERE reference=$1 FOR UPDATE',[ref])).rows[0];if(!p){await c.query('ROLLBACK');return res.redirect(\`${fail}&reason=payment_not_found\`)}if(p.status==='success'){await c.query('COMMIT');return res.redirect(\`${ok}&reference=${encodeURIComponent(ref)}\`)}if(Number(p.requested_kobo)!==amount){await c.query('ROLLBACK');return res.redirect(\`${fail}&reason=amount_mismatch\`)}await c.query('UPDATE payments SET charged_kobo=$1,status=$2 WHERE reference=$3',[amount,'success',ref]);await c.query('UPDATE users SET balance_kobo=balance_kobo+$1 WHERE id=$2',[amount,p.user_id]);await c.query('COMMIT');return res.redirect(\`${ok}&reference=${encodeURIComponent(ref)}\`)}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}}catch(e){console.error('Paystack callback error',e);return res.redirect(\`${fail}&reason=verification_failed\`)}});
app.post('/api/wallet/webhook',async(req,res)=>{const signature=String(req.headers['x-paystack-signature']||'');const secret=process.env.PAYSTACK_SECRET_KEY||'';const raw=req.rawBody||'';if(!secret||!signature||!raw)return res.sendStatus(401);const expected=crypto.createHmac('sha512',secret).update(raw).digest('hex');if(signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return res.sendStatus(401);if(req.body?.event!=='charge.success')return res.sendStatus(200);const ref=String(req.body?.data?.reference||'').trim();if(!ref)return res.sendStatus(200);try{const tx=await paystack(ref);if(tx.status!=='success'||String(tx.currency||'').toUpperCase()!=='NGN')return res.sendStatus(200);const amount=Number(tx.amount||0);if(!Number.isSafeInteger(amount)||amount<=0)return res.sendStatus(200);const c=await pool.connect();try{await c.query('BEGIN');const p=(await c.query('SELECT user_id,requested_kobo,status FROM payments WHERE reference=$1 FOR UPDATE',[ref])).rows[0];if(!p||p.status==='success'){await c.query('COMMIT');return res.sendStatus(200)}if(Number(p.requested_kobo)!==amount){await c.query('ROLLBACK');return res.sendStatus(200)}await c.query('UPDATE payments SET charged_kobo=$1,status=$2 WHERE reference=$3',[amount,'success',ref]);await c.query('UPDATE users SET balance_kobo=balance_kobo+$1 WHERE id=$2',[amount,p.user_id]);await c.query('COMMIT')}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}return res.sendStatus(200)}catch(e){console.error('Paystack webhook error',e);return res.sendStatus(500)}});
`;
  source=source.replace('app.listen(PORT',paystackRoutes+'app.listen(PORT');
}
fs.writeFileSync(file,source,'utf8');
