const API_BASE=(import.meta as any).env.VITE_API_BASE_URL||'https://fx-socials-api.onrender.com';
const originalFetch=window.fetch.bind(window);
async function bodyOf(init:any){try{return init?.body?JSON.parse(init.body):{}}catch{return {}}}
async function post(path:string,body:any,init:any){const headers=new Headers(init?.headers||{});headers.set('Content-Type','application/json');return originalFetch(`${API_BASE}${path}`,{...init,method:'POST',headers,body:JSON.stringify(body)});}
window.fetch=async function(input:any,init:any={}){
 let url='';try{url=typeof input==='string'?input:input?.url||''}catch{}
 const path=(()=>{try{return new URL(url,location.href).pathname}catch{return url}})();
 if(!path.startsWith('/api/admin/'))return originalFetch(input,init);
 const b=await bodyOf(init);
 if(path==='/api/admin/wallet/credit')return post('/api/admin/users/add-funds',{sessionToken:b.sessionToken,userId:b.userId,amountNaira:Number(b.amountNaira),reason:b.reason||'Admin credit'},init);
 if(path==='/api/admin/orders/refund'){
  try{const or=await post('/api/admin/orders',{sessionToken:b.sessionToken},init),od=await or.json();if(!or.ok)return new Response(JSON.stringify(od),{status:or.status,headers:{'Content-Type':'application/json'}});const o=(od.orders||[]).find((x:any)=>String(x.id)===String(b.orderId));if(!o)return new Response(JSON.stringify({error:'Order not found'}),{status:404,headers:{'Content-Type':'application/json'}});const ur=await post('/api/admin/users',{sessionToken:b.sessionToken},init),ud=await ur.json();if(!ur.ok)return new Response(JSON.stringify(ud),{status:ur.status,headers:{'Content-Type':'application/json'}});const u=(ud.users||[]).find((x:any)=>String(x.email).toLowerCase()===String(o.userEmail||'').toLowerCase());if(!u)return new Response(JSON.stringify({error:'Order owner not found'}),{status:404,headers:{'Content-Type':'application/json'}});const amount=b.amountNaira==null||b.amountNaira===''?Number(o.amount):Number(b.amountNaira);return post('/api/admin/users/refund',{sessionToken:b.sessionToken,userId:u.userId||u.id,amountNaira:amount,reason:b.reason||'Refund'},init)}catch{return new Response(JSON.stringify({error:'Refund request failed'}),{status:500,headers:{'Content-Type':'application/json'}})}
 }
 if(path==='/api/admin/products'){
  try{const price=Number(b.price);if(!Number.isFinite(price)||price<=1200)return new Response(JSON.stringify({error:'Selling price must be greater than ₦1,200'}),{status:400,headers:{'Content-Type':'application/json'}});const sr=await post('/api/seller/listings/submit',{sessionToken:b.sessionToken,platform:b.platform,accountLabel:b.accountLabel,accountLogin:b.accountLogin,accountPassword:b.accountPassword,price:price-1200,description:b.description||''},init),sd=await sr.json();if(!sr.ok)return new Response(JSON.stringify(sd),{status:sr.status,headers:{'Content-Type':'application/json'}});const rr=await post('/api/admin/listings/review',{sessionToken:b.sessionToken,productId:sd.productId,decision:'approve'},init),rd=await rr.json();if(!rr.ok)return new Response(JSON.stringify(rd),{status:rr.status,headers:{'Content-Type':'application/json'}});return new Response(JSON.stringify({ok:true,message:`Account added to marketplace at ₦${price.toLocaleString('en-NG')}.`}),{status:200,headers:{'Content-Type':'application/json'}})}catch{return new Response(JSON.stringify({error:'Could not add account to marketplace'}),{status:500,headers:{'Content-Type':'application/json'}})}
 }
 return originalFetch(input,init);
};
