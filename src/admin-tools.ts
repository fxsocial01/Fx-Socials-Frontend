const API_BASE=(import.meta as any).env.VITE_API_BASE_URL||'https://fx-socials-api.onrender.com';
const session=()=>({sessionToken:localStorage.getItem('fxs-session')||''});
const req=async(path:string,body:any)=>{const r=await fetch(`${API_BASE}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...session(),...body})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d};
const money=(n:number)=>`₦${Number(n||0).toLocaleString('en-NG')}`;
const esc=(v:any)=>String(v??'').replace(/[&<>\"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'} as any)[s]);
let mounted=false;
async function mount(){
 if(mounted||!location.hash.includes('#/admin'))return; const root=document.querySelector('.admin-list'); if(!root)return;
 try{
  const u=await req('/api/admin/users',{}), users=u.users||[];
  const box=document.createElement('section'); box.className='admin-list'; box.id='fx-admin-tools';
  box.innerHTML=`<h3>Admin wallet controls</h3><div class="form-card"><label>User<select id="fx-admin-user"><option value="">Select user</option>${users.map((x:any)=>`<option value="${esc(x.userId||x.id)}">${esc(x.name)} — ${esc(x.email)} (${money(x.balance)})</option>`).join('')}</select></label><label>Amount (₦)<input id="fx-admin-amount" type="number" min="1" placeholder="Amount"></label><label>Reason<input id="fx-admin-reason" value="Admin adjustment"></label><div class="hero-actions"><button class="primary" id="fx-credit">Add funds</button><button class="outline" id="fx-refund">Refund user</button></div></div><h3>Add social account directly</h3><p>This is admin inventory — it does not use the public seller submission page.</p><div class="form-card"><label>Platform<select id="fx-p-platform">${['Instagram','TikTok','YouTube','Facebook','X'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>Display name / username<input id="fx-p-name" placeholder="Account name"></label><label>Login email or username<input id="fx-p-login" placeholder="Login"></label><label>Password<input id="fx-p-pass" type="password" placeholder="Password"></label><label>Selling price (₦)<input id="fx-p-price" type="number" min="1" placeholder="Price"></label><label>Notes<input id="fx-p-notes" placeholder="Optional notes"></label><button class="primary full" id="fx-add-social">Add account to marketplace</button></div>`;
  root.parentElement?.insertBefore(box,root);
  const $=(id:string)=>box.querySelector(id) as HTMLInputElement|HTMLSelectElement;
  const act=async(fn:()=>Promise<any>)=>{try{const d=await fn();alert(d.message||'Done');location.reload()}catch(e:any){alert(e.message||'Something went wrong')}};
  box.querySelector('#fx-credit')?.addEventListener('click',()=>act(()=>req('/api/admin/users/add-funds',{userId:($('#fx-admin-user') as HTMLSelectElement).value,amountNaira:Number(($(' #fx-admin-amount') as HTMLInputElement).value),reason:($(' #fx-admin-reason') as HTMLInputElement).value})));
  box.querySelector('#fx-refund')?.addEventListener('click',()=>act(()=>req('/api/admin/users/refund',{userId:($(' #fx-admin-user') as HTMLSelectElement).value,amountNaira:Number(($(' #fx-admin-amount') as HTMLInputElement).value),reason:($(' #fx-admin-reason') as HTMLInputElement).value})));
  box.querySelector('#fx-add-social')?.addEventListener('click',()=>act(async()=>{const price=Number(($(' #fx-p-price') as HTMLInputElement).value);if(price<1200)throw new Error('Price must be at least ₦1,200.');const base=price-1200;const d=await req('/api/seller/listings/submit',{platform:($(' #fx-p-platform') as HTMLSelectElement).value,accountLabel:($(' #fx-p-name') as HTMLInputElement).value,accountLogin:($(' #fx-p-login') as HTMLInputElement).value,accountPassword:($(' #fx-p-pass') as HTMLInputElement).value,price:base,description:($(' #fx-p-notes') as HTMLInputElement).value});await req('/api/admin/listings/review',{productId:d.productId,decision:'approve'});return {message:`Account added to marketplace at ${money(price)}.`}}));
  mounted=true;
 }catch(e){console.error('Fx admin tools:',e)}
}
window.addEventListener('hashchange',()=>{mounted=false;setTimeout(mount,150)});setTimeout(mount,500);
