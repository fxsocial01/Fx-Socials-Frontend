const API_BASE=(import.meta as any).env.VITE_API_BASE_URL||'https://fx-socials-api.onrender.com';
const originalFetch=window.fetch.bind(window);
const session=()=>({sessionToken:localStorage.getItem('fxs-session')||''});
async function api(path:string,body:any={}){const r=await originalFetch(`${API_BASE}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...session(),...body})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d}
function node(tag:string,props:any={},text=''){const x=document.createElement(tag) as any;Object.entries(props).forEach(([k,v])=>{if(k==='className')x.className=v;else Object.assign(x,k==='style'?x.style:{[k]:v})});if(text)x.textContent=text;return x}
let installed=false;
async function install(){
 if(installed)return;
 const u=(()=>{try{return JSON.parse(localStorage.getItem('fxs-user')||'null')}catch{return null}})();
 if(!u||String(u.email||'').toLowerCase()!=='yasiyrshehu@gmail.com')return;
 const h=[...document.querySelectorAll('h2')].find((x:any)=>String(x.textContent||'').trim().toLowerCase()==='admin dashboard');
 const list=document.querySelector('.admin-list') as HTMLElement|null;if(!h||!list)return;
 installed=true;
 const box=node('section',{style:{margin:'16px 0',padding:'18px',border:'1px solid #ddd',borderRadius:'16px',background:'#fafafa',color:'#111'}});
 box.appendChild(node('h3',{style:{margin:'0 0 6px',fontSize:'22px'}},'Easy Admin'));box.appendChild(node('p',{style:{margin:'0 0 14px',color:'#666'}},'Choose what you want to do. Add inventory or search everything in one place.'));
 const tabs=node('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'12px'}});
 const addPhone=node('button',{style:{padding:'12px',border:0,borderRadius:'10px',background:'#111',color:'#fff',fontWeight:'800'}},'📱 Add Phone');
 const addSocial=node('button',{style:{padding:'12px',border:0,borderRadius:'10px',background:'#111',color:'#fff',fontWeight:'800'}},'📸 Add Social');
 const addGame=node('button',{style:{padding:'12px',border:0,borderRadius:'10px',background:'#111',color:'#fff',fontWeight:'800'}},'🎮 Add Game');
 const search=node('button',{style:{padding:'12px',border:0,borderRadius:'10px',background:'#111',color:'#fff',fontWeight:'800'}},'🔎 Search');
 tabs.append(addPhone,addSocial,addGame,search);box.appendChild(tabs);
 const content=node('div',{});box.appendChild(content);list.prepend(box);
 function field(label:string,placeholder:string){const w=node('label',{style:{display:'grid',gap:'5px',fontWeight:'700',fontSize:'13px'}});w.appendChild(node('span',{},label));const i=node('input',{placeholder});i.style.cssText='padding:12px;border:1px solid #ddd;border-radius:10px;background:white;color:#111';w.appendChild(i);return i}
 function selectField(label:string,items:string[]){const w=node('label',{style:{display:'grid',gap:'5px',fontWeight:'700',fontSize:'13px'}});w.appendChild(node('span',{},label));const s=node('select',{});s.style.cssText='padding:12px;border:1px solid #ddd;border-radius:10px;background:white;color:#111';items.forEach(x=>s.appendChild(node('option',{value:x},x)));w.appendChild(s);return s}
 async function addInventory(type:'phone'|'social'|'game'){
   content.innerHTML='';
   const grid=node('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'10px'}});
   let number:any=null,numberType:any=null,country:any=null,code:any=null,region:any=null,platform:any=null,game:any=null,name:any=null,price:any;
   if(type==='phone'){
     number=field('Phone number','+1 555... or +234...');numberType=selectField('Number type',['US','International']);country=field('Country','USA / Nigeria / UK');code=field('Country code','+1 / +234');region=field('Region','Optional');
   } else if(type==='social'){
     platform=selectField('Social platform',['Instagram','TikTok','YouTube','Facebook','X','Snapchat','Telegram','LinkedIn','Pinterest','Reddit','Discord','Threads','Twitch']);name=field('Account name','@username or display name');
   } else {
     game=selectField('Game',['Free Fire','PUBG Mobile','Fortnite','Roblox','EA FC','FIFA','Call of Duty','Mobile Legends','Clash of Clans','eFootball','Minecraft','Apex Legends','Valorant','GTA V']);name=field('Account name','Player name / ID');
   }
   const login=field('Login (optional)','Email / username');const password=field('Password (optional)','Password');price=field('Price (₦)','5000');
   if(type==='phone')grid.append(number,numberType,country,code,region,login,password,price);else grid.append(platform||game,name,login,password,price);
   content.appendChild(grid);
   const save=node('button',{style:{marginTop:'12px',padding:'12px 18px',border:0,borderRadius:'10px',background:'#16a34a',color:'#fff',fontWeight:'800'}},`Save ${type}`);content.appendChild(save);
   save.onclick=async()=>{try{save.textContent='Saving...';await api('/api/admin/inventory/add',{inventoryType:type,platform:platform?.value||'',game:game?.value||'',username:name?.value||number?.value||'',phoneNumber:number?.value||'',numberType:numberType?.value||'',country:country?.value||'',countryCode:code?.value||'',region:region?.value||'',login:login.value,password:password.value,price:Number(price.value||0)});save.textContent='Saved ✓';setTimeout(()=>searchInventory(),400)}catch(e:any){save.textContent=`Save ${type}`;alert(e.message)}};
 }
 async function searchInventory(){
   content.innerHTML='';
   const top=node('div',{style:{display:'grid',gridTemplateColumns:'2fr 1fr auto',gap:'8px',marginBottom:'12px'}});const q=field('Search','phone, country, username, game...');const type=selectField('Type',['all','phone','social','game']);const go=node('button',{style:{padding:'12px',border:0,borderRadius:'10px',background:'#111',color:'#fff',fontWeight:'800'}},'Search');top.append(q,type,go);content.appendChild(top);const out=node('div',{style:{overflowX:'auto'}});content.appendChild(out);
   async function run(){try{const d=await api('/api/admin/inventory/search',{search:q.value,inventoryType:type.value});const rows=d.products||[];out.innerHTML='';if(!rows.length){out.appendChild(node('p',{style:{color:'#666'}},'Nothing found.'));return}const t=node('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'13px',minWidth:'850px'}});const tr=node('tr',{});['Type','Item','U.S. Number','International Number','Country','Price','Status','Action'].forEach(x=>tr.appendChild(node('th',{style:{textAlign:'left',padding:'9px',borderBottom:'1px solid #ddd'}},x)));t.appendChild(tr);rows.forEach((x:any)=>{const r=node('tr',{});const us=x.numberType==='US'?x.phoneNumber:'—';const intl=x.numberType==='International'?x.phoneNumber:'—';[x.inventoryType,x.game||x.platform||x.username,us,intl,`${x.country||'—'} ${x.countryCode||''}`,`₦${Number(x.price||0).toLocaleString('en-NG')}`,x.status].forEach(v=>r.appendChild(node('td',{style:{padding:'9px',borderBottom:'1px solid #eee'}},String(v||'—'))));const c=node('td',{style:{padding:'9px',borderBottom:'1px solid #eee'}});const del=node('button',{style:{padding:'7px 9px',border:0,borderRadius:'8px',background:'#fee2e2',color:'#991b1b',fontWeight:'700'}},'Remove');del.onclick=async()=>{if(!confirm('Remove this item?'))return;await api('/api/admin/products/delete',{productId:x.id});run()};c.appendChild(del);r.appendChild(c);t.appendChild(r)});out.appendChild(t)}catch(e:any){alert(e.message)}}go.onclick=run;q.onkeydown=(e:any)=>{if(e.key==='Enter')run()};await run();
 }
 addPhone.onclick=()=>addInventory('phone');addSocial.onclick=()=>addInventory('social');addGame.onclick=()=>addInventory('game');search.onclick=searchInventory;await addInventory('phone');
}
const observer=new MutationObserver(()=>{try{install()}catch{}});observer.observe(document.documentElement,{subtree:true,childList:true});setTimeout(install,300);setInterval(()=>{if(!installed)install()},2000);
