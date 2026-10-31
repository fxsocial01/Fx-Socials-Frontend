const API_BASE=(import.meta as any).env.VITE_API_BASE_URL||'https://fx-socials-api.onrender.com';
const originalFetch=window.fetch.bind(window);
const session=()=>({sessionToken:localStorage.getItem('fxs-session')||''});
async function api(path:string,body:any={}){const r=await originalFetch(`${API_BASE}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...session(),...body})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d}
function isAdmin(){try{const u=JSON.parse(localStorage.getItem('fxs-user')||'null');return !!u&&String(u.email||'').toLowerCase()==='yasiyrshehu@gmail.com'}catch{return false}}
function el(tag:string,props:any={},text=''){const x=document.createElement(tag) as any;Object.entries(props).forEach(([k,v])=>{if(k==='className')x.className=v;else Object.assign(x,k==='style'?x.style:{[k]:v})});if(text)x.textContent=text;return x}
async function install(){
 if(!isAdmin()||document.getElementById('fxs-refund-controls'))return;
 const h=[...document.querySelectorAll('h2')].find((x:any)=>String(x.textContent||'').trim().toLowerCase()==='admin dashboard');
 const list=document.querySelector('.admin-list') as HTMLElement|null;if(!h||!list)return;
 const box=el('section',{id:'fxs-refund-controls',style:{margin:'16px 0',padding:'18px',border:'1px solid #ddd',borderRadius:'16px',background:'#fff',color:'#111'}});
 box.appendChild(el('h3',{style:{margin:'0 0 6px',fontSize:'21px'}},'Customer Account Controls'));
 box.appendChild(el('p',{style:{margin:'0 0 14px',color:'#666'}},'Refund a wallet after an external refund, or freeze/block a customer. Every admin action is audited.'));
 const grid=el('div',{style:{display:'grid',gridTemplateColumns:'minmax(220px,2fr) minmax(140px,1fr)',gap:'10px'}});
 const user=el('select',{style:{padding:'12px',border:'1px solid #ddd',borderRadius:'10px',background:'#fff',color:'#111',width:'100%'}});
 const amount=el('input',{type:'number',min:'0.01',step:'0.01',placeholder:'Refund amount (₦)',style:{padding:'12px',border:'1px solid #ddd',borderRadius:'10px',background:'#fff',color:'#111',width:'100%',boxSizing:'border-box'}});
 grid.append(user,amount);box.appendChild(grid);
 const reason=el('input',{type:'text',placeholder:'Reason, e.g. Customer refunded because item was unavailable',style:{marginTop:'10px',padding:'12px',border:'1px solid #ddd',borderRadius:'10px',background:'#fff',color:'#111',width:'100%',boxSizing:'border-box'}});box.appendChild(reason);
 const info=el('div',{style:{marginTop:'10px',fontWeight:'700',color:'#444'}});box.appendChild(info);
 const actions=el('div',{style:{display:'flex',gap:'8px',marginTop:'12px',flexWrap:'wrap'}});
 const full=el('button',{type:'button',style:{padding:'11px 14px',border:0,borderRadius:'9px',background:'#111',color:'#fff',fontWeight:'800',cursor:'pointer'}},'Reverse Full Balance');
 const refund=el('button',{type:'button',style:{padding:'11px 14px',border:0,borderRadius:'9px',background:'#b91c1c',color:'#fff',fontWeight:'800',cursor:'pointer'}},'Reverse Amount');
 const freeze=el('button',{type:'button',style:{padding:'11px 14px',border:0,borderRadius:'9px',background:'#b45309',color:'#fff',fontWeight:'800',cursor:'pointer'}},'Freeze');
 const unfreeze=el('button',{type:'button',style:{padding:'11px 14px',border:0,borderRadius:'9px',background:'#166534',color:'#fff',fontWeight:'800',cursor:'pointer'}},'Unfreeze');
 const block=el('button',{type:'button',style:{padding:'11px 14px',border:0,borderRadius:'9px',background:'#7f1d1d',color:'#fff',fontWeight:'800',cursor:'pointer'}},'Block');
 const unblock=el('button',{type:'button',style:{padding:'11px 14px',border:0,borderRadius:'9px',background:'#15803d',color:'#fff',fontWeight:'800',cursor:'pointer'}},'Unblock');
 actions.append(full,refund,freeze,unfreeze,block,unblock);box.appendChild(actions);
 box.appendChild(el('h4',{style:{margin:'18px 0 8px'}},'Recent Admin Audit'));
 const audit=el('div',{style:{maxHeight:'260px',overflowY:'auto',fontSize:'13px'}});box.appendChild(audit);list.prepend(box);
 let users:any[]=[];
 function selected(){return users.find(x=>x.userId===user.value)}
 function update(){const x=selected();info.textContent=x?`Current wallet: ₦${Number(x.balance||0).toLocaleString('en-NG',{minimumFractionDigits:2})} · Status: ${String(x.controlStatus||'active').toUpperCase()}`:'Select a customer'}
 async function loadUsers(){try{const [u,c]=await Promise.all([api('/api/admin/users'),api('/api/admin/users/control-state')]);const states=c.users||[];users=(u.users||[]).map((x:any)=>({...x,controlStatus:states.find((s:any)=>s.userId===x.userId)?.status||'active'}));user.innerHTML='';users.forEach((x:any)=>user.appendChild(el('option',{value:x.userId},`${x.name||'Customer'} · ${x.email} · ₦${Number(x.balance||0).toLocaleString('en-NG',{minimumFractionDigits:2})} · ${String(x.controlStatus).toUpperCase()}`)));if(users.length)amount.value=String(Number(users[0].balance||0));update()}catch(e:any){info.textContent=e.message}}
 async function loadAudit(){try{const d=await api('/api/admin/users/audit');audit.innerHTML='';const rows=d.audit||[];if(!rows.length){audit.appendChild(el('div',{style:{color:'#666'}},'No admin actions recorded yet.'));return}rows.forEach((x:any)=>{const r=el('div',{style:{padding:'9px 0',borderBottom:'1px solid #eee'}});r.textContent=`${new Date(x.created_at).toLocaleString()} · ${x.action} · ${x.user_email} · ${x.reason||'No reason'}`;audit.appendChild(r)})}catch(e:any){audit.textContent=e.message}}
 user.onchange=()=>{const x=selected();if(x)amount.value=String(Number(x.balance||0));update()};
 async function runRefund(fullBalance:boolean){const x=selected();if(!x)return alert('Select a customer first.');const current=Number(x.balance||0);const n=fullBalance?current:Number(amount.value||0);if(!Number.isFinite(n)||n<=0)return alert('Enter a valid refund amount.');if(n>current)return alert('Refund amount cannot exceed the current wallet balance.');if(!reason.value.trim())return alert('Enter a reason for the reversal.');if(!confirm(`Confirm wallet reversal?\n\nCustomer: ${x.email}\nAmount: ₦${n.toLocaleString('en-NG',{minimumFractionDigits:2})}\nReason: ${reason.value.trim()}`))return;try{full.disabled=true;refund.disabled=true;await api('/api/admin/users/refund',{userId:x.userId,amountNaira:n,reason:reason.value.trim()});alert('Wallet reversal completed.');await loadUsers();await loadAudit()}catch(e:any){alert(e.message)}finally{full.disabled=false;refund.disabled=false}}
 async function status(next:string){const x=selected();if(!x)return alert('Select a customer first.');if(!reason.value.trim())return alert('Enter a reason first.');if(!confirm(`Confirm ${next} for ${x.email}?\n\nReason: ${reason.value.trim()}`))return;try{await api('/api/admin/users/status',{userId:x.userId,status:next,reason:reason.value.trim()});await loadUsers();await loadAudit();alert(`Account ${next}.`)}catch(e:any){alert(e.message)}}
 full.onclick=()=>void runRefund(true);refund.onclick=()=>void runRefund(false);freeze.onclick=()=>void status('frozen');unfreeze.onclick=()=>void status('active');block.onclick=()=>void status('blocked');unblock.onclick=()=>void status('active');
 await loadUsers();await loadAudit();
}
const observer=new MutationObserver(()=>{if(isAdmin())void install()});observer.observe(document.documentElement,{subtree:true,childList:true});setTimeout(()=>void install(),300);setInterval(()=>{if(isAdmin())void install()},1000);
