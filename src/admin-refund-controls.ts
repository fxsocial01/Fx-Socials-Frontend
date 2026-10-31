const API_BASE=(import.meta as any).env.VITE_API_BASE_URL||'https://fx-socials-api.onrender.com';
const originalFetch=window.fetch.bind(window);
const session=()=>({sessionToken:localStorage.getItem('fxs-session')||''});
async function api(path:string,body:any={}){const r=await originalFetch(`${API_BASE}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...session(),...body})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d}
function isAdmin(){try{const u=JSON.parse(localStorage.getItem('fxs-user')||'null');return !!u&&String(u.email||'').toLowerCase()==='yasiyrshehu@gmail.com'}catch{return false}}
function el(tag:string,props:any={},text=''){const x=document.createElement(tag) as any;Object.entries(props).forEach(([k,v])=>{if(k==='className')x.className=v;else Object.assign(x,k==='style'?x.style:{[k]:v})});if(text)x.textContent=text;return x}
async function installRefund(){
 if(!isAdmin()||document.getElementById('fxs-refund-controls'))return;
 const h=[...document.querySelectorAll('h2')].find((x:any)=>String(x.textContent||'').trim().toLowerCase()==='admin dashboard');
 const list=document.querySelector('.admin-list') as HTMLElement|null;if(!h||!list)return;
 const box=el('section',{id:'fxs-refund-controls',style:{margin:'16px 0',padding:'18px',border:'1px solid #ddd',borderRadius:'16px',background:'#fff',color:'#111'}});
 box.appendChild(el('h3',{style:{margin:'0 0 6px',fontSize:'21px'}},'Wallet Refund / Reversal'));
 box.appendChild(el('p',{style:{margin:'0 0 14px',color:'#666'}},'Reverse wallet credit after you have already refunded the customer. Every reversal is recorded in the wallet audit history.'));
 const grid=el('div',{style:{display:'grid',gridTemplateColumns:'minmax(220px,2fr) minmax(140px,1fr)',gap:'10px'}});
 const user=el('select',{style:{padding:'12px',border:'1px solid #ddd',borderRadius:'10px',background:'#fff',color:'#111',width:'100%'}});
 const amount=el('input',{type:'number',min:'0.01',step:'0.01',placeholder:'Refund amount (₦)',style:{padding:'12px',border:'1px solid #ddd',borderRadius:'10px',background:'#fff',color:'#111',width:'100%',boxSizing:'border-box'}});
 grid.append(user,amount);box.appendChild(grid);
 const reason=el('input',{type:'text',placeholder:'Reason, e.g. Customer refunded because item was unavailable',style:{marginTop:'10px',padding:'12px',border:'1px solid #ddd',borderRadius:'10px',background:'#fff',color:'#111',width:'100%',boxSizing:'border-box'}});box.appendChild(reason);
 const info=el('div',{style:{marginTop:'10px',fontWeight:'700',color:'#444'}});box.appendChild(info);
 const actions=el('div',{style:{display:'flex',gap:'8px',marginTop:'12px',flexWrap:'wrap'}});
 const full=el('button',{type:'button',style:{padding:'11px 14px',border:0,borderRadius:'9px',background:'#111',color:'#fff',fontWeight:'800',cursor:'pointer'}},'Reverse Full Balance');
 const refund=el('button',{type:'button',style:{padding:'11px 14px',border:0,borderRadius:'9px',background:'#b91c1c',color:'#fff',fontWeight:'800',cursor:'pointer'}},'Reverse Amount');
 actions.append(full,refund);box.appendChild(actions);list.prepend(box);
 let users:any[]=[];
 async function load(){try{const d=await api('/api/admin/users');users=d.users||[];user.innerHTML='';users.forEach((x:any)=>user.appendChild(el('option',{value:x.userId},`${x.name||'Customer'} · ${x.email} · ₦${Number(x.balance||0).toLocaleString('en-NG',{minimumFractionDigits:2})}`)));update()}catch(e:any){info.textContent=e.message}}
 function selected(){return users.find(x=>x.userId===user.value)}
 function update(){const x=selected();info.textContent=x?`Current wallet balance: ₦${Number(x.balance||0).toLocaleString('en-NG',{minimumFractionDigits:2})}`:'No customer selected'}
 user.onchange=()=>{const x=selected();if(x)amount.value=String(Number(x.balance||0));update()};
 async function run(fullBalance:boolean){const x=selected();if(!x)return alert('Select a customer first.');const current=Number(x.balance||0);const n=fullBalance?current:Number(amount.value||0);if(!Number.isFinite(n)||n<=0)return alert('Enter a valid refund amount.');if(n>current)return alert('Refund amount cannot exceed the current wallet balance.');if(!reason.value.trim())return alert('Enter a reason for the reversal.');if(!confirm(`Confirm wallet reversal?\n\nCustomer: ${x.email}\nAmount: ₦${n.toLocaleString('en-NG',{minimumFractionDigits:2})}\nReason: ${reason.value.trim()}\n\nThis will reduce the wallet balance and record the reversal.`))return;try{full.disabled=true;refund.disabled=true;await api('/api/admin/users/refund',{userId:x.userId,amountNaira:n,reason:reason.value.trim()});alert('Wallet reversal completed and recorded.');await load()}catch(e:any){alert(e.message)}finally{full.disabled=false;refund.disabled=false}}
 full.onclick=()=>void run(true);refund.onclick=()=>void run(false);await load();
}
const observer=new MutationObserver(()=>{if(isAdmin())void installRefund()});observer.observe(document.documentElement,{subtree:true,childList:true});setTimeout(()=>void installRefund(),500);setInterval(()=>{if(isAdmin())void installRefund()},1500);
