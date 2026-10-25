import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import crypto from 'crypto';
import { registerMarketplaceRoutes } from './services/marketplace-routes.js';
import { registerFleexaRoutes } from './services/fleexa-routes.js';
import { registerManualTopupRoutes } from './manual-topups.js';
const {Pool}=pg;
const app=express();
const PORT=Number(process.env.PORT||10000);
const FRONTEND_URL=(process.env.FRONTEND_URL||'https://fx-socials-site.onrender.com').replace(/\/+$/,'');
const ADMIN_EMAIL=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
const LISTING_MARKUP_PERCENT=40;
const SOCIALS=['Instagram','TikTok','YouTube','Facebook','X','Snapchat','Telegram','LinkedIn','Pinterest','Reddit','Discord','Threads','Twitch'];
const GAMES=['Free Fire','PUBG Mobile','Fortnite','Roblox','EA FC','FIFA','Call of Duty','Mobile Legends','Clash of Clans','eFootball','Minecraft','Apex Legends','Valorant','GTA V'];
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
if(!process.env.JWT_SECRET)throw new Error('JWT_SECRET is required');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('render.com')?{rejectUnauthorized:false}:undefined});
app.use(cors({origin:true}));app.use(express.json({verify:(req,_res,buf)=>{req.rawBody=buf.toString('utf8')}}));
const q=(s,p=[])=>pool.query(s,p),kobo=n=>Math.round(Number(n)*100),naira=k=>Number(k||0)/100;
const token=u=>jwt.sign({id:u.id,email:u.email,role:u.role},process.env.JWT_SECRET,{expiresIn:'7d'});
function auth(req,res,next){try{const t=String(req.body?.sessionToken||req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();req.user=jwt.verify(t,process.env.JWT_SECRET);next()}catch{res.status(401).json({error:'Unauthorized'})}}
function admin(req,res,next){if(req.user?.role!=='admin'||String(req.user.email||'').toLowerCase()!==ADMIN_EMAIL)return res.status(403).json({error:'Admin access required'});next()}
function key(){const b=Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY||'','base64');if(b.length!==32)throw Error('Credential encryption key is not configured');return b}
function enc(v){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),iv),x=Buffer.concat([c.update(String(v),'utf8'),c.final()]);return [iv.toString('base64'),x.toString('base64'),c.getAuthTag().toString('base64')].join('.')}
function dec(v){const[a,b,t]=String(v).split('.'),d=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(a,'base64'));d.setAuthTag(Buffer.from(t,'base64'));return Buffer.concat([d.update(Buffer.from(b,'base64')),d.final()]).toString('utf8')}
const safe=v=>{try{return dec(v)}catch{return ''}};
async function init(){
 await q(`CREATE EXTENSION IF NOT EXISTS pgcrypto;CREATE TABLE IF NOT EXISTS users(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',balance_kobo BIGINT NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS products(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),platform TEXT NOT NULL,username TEXT NOT NULL,login_enc TEXT NOT NULL,password_enc TEXT NOT NULL,price_kobo BIGINT NOT NULL,status TEXT NOT NULL DEFAULT 'available',description TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS orders(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES users(id),product_id UUID REFERENCES products(id),product_name TEXT NOT NULL,amount_kobo BIGINT NOT NULL,status TEXT NOT NULL,delivery_login_enc TEXT,delivery_password_enc TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS payments(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES users(id),reference TEXT UNIQUE NOT NULL,requested_kobo BIGINT NOT NULL,charged_kobo BIGINT NOT NULL,status TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS wallet_audit(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),admin_id UUID NOT NULL REFERENCES users(id),user_id UUID NOT NULL REFERENCES users(id),amount_kobo BIGINT NOT NULL,type TEXT NOT NULL,reason TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
 await q(`ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price_kobo BIGINT;ALTER TABLE products ADD COLUMN IF NOT EXISTS listing_fee_kobo BIGINT NOT NULL DEFAULT 0;ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_user_id UUID REFERENCES users(id);ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_email TEXT;ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_order_number TEXT;ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_status TEXT NOT NULL DEFAULT 'available';ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_type TEXT NOT NULL DEFAULT 'social';ALTER TABLE products ADD COLUMN IF NOT EXISTS game TEXT;ALTER TABLE products ADD COLUMN IF NOT EXISTS phone_number TEXT;ALTER TABLE products ADD COLUMN IF NOT EXISTS number_type TEXT;ALTER TABLE products ADD COLUMN IF NOT EXISTS country TEXT;ALTER TABLE products ADD COLUMN IF NOT EXISTS country_code TEXT;ALTER TABLE products ADD COLUMN IF NOT EXISTS region TEXT;ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_status TEXT NOT NULL DEFAULT 'awaiting_confirmation';ALTER TABLE orders ADD COLUMN IF NOT EXISTS issue_status TEXT NOT NULL DEFAULT '';ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_order_number TEXT;UPDATE products SET base_price_kobo=price_kobo WHERE base_price_kobo IS NULL;`);
 if(process.env.ADMIN_BOOTSTRAP_PASSWORD){const h=await bcrypt.hash(process.env.ADMIN_BOOTSTRAP_PASSWORD,12);const r=await q('SELECT id FROM users WHERE email=$1',[ADMIN_EMAIL]);if(!r.rowCount)await q('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)',['Fx Socials Admin',ADMIN_EMAIL,h,'admin']);else await q('UPDATE users SET password_hash=$1,role=$2,name=$3 WHERE email=$4',[h,'admin','Fx Socials Admin',ADMIN_EMAIL])}
 registerManualTopupRoutes({app,pool,auth,admin});
}
app.get('/health',async(_,res)=>{try{await q('SELECT 1');res.json({ok:true,brand:'Fx Socials',database:'connected'})}catch{res.status(503).json({ok:false,database:'error'})}});
app.get('/api/options',(_,res)=>res.json({socials:SOCIALS,games:GAMES,numberTypes:['US','International']});
