import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;
const app = express();
const PORT = Number(process.env.PORT || 10000);
const FRONTEND_URL = (process.env.FRONTEND_URL || '*').replace(/\/+$/, '');
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'yasiyrshehu@gmail.com').trim().toLowerCase();

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined,
});

app.use(cors({ origin: FRONTEND_URL === '*' ? true : FRONTEND_URL }));
app.use(express.json());

const kobo = (naira) => Math.round(Number(naira) * 100);
const naira = (k) => Number(k || 0) / 100;

function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}
function getToken(req) {
  return String(req.body?.sessionToken || req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
}
function auth(req, res, next) {
  try {
    const raw = getToken(req);
    if (!raw) throw new Error('missing');
    req.user = jwt.verify(raw, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin' || String(req.user.email).toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
function key32() {
  const key = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY || '', 'base64');
  if (key.length !== 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes');
  return key;
}
function enc(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key32(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return [iv.toString('base64'), ciphertext.toString('base64'), cipher.getAuthTag().toString('base64')].join('.');
}
function dec(value) {
  const [iv, data, tag] = String(value).split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key32(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
async function q(sql, params = []) { return pool.query(sql, params); }

async function init() {
  await q(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS users(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      balance_kobo BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS products(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), platform TEXT NOT NULL, username TEXT NOT NULL,
      login_enc TEXT NOT NULL, password_enc TEXT NOT NULL, price_kobo BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available', description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS orders(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), product_id UUID REFERENCES products(id),
      product_name TEXT NOT NULL, amount_kobo BIGINT NOT NULL, status TEXT NOT NULL,
      delivery_login_enc TEXT, delivery_password_enc TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS payments(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), reference TEXT UNIQUE NOT NULL,
      requested_kobo BIGINT NOT NULL, charged_kobo BIGINT NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS wallet_audit(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), admin_id UUID NOT NULL REFERENCES users(id), user_id UUID NOT NULL REFERENCES users(id),
      amount_kobo BIGINT NOT NULL, type TEXT NOT NULL, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Repair the reserved admin account if it was previously created as a customer.
  await q('UPDATE users SET role=$1, name=$2 WHERE email=$3', ['admin', 'Fx Socials Admin', ADMIN_EMAIL]);
  if (process.env.ADMIN_BOOTSTRAP_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_BOOTSTRAP_PASSWORD, 12);
    const existing = await q('SELECT id FROM users WHERE email=$1', [ADMIN_EMAIL]);
    if (!existing.rowCount) {
      await q('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)', ['Fx Socials Admin', ADMIN_EMAIL, hash, 'admin']);
    } else {
      await q('UPDATE users SET password_hash=$1, role=$2, name=$3 WHERE email=$4', [hash, 'admin', 'Fx Socials Admin', ADMIN_EMAIL]);
    }
  }
}

app.get('/health', async (req, res) => {
  try { await q('SELECT 1'); res.json({ ok:true, brand:'Fx Socials', database:'connected' }); }
  catch { res.status(503).json({ ok:false, brand:'Fx Socials', database:'error' }); }
});

app.get('/api/products', async (req, res) => {
  try {
    const r = await q("SELECT id,platform,username,price_kobo,status,description FROM products WHERE status='available' ORDER BY created_at DESC");
    res.json({ products:r.rows.map(x=>({id:x.id,platform:x.platform,username:x.username,price:naira(x.price_kobo),status:x.status,description:x.description||''})) });
  } catch { res.status(500).json({error:'Could not load the store'}); }
});

app.post('/api/auth/register', async (req,res)=>{
  try {
    const name=String(req.body?.name||'').trim(), email=String(req.body?.email||'').trim().toLowerCase(), password=String(req.body?.password||'');
    if(!name||!email||!password) return res.status(400).json({error:'Name, email and password are required'});
    if(email===ADMIN_EMAIL) return res.status(403).json({error:'This email is reserved for the store administrator'});
    if(password.length<8) return res.status(400).json({error:'Password must be at least 8 characters'});
    const hash=await bcrypt.hash(password,12);
    const r=await q('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role',[name,email,hash,'customer']);
    const u=r.rows[0]; res.json({token:tokenFor(u),user:{userId:u.id,name:u.name,email:u.email,role:u.role}});
  } catch(e){res.status(400).json({error:e?.code==='23505'?'Email already registered':'Registration failed'});}
});

app.post('/api/auth/login', async (req,res)=>{
  try {
    const email=String(req.body?.email||'').trim().toLowerCase(), password=String(req.body?.password||'');
    if(!email||!password) return res.status(400).json({error:'Enter email and password'});
    let r=await q('SELECT * FROM users WHERE email=$1',[email]), u=r.rows[0];
    if(!u) return res.status(401).json({error:'Invalid email or password'});
    const ok=await bcrypt.compare(password,u.password_hash);
    const bootstrap=Boolean(email===ADMIN_EMAIL && process.env.ADMIN_BOOTSTRAP_PASSWORD && password===process.env.ADMIN_BOOTSTRAP_PASSWORD);
    if(!ok&&!bootstrap) return res.status(401).json({error:'Invalid email or password'});
    if(email===ADMIN_EMAIL){r=await q('UPDATE users SET role=$1,name=$2 WHERE id=$3 RETURNING *',['admin','Fx Socials Admin',u.id]);u=r.rows[0];}
    res.json({token:tokenFor(u),user:{userId:u.id,name:u.name,email:u.email,role:u.role}});
  } catch { res.status(500).json({error:'Login failed'}); }
});
app.post('/api/auth/logout',auth,(req,res)=>res.json({ok:true}));

app.post('/api/me',auth,async(req,res)=>{const r=await q('SELECT id,name,email,role,balance_kobo FROM users WHERE id=$1',[req.user.id]);if(!r.rowCount)return res.status(401).json({error:'User not found'});const u=r.rows[0];res.json({user:{userId:u.id,name:u.name,email:u.email,role:u.role},wallet:{balance:naira(u.balance_kobo)}});});
app.post('/api/me/wallet',auth,async(req,res)=>{const r=await q('SELECT balance_kobo FROM users WHERE id=$1',[req.user.id]);res.json({wallet:{balance:naira(r.rows[0]?.balance_kobo)}});});
app.post('/api/me/orders',auth,async(req,res)=>{const r=await q('SELECT id,product_name,amount_kobo,status,created_at,delivery_login_enc,delivery_password_enc FROM orders WHERE user_id=$1 ORDER BY created_at DESC',[req.user.id]);res.json({orders:r.rows.map(x=>({id:x.id,productName:x.product_name,amount:naira(x.amount_kobo),status:x.status,createdAt:x.created_at,delivery:x.delivery_login_enc?`Login: ${dec(x.delivery_login_enc)}\nPassword: ${dec(x.delivery_password_enc)}`:'Pending'}))});});

async function paystackVerify(reference){
  if(!process.env.PAYSTACK_SECRET_KEY) throw Object.assign(new Error('Paystack secret key is not configured on the Render backend'),{status:503});
  const response=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`,'Content-Type':'application/json'}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.status){const e=new Error(String(data.message||'Paystack verification failed'));e.status=502;throw e;}
  return data.data;
}

app.post('/api/wallet/initialize',auth,async(req,res)=>{
  const requested=Math.round(Number(req.body?.amountNaira));
  if(!Number.isFinite(requested)||requested<100||requested>5000000)return res.status(400).json({error:'Enter an amount between ₦100 and ₦5,000,000'});
  try{
    const reference=`FXWALLET-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    await q('INSERT INTO payments(user_id,reference,requested_kobo,charged_kobo,status) VALUES($1,$2,$3,$3,$4)',[req.user.id,reference,kobo(requested),'pending']);
    const response=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY||''}`,'Content-Type':'application/json'},body:JSON.stringify({email:req.user.email,amount:kobo(requested),reference,currency:'NGN',callback_url:`${FRONTEND_URL}/#/wallet`})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.status){await q('UPDATE payments SET status=$1 WHERE reference=$2',['failed',reference]);const msg=String(data.message||'Paystack initialization failed');return res.status(502).json({error:msg.toLowerCase().includes('invalid key')?'Paystack rejected the server key. Check PAYSTACK_SECRET_KEY in Render. Do not pay again.':msg});}
    res.json({authorizationUrl:data.data.authorization_url,reference});
  }catch(e){res.status(e.status||502).json({error:e.message||'Could not start Paystack checkout'});}
});

app.post('/api/wallet/verify',auth,async(req,res)=>{
  const reference=String(req.body?.reference||'').trim();
  if(!reference)return res.status(400).json({error:'Payment reference is required'});
  try{
    let payment=(await q('SELECT * FROM payments WHERE reference=$1 AND user_id=$2',[reference,req.user.id])).rows[0]||null;
    const tx=await paystackVerify(reference);
    if(!tx||tx.status!=='success')return res.status(400).json({error:`Paystack reports this transaction as ${tx?.status||'not successful'}. Do not pay again.`});
    if(String(tx.currency||'').toUpperCase()!=='NGN')return res.status(400).json({error:'Paystack returned a non-NGN transaction. Wallet was not credited.'});
    const payerEmail=String(tx.customer?.email||'').trim().toLowerCase();
    if(!payment){
      if(!payerEmail||payerEmail!==String(req.user.email).toLowerCase())return res.status(403).json({error:'This payment belongs to a different email account. Sign in with the email used on Paystack.'});
      const requested=Number(tx.requested_amount||tx.amount||0);
      if(!Number.isFinite(requested)||requested<=0)return res.status(400).json({error:'Could not determine the original payment amount.'});
      const inserted=await q('INSERT INTO payments(user_id,reference,requested_kobo,charged_kobo,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(reference) DO NOTHING RETURNING *',[req.user.id,reference,requested,Number(tx.amount||0),'pending']);
      payment=inserted.rows[0]||(await q('SELECT * FROM payments WHERE reference=$1 AND user_id=$2',[reference,req.user.id])).rows[0];
    }
    const requested=Number(payment.requested_kobo), requestedFromPaystack=Number(tx.requested_amount), charged=Number(tx.amount||0);
    if(Number.isFinite(requestedFromPaystack)&&requestedFromPaystack!==requested)return res.status(400).json({error:'Paystack amount does not match the original wallet top-up. Do not pay again; contact support with the reference.'});
    if(!Number.isFinite(requestedFromPaystack)&&charged!==requested)return res.status(400).json({error:'Paystack amount does not match the original wallet top-up. Do not pay again; contact support with the reference.'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const locked=(await client.query('SELECT * FROM payments WHERE reference=$1 FOR UPDATE',[reference])).rows[0];
      if(!locked)throw new Error('Payment record disappeared');
      if(locked.status==='success'){const bal=(await client.query('SELECT balance_kobo FROM users WHERE id=$1',[req.user.id])).rows[0]?.balance_kobo;await client.query('COMMIT');return res.json({message:'Payment already credited.',balance:naira(bal)});}
      await client.query('UPDATE payments SET charged_kobo=$1,status=$2 WHERE reference=$3',[charged,'success',reference]);
      const credited=Number(locked.requested_kobo);
      const updated=await client.query('UPDATE users SET balance_kobo=balance_kobo+$1 WHERE id=$2 RETURNING balance_kobo',[credited,req.user.id]);
      await client.query('COMMIT');
      return res.json({message:`Payment verified. ₦${naira(credited).toLocaleString('en-NG')} added to your wallet.`,balance:naira(updated.rows[0].balance_kobo)});
    }catch(e){try{await client.query('ROLLBACK')}catch{}throw e;}finally{client.release();}
  }catch(e){const msg=String(e.message||'Payment verification failed');if(msg.toLowerCase().includes('invalid key'))return res.status(502).json({error:'Paystack rejected the server key. Check PAYSTACK_SECRET_KEY in Render; do not pay again.'});res.status(e.status||502).json({error:msg});}
});

app.post('/api/orders',auth,async(req,res)=>{const productId=String(req.body?.productId||'');if(!productId)return res.status(400).json({error:'Product is required'});const client=await pool.connect();try{await client.query('BEGIN');const p=(await client.query("SELECT * FROM products WHERE id=$1 AND status='available' FOR UPDATE",[productId])).rows[0];if(!p){await client.query('ROLLBACK');return res.status(404).json({error:'Listing is no longer available'});}const u=(await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[req.user.id])).rows[0];if(Number(u.balance_kobo)<Number(p.price_kobo)){await client.query('ROLLBACK');return res.status(400).json({error:'Insufficient wallet balance. Add funds first.'});}await client.query('UPDATE users SET balance_kobo=balance_kobo-$1 WHERE id=$2',[p.price_kobo,req.user.id]);await client.query('UPDATE products SET status=$1 WHERE id=$2',['sold',p.id]);await client.query('INSERT INTO orders(user_id,product_id,product_name,amount_kobo,status,delivery_login_enc,delivery_password_enc) VALUES($1,$2,$3,$4,$5,$6,$7)',[req.user.id,p.id,p.username,p.price_kobo,'completed',p.login_enc,p.password_enc]);await client.query('COMMIT');res.json({message:'Purchase successful. Account credentials are available in My Orders.'});}catch(e){try{await client.query('ROLLBACK')}catch{}res.status(500).json({error:'Purchase failed'});}finally{client.release();}});

app.post('/api/admin/products/list',auth,adminOnly,async(req,res)=>{const r=await q('SELECT id,platform,username,price_kobo,status,description,created_at FROM products ORDER BY created_at DESC');res.json({products:r.rows.map(x=>({id:x.id,platform:x.platform,username:x.username,price:naira(x.price_kobo),status:x.status,description:x.description||'',createdAt:x.created_at}))});});
app.post('/api/admin/products',auth,adminOnly,async(req,res)=>{const platform=String(req.body?.platform||'').trim(),username=String(req.body?.accountLabel||req.body?.username||'').trim(),login=String(req.body?.accountLogin||''),password=String(req.body?.accountPassword||''),price=Math.round(Number(req.body?.price)),description=String(req.body?.description||'').trim();if(!platform||!username||!login||!password||!Number.isFinite(price)||price<1)return res.status(400).json({error:'Platform, display name, login, password and price are required'});const r=await q('INSERT INTO products(platform,username,login_enc,password_enc,price_kobo,description) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,platform,username,price_kobo,status,description',[platform,username,enc(login),enc(password),kobo(price),description]);const x=r.rows[0];res.json({product:{id:x.id,platform:x.platform,username:x.username,price:naira(x.price_kobo),status:x.status,description:x.description||''}});});
app.post('/api/admin/products/delete',auth,adminOnly,async(req,res)=>{const id=String(req.body?.productId||'');if(!id)return res.status(400).json({error:'Product is required'});await q('UPDATE products SET status=$1 WHERE id=$2',['removed',id]);res.json({ok:true});});
app.post('/api/admin/users',auth,adminOnly,async(req,res)=>{const r=await q('SELECT id,name,email,balance_kobo,role FROM users ORDER BY created_at DESC');res.json({users:r.rows.map(x=>({userId:x.id,name:x.name,email:x.email,balance:naira(x.balance_kobo),role:x.role}))});});
async function adminAdjust(req,res,type){const userId=String(req.body?.userId||''),amount=Math.round(Number(req.body?.amountNaira));if(!userId||!Number.isFinite(amount)||amount<100)return res.status(400).json({error:'Enter a valid amount of at least ₦100'});const client=await pool.connect();try{await client.query('BEGIN');const u=(await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId])).rows[0];if(!u){await client.query('ROLLBACK');return res.status(404).json({error:'User not found'});}if(type==='refund'){const current=Number((await client.query('SELECT balance_kobo FROM users WHERE id=$1',[userId])).rows[0].balance_kobo);await client.query('UPDATE users SET balance_kobo=$1 WHERE id=$2',[Math.max(0,current+kobo(amount)),userId]);}else await client.query('UPDATE users SET balance_kobo=balance_kobo+$1 WHERE id=$2',[kobo(amount),userId]);await client.query('INSERT INTO wallet_audit(admin_id,user_id,amount_kobo,type,reason) VALUES($1,$2,$3,$4,$5)',[req.user.id,userId,kobo(amount),type,type==='refund'?'Admin refund':'Admin wallet credit']);await client.query('COMMIT');res.json({ok:true});}catch(e){try{await client.query('ROLLBACK')}catch{}res.status(500).json({error:'Wallet adjustment failed'});}finally{client.release();}}
app.post('/api/admin/users/add-funds',auth,adminOnly,(req,res)=>adminAdjust(req,res,'add-funds'));
app.post('/api/admin/users/refund',auth,adminOnly,(req,res)=>adminAdjust(req,res,'refund'));
app.post('/api/admin/orders',auth,adminOnly,async(req,res)=>{const r=await q('SELECT o.id,o.product_name,o.amount_kobo,o.status,o.created_at,u.email AS user_email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC');res.json({orders:r.rows.map(x=>({id:x.id,productName:x.product_name,amount:naira(x.amount_kobo),status:x.status,createdAt:x.created_at,userEmail:x.user_email}))});});

app.listen(PORT,'0.0.0.0',()=>console.log(`Fx Socials API listening on ${PORT}`));
init().catch(err=>{console.error('Database initialization failed:',err);process.exit(1);});
