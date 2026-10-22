const isFrontendBuild=process.argv.some(x=>/vite|npm|node_modules/.test(String(x)))&&!process.argv.some(x=>/backend[\\/]index\.js/.test(String(x)));
if(!isFrontendBuild){
 const {default:express}=await import('express');
 const {default:jwt}=await import('jsonwebtoken');
 const {default:pg}=await import('pg');
 const {registerManualTopupRoutes}=await import('./manual-topups.js');
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?.includes('render.com')?{rejectUnauthorized:false}:undefined});
 const ADMIN_EMAIL=(process.env.ADMIN_EMAIL||'yasiyrshehu@gmail.com').trim().toLowerCase();
 const auth=(req,res,next)=>{try{const t=String(req.body?.sessionToken||req.headers.authorization||'').replace(/^Bearer\\s+/i,'').trim();req.user=jwt.verify(t,process.env.JWT_SECRET);next()}catch{res.status(401).json({error:'Unauthorized'})}};
 const admin=(req,res,next)=>{if(req.user?.role!=='admin'||String(req.user.email||'').toLowerCase()!==ADMIN_EMAIL)return res.status(403).json({error:'Admin access required'});next()};
 const original=express.application.listen;
 express.application.listen=function(...args){try{registerManualTopupRoutes({app:this,pool,auth,admin})}catch(e){console.error('Manual top-up route loader:',e)}return original.apply(this,args)};
}
