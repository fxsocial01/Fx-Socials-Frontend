import {useMemo,useState} from 'react';

type Plan={id:string;name:string;duration:string;note:string};
type Product={id:string;name:string;category:string;mark:string;description:string;plans:Plan[];color:string};
const catalog:Product[]=[
 {id:'spotify',name:'Spotify Premium',category:'Music',mark:'S',description:'Ad-free music, offline listening and your favourite playlists.',color:'#16834b',plans:[{id:'sp1',name:'Individual',duration:'1 month',note:'For one account'},{id:'sp3',name:'Individual',duration:'3 months',note:'Three-month access'}]},
 {id:'netflix',name:'Netflix',category:'Streaming',mark:'N',description:'Enjoy films, series and documentaries on your own account.',color:'#d71920',plans:[{id:'nf1',name:'Standard',duration:'1 month',note:'Plan availability depends on region'},{id:'nf2',name:'Premium',duration:'1 month',note:'Where supported by supplier'}]},
 {id:'apple-music',name:'Apple Music',category:'Music',mark:'♫',description:'Listen to millions of songs across your Apple devices.',color:'#d84b70',plans:[{id:'am1',name:'Individual',duration:'1 month',note:'Personal subscription'},{id:'am3',name:'Individual',duration:'3 months',note:'Three-month access'}]},
 {id:'youtube',name:'YouTube Premium',category:'Streaming',mark:'▶',description:'Enjoy ad-free videos, downloads and background play.',color:'#df2525',plans:[{id:'yt1',name:'Individual',duration:'1 month',note:'Personal subscription'},{id:'yt3',name:'Individual',duration:'3 months',note:'Three-month access'}]},
 {id:'canva',name:'Canva Pro',category:'Productivity',mark:'C',description:'Unlock premium design tools, templates and brand features.',color:'#2879d9',plans:[{id:'cv1',name:'Pro',duration:'1 month',note:'For an eligible personal account'},{id:'cv12',name:'Pro',duration:'12 months',note:'Annual access'}]},
 {id:'microsoft',name:'Microsoft 365',category:'Productivity',mark:'M',description:'Get premium Office apps and cloud productivity features.',color:'#2676bb',plans:[{id:'ms1',name:'Personal',duration:'1 month',note:'One person'},{id:'ms12',name:'Personal',duration:'12 months',note:'Annual subscription'}]},
 {id:'prime',name:'Amazon Prime',category:'Streaming',mark:'a',description:'Explore Prime benefits where the selected region is supported.',color:'#237ca0',plans:[{id:'ap1',name:'Prime',duration:'1 month',note:'Regional availability applies'},{id:'ap12',name:'Prime',duration:'12 months',note:'Annual access where supported'}]},
 {id:'other',name:'Other digital services',category:'Other',mark:'+',description:'Looking for another app or digital subscription? Request it here.',color:'#5865a8',plans:[{id:'ot1',name:'Request a service',duration:'Custom',note:'We will confirm availability'}]}
];
const categories=['All','Music','Streaming','Productivity','Other'];
const css=`
.fxsub-page{min-height:100vh;background:#f3f7ff;color:#17345f;padding:28px 18px 80px;font-family:Inter,system-ui,sans-serif}
.fxsub-wrap{max-width:1120px;margin:0 auto}
.fxsub-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:25px}
.fxsub-back,.fxsub-quiet{border:1px solid #dce6f5;background:#fff;color:#214579;border-radius:12px;padding:11px 14px;font-weight:800}
.fxsub-kicker{font-size:10px;letter-spacing:.18em;font-weight:900;color:#5275ad}
.fxsub-hero{border-radius:26px;padding:clamp(24px,5vw,48px);background:linear-gradient(120deg,#142c68,#245fe5 62%,#6a70e9);color:white;display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:center;box-shadow:0 22px 55px #245fe52a}
.fxsub-hero h1{font-size:clamp(36px,6vw,60px);line-height:1;letter-spacing:-.055em;margin:12px 0}
.fxsub-hero p{max-width:590px;color:#e2eaff;line-height:1.7;margin:0}
.fxsub-hero-art{justify-self:center;width:190px;height:190px;border-radius:38px;background:#ffffff18;border:1px solid #ffffff50;display:grid;place-items:center;font-size:76px;box-shadow:inset 0 0 50px #ffffff15}
.fxsub-points{display:flex;flex-wrap:wrap;gap:9px;margin-top:20px}
.fxsub-points span{border:1px solid #ffffff45;background:#ffffff15;border-radius:99px;padding:8px 11px;font-size:11px;font-weight:800}
.fxsub-section-head{display:flex;justify-content:space-between;align-items:end;gap:15px;margin:32px 0 15px}
.fxsub-section-head h2{font-size:26px;margin:5px 0 0;letter-spacing:-.04em}
.fxsub-search{width:min(100%,360px);border:1px solid #dce6f5;background:#fff;border-radius:12px;padding:13px 15px;color:#17345f}
.fxsub-cats{display:flex;gap:8px;overflow:auto;padding:2px 0 15px}
.fxsub-cats button{white-space:nowrap;border:1px solid #dce6f5;background:white;color:#31527e;border-radius:99px;padding:9px 15px;font-size:12px;font-weight:800}
.fxsub-cats button.active{background:#245fe5;color:#fff;border-color:#245fe5}
.fxsub-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.fxsub-product{border:1px solid #dce6f5;border-radius:19px;background:#fff;padding:17px;display:flex;flex-direction:column;min-height:225px;box-shadow:0 9px 25px #315a9c0c}
.fxsub-mark{width:48px;height:48px;border-radius:15px;color:#fff;display:grid;place-items:center;font-size:25px;font-weight:900}
.fxsub-product h3{font-size:16px;margin:17px 0 6px}
.fxsub-product p{font-size:12px;line-height:1.55;color:#71819b;flex:1;margin:0 0 14px}
.fxsub-product button,.fxsub-primary{border:0;background:#245fe5;color:#fff;border-radius:11px;padding:12px 14px;font-weight:900}
.fxsub-detail{margin-top:25px;background:#fff;border:1px solid #dce6f5;border-radius:22px;padding:clamp(18px,4vw,30px);box-shadow:0 12px 35px #315a9c12}
.fxsub-detail-head{display:flex;align-items:center;gap:13px;margin-bottom:20px}
.fxsub-detail-head h2{margin:0 0 4px;font-size:24px}
.fxsub-detail-head p{margin:0;color:#71819b;font-size:12px}
.fxsub-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.fxsub-option{border:1px solid #dce6f5;background:#f8faff;border-radius:14px;padding:14px;text-align:left;color:#17345f}
.fxsub-option.selected{border:2px solid #245fe5;background:#edf3ff;padding:13px}
.fxsub-option b,.fxsub-option span{display:block}
.fxsub-option span{font-size:11px;color:#71819b;margin-top:5px}
.fxsub-label{font-size:12px;font-weight:900;margin:22px 0 10px;display:block}
.fxsub-methods{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.fxsub-method{border:1px solid #dce6f5;background:#fff;border-radius:14px;padding:15px;text-align:left;color:#17345f}
.fxsub-method.selected{border:2px solid #245fe5;background:#edf3ff;padding:14px}
.fxsub-method b{display:block;margin-bottom:5px}
.fxsub-method span{font-size:11px;color:#71819b;line-height:1.5}
.fxsub-summary{margin-top:20px;background:#f3f7ff;border:1px solid #dce6f5;border-radius:14px;padding:16px;display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
.fxsub-summary small{display:block;color:#71819b;margin-top:4px}
.fxsub-note{font-size:11px;color:#71819b;line-height:1.6;margin-top:13px}
.fxsub-empty{padding:30px;text-align:center;color:#71819b;background:#fff;border:1px dashed #cbd8eb;border-radius:16px}
@media(max-width:900px){.fxsub-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fxsub-hero{grid-template-columns:1fr}.fxsub-hero-art{display:none}}
@media(max-width:520px){.fxsub-page{padding:18px 13px 60px}.fxsub-top{margin-bottom:16px}.fxsub-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.fxsub-product{padding:13px;min-height:220px}.fxsub-product h3{font-size:14px}.fxsub-product p{font-size:11px}.fxsub-mark{width:42px;height:42px}.fxsub-section-head{display:block}.fxsub-search{margin-top:12px;width:100%}.fxsub-options,.fxsub-methods{grid-template-columns:1fr}.fxsub-hero{padding:26px 20px}.fxsub-hero h1{font-size:39px}}
`;
export default function SubscriptionsPage(){const[category,setCategory]=useState('All'),[search,setSearch]=useState(''),[selected,setSelected]=useState('spotify'),[plan,setPlan]=useState('sp1'),[method,setMethod]=useState<'activation'|'code'>('activation'),[notice,setNotice]=useState('');
 const visible=useMemo(()=>catalog.filter(p=>(category==='All'||p.category===category)&&[p.name,p.description,p.category].some(v=>v.toLowerCase().includes(search.toLowerCase()))),[category,search]);
 const product=catalog.find(p=>p.id===selected)!;
 const choose=(p:Product)=>{setSelected(p.id);setPlan(p.plans[0].id);setNotice('')};
 const selectedPlan=product.plans.find(p=>p.id===plan)||product.plans[0];
 const startCheckout=()=>{setNotice('The storefront design is ready. Checkout, live pricing and supplier fulfilment will be connected in the next backend stage. No payment has been taken.');};
 return <main className="fxsub-page"><style>{css}</style><div className="fxsub-wrap">
  <div className="fxsub-top"><div><div className="fxsub-kicker">FX SOCIALS · DIGITAL STORE</div><b style={{fontSize:18,letterSpacing:'.08em'}}>SUBSCRIPTIONS</b></div><button className="fxsub-back" onClick={()=>location.hash='#/dashboard'}>← Dashboard</button></div>
  <section className="fxsub-hero"><div><div className="fxsub-kicker" style={{color:'#dce7ff'}}>ONE STORE. YOUR FAVOURITE APPS.</div><h1>Digital subscriptions, made simple.</h1><p>Choose a service, select your plan and delivery method. Your subscription orders will be tracked in your FX Socials account.</p><div className="fxsub-points"><span>✓ Free membership</span><span>✓ Personal activation</span><span>✓ Digital codes</span></div></div><div className="fxsub-hero-art">✦</div></section>
  <div className="fxsub-section-head"><div><div className="fxsub-kicker">BROWSE THE STORE</div><h2>Find your subscription</h2></div><input className="fxsub-search" placeholder="Search subscriptions…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
  <div className="fxsub-cats">{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div>
  {visible.length?<div className="fxsub-grid">{visible.map(p=><article className="fxsub-product" key={p.id}><div className="fxsub-mark" style={{background:p.color}}>{p.mark}</div><h3>{p.name}</h3><p>{p.description}</p><button onClick={()=>choose(p)}>{selected===p.id?'Selected':'View plans'}</button></article>)}</div>:<div className="fxsub-empty">No subscriptions match that search.</div>}
  <section className="fxsub-detail"><div className="fxsub-detail-head"><div className="fxsub-mark" style={{background:product.color}}>{product.mark}</div><div><h2>{product.name}</h2><p>Choose your preferred plan and delivery method</p></div></div>
   <b className="fxsub-label" style={{marginTop:0}}>1. Select a plan</b><div className="fxsub-options">{product.plans.map(p=><button key={p.id} className={'fxsub-option '+(plan===p.id?'selected':'')} onClick={()=>setPlan(p.id)}><b>{p.name} · {p.duration}</b><span>{p.note}</span></button>)}</div>
   <b className="fxsub-label">2. How should we deliver it?</b><div className="fxsub-methods"><button className={'fxsub-method '+(method==='activation'?'selected':'')} onClick={()=>setMethod('activation')}><b>Activate my account</b><span>We arrange activation through an approved provider flow. You will not be asked to share your account password.</span></button><button className={'fxsub-method '+(method==='code'?'selected':'')} onClick={()=>setMethod('code')}><b>Send me an activation code</b><span>Receive a valid code and redemption instructions when the selected product supports codes.</span></button></div>
   <div className="fxsub-summary"><div><b>{product.name}</b><small>{selectedPlan.name} · {selectedPlan.duration} · {method==='activation'?'Personal activation':'Activation code'}</small></div><button className="fxsub-primary" onClick={startCheckout}>Continue to checkout →</button></div>
   {notice&&<div className="fxsub-note" role="status">{notice}</div>}
   <p className="fxsub-note">Plans, final NGN prices and delivery options will be enabled only after supplier availability and territory permissions are confirmed. We do not sell shared-account access or collect streaming passwords.</p>
  </section>
  <p className="fxsub-note" style={{textAlign:'center',marginTop:24}}>FX Socials Digital Store · Free customer membership · Prices and availability confirmed before payment</p>
 </div></main>;
}
