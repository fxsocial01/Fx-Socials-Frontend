const apiBase=(import.meta as any).env.VITE_API_BASE_URL||'https://fx-socials-api.onrender.com';
const session=()=>localStorage.getItem('fxs-session')||'';

async function loadMe(){
  try{
    const r=await fetch(apiBase+'/api/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionToken:session()})});
    return await r.json();
  }catch{return null}
}

function styles(){
  if(document.getElementById('fxs-customer-ui'))return;
  const s=document.createElement('style');
  s.id='fxs-customer-ui';
  s.textContent=`
    .fxs-customer-settings{position:fixed;inset:0;z-index:10000;background:#050505;color:#fff;overflow:auto;font-family:Inter,system-ui,sans-serif}
    .fxs-settings-wrap{max-width:920px;margin:auto;padding:34px 22px 80px}
    .fxs-settings-top{display:flex;justify-content:space-between;align-items:flex-start;gap:22px;margin-bottom:34px}
    .fxs-settings-title{font-size:clamp(36px,7vw,58px);letter-spacing:-.055em;line-height:1;margin:7px 0 12px}
    .fxs-settings-sub{color:#8f8f8f;line-height:1.65}
    .fxs-settings-card{background:linear-gradient(145deg,#131313,#090909);border:1px solid #292929;border-radius:26px;padding:28px;margin:18px 0;box-shadow:0 18px 55px rgba(0,0,0,.25)}
    .fxs-settings-card h2{font-size:22px;margin:0 0 8px}
    .fxs-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .fxs-settings-stat{padding:23px;border:1px solid #292929;border-radius:20px;background:#0b0b0b}
    .fxs-settings-stat span{display:block;color:#777;font-size:11px;font-weight:900;letter-spacing:.12em}
    .fxs-settings-stat strong{display:block;margin-top:9px;font-size:21px;overflow-wrap:anywhere}
    .fxs-settings-input{width:100%;height:56px;box-sizing:border-box;background:#151515;border:1px solid #343434;border-radius:15px;color:#fff;padding:0 16px;font-size:16px;outline:none;margin-top:11px}
    .fxs-settings-btn{border:0;border-radius:15px;padding:14px 19px;background:#fff;color:#050505;font-weight:900;cursor:pointer;margin:12px 9px 0 0}
    .fxs-settings-btn.alt{background:#171717;color:#fff;border:1px solid #383838}
    .fxs-settings-pill{display:inline-flex!important;width:max-content;padding:6px 10px;border-radius:999px;border:1px solid #315b3a;background:#0b1c10;color:#9fe0ae!important;font-size:11px!important;font-weight:900!important}

    .fxs-dashboard-grid-spacious{gap:20px!important;margin-top:38px!important}
    .fxs-dashboard-grid-spacious button{min-height:158px!important;padding:27px!important;border-radius:25px!important;background:linear-gradient(145deg,#141414,#090909)!important;border:1px solid #292929!important;box-shadow:0 16px 42px rgba(0,0,0,.22)!important;transition:transform .18s ease,border-color .18s ease,background .18s ease!important}
    .fxs-dashboard-grid-spacious button:hover{transform:translateY(-3px);border-color:#4b4b4b!important}
    .fxs-settings-tile span:first-child{font-size:34px!important}
    .fxs-settings-tile b{font-size:19px!important}
    .fxs-settings-tile .tile-sub{display:block;color:#858585;font-size:12px;line-height:1.5;margin-top:7px}

    /* Spacious boosting/service layout */
    .fxs-boosting-spacious section,.fxs-boosting-spacious>div{margin-bottom:22px!important}
    .fxs-boosting-spacious button{min-height:78px!important;border-radius:20px!important;padding:18px 20px!important}
    .fxs-boosting-spacious input,.fxs-boosting-spacious select{min-height:54px!important;border-radius:16px!important;padding:0 16px!important}
    .fxs-boosting-spacious [class*="card"],[class*="service-card"]{border-radius:22px!important}
    @media(max-width:650px){
      .fxs-settings-wrap{padding:24px 16px 60px}
      .fxs-settings-grid{grid-template-columns:1fr}
      .fxs-settings-top{align-items:flex-start}
      .fxs-settings-card{padding:21px;border-radius:21px}
      .fxs-dashboard-grid-spacious{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important}
      .fxs-dashboard-grid-spacious button{min-height:145px!important;padding:20px!important}
    }
    @media(max-width:430px){
      .fxs-dashboard-grid-spacious{grid-template-columns:1fr!important}
      .fxs-dashboard-grid-spacious button{min-height:128px!important}
    }
  `;
  document.head.appendChild(s);
}

function openSettings(){
  if(!session()){location.hash='#/account';return}
  if(document.getElementById('fxs-customer-settings'))return;
  const o=document.createElement('div');
  o.id='fxs-customer-settings';
  o.className='fxs-customer-settings';
  o.innerHTML=`<div class="fxs-settings-wrap">
    <div class="fxs-settings-top"><div><div class="fxs-settings-sub">FX SOCIALS · ACCOUNT SETTINGS</div><h1 class="fxs-settings-title">Your settings</h1><div class="fxs-settings-sub">Everything important about your account, in one simple place.</div></div><button class="fxs-settings-btn alt" id="fxs-settings-close">← Dashboard</button></div>
    <div class="fxs-settings-grid"><div class="fxs-settings-stat"><span>WALLET</span><strong id="fxs-settings-wallet">Loading…</strong></div><div class="fxs-settings-stat"><span>ACCOUNT STATUS</span><strong><span class="fxs-settings-pill">ACTIVE</span></strong></div></div>
    <section class="fxs-settings-card"><h2>Profile</h2><p class="fxs-settings-sub">Update the name shown on your FX Socials account.</p><input id="fxs-profile-name" class="fxs-settings-input" placeholder="Your name"><input id="fxs-profile-email" class="fxs-settings-input" readonly><button id="fxs-save-profile" class="fxs-settings-btn">Save name</button><div id="fxs-profile-msg" class="fxs-settings-sub"></div></section>
    <section class="fxs-settings-card"><h2>Developer API</h2><p class="fxs-settings-sub">Generate API keys, manage webhooks and connect your own website to FX Socials.</p><button id="fxs-open-dev" class="fxs-settings-btn">Open Developer Center</button></section>
    <section class="fxs-settings-card"><h2>Quick links</h2><p class="fxs-settings-sub">Jump directly to the parts of your account you use most.</p><button class="fxs-settings-btn alt" data-go="#/wallet">Wallet</button><button class="fxs-settings-btn alt" data-go="#/orders">My orders</button><button class="fxs-settings-btn alt" data-go="#/support">Support</button></section>
  </div>`;
  document.body.appendChild(o);
  document.getElementById('fxs-settings-close')!.onclick=()=>o.remove();
  o.querySelectorAll('[data-go]').forEach((b:any)=>b.onclick=()=>{location.hash=b.dataset.go;o.remove()});
  document.getElementById('fxs-open-dev')!.onclick=()=>{o.remove();const dev=document.getElementById('fxs-dev-tile') as HTMLElement|null;if(dev)dev.click();else location.hash='#/developers'};
  const saved=JSON.parse(localStorage.getItem('fxs-user')||'null');
  const name=document.getElementById('fxs-profile-name') as HTMLInputElement;
  const email=document.getElementById('fxs-profile-email') as HTMLInputElement;
  name.value=saved?.name||'';email.value=saved?.email||'';
  loadMe().then(d=>{if(!d?.user)return;name.value=d.user.name||name.value;email.value=d.user.email||email.value;const w=document.getElementById('fxs-settings-wallet');if(w)w.textContent='₦'+Number(d.wallet?.balance||0).toLocaleString('en-NG')});
  document.getElementById('fxs-save-profile')!.onclick=()=>{const n=name.value.trim();if(!n)return;const u=JSON.parse(localStorage.getItem('fxs-user')||'{}');u.name=n;localStorage.setItem('fxs-user',JSON.stringify(u));const m=document.getElementById('fxs-profile-msg');if(m)m.textContent='Name saved on this device.'};
}

function polish(){
  styles();
  const route=location.hash.replace('#/','').split('?')[0];
  if(route==='dashboard'){
    const heading=[...document.querySelectorAll('h1')].find(n=>String(n.textContent||'').trim().startsWith('Hello,'));
    const section=heading?.closest('section') as HTMLElement|null;
    if(section){
      const grid=[...section.querySelectorAll('div')].find(n=>[...n.children].every(c=>c.tagName==='BUTTON')&&n.children.length>4) as HTMLElement|null;
      if(grid){
        grid.classList.add('fxs-dashboard-grid-spacious');
        if(!document.getElementById('fxs-settings-tile')){
          const b=document.createElement('button');
          b.id='fxs-settings-tile';b.className='fxs-settings-tile';
          b.innerHTML='<span style="font-size:34px">⚙</span><b>Settings</b><span class="tile-sub">Profile, wallet, API & account</span>';
          b.onclick=openSettings;grid.appendChild(b);
        }
      }
    }
  }
  if(route==='boost'){
    const root=document.querySelector('main')||document.body;
    root.classList.add('fxs-boosting-spacious');
  }
}

const observer=new MutationObserver(()=>polish());
observer.observe(document.documentElement,{subtree:true,childList:true});
setTimeout(polish,300);
window.addEventListener('hashchange',()=>setTimeout(polish,150));
