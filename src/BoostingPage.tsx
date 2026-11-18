import { useEffect, useMemo, useState } from 'react';

const API=(import.meta as any).env.VITE_API_BASE_URL||'https://fx-socials-api.onrender.com';
const token=()=>localStorage.getItem('fxs-session')||'';
const money=(n:number)=>`₦${Number(n||0).toLocaleString('en-NG',{maximumFractionDigits:2})}`;
async function req(path:string,method='GET',body?:any){const r=await fetch(API+path,{method,headers:{'Content-Type':'application/json',...(token()?{Authorization:`Bearer ${token()}`}:{})},body:body===undefined?undefined:JSON.stringify({...body,sessionToken:token()})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Something went wrong. Please try again.');return d}
const platforms=[
 {id:'Instagram',mark:'◎',gradient:'linear-gradient(135deg,#7138c8,#f14b79,#ffb34e)'},
 {id:'TikTok',mark:'♪',gradient:'linear-gradient(135deg,#10131b,#29313d)'},
 {id:'Facebook',mark:'f',gradient:'linear-gradient(135deg,#1265d8,#4b9cff)'},
 {id:'YouTube',mark:'▶',gradient:'linear-gradient(135deg,#e52525,#ff6969)'},
 {id:'X',mark:'𝕏',gradient:'linear-gradient(135deg,#151515,#454545)'}
];
const kinds=[
 {id:'Followers',icon:'♙',hint:'Get more followers'},
 {id:'Likes',icon:'♥',hint:'Get more likes'},
 {id:'Views',icon:'▶',hint:'Get more views'},
 {id:'Comments',icon:'▤',hint:'Get more comments'},
 {id:'Shares',icon:'↗',hint:'Get more shares'},
 {id:'Subscribers',icon:'♧',hint:'Get more subscribers'},
 {id:'Watch time',icon:'◷',hint:'Get more watch time'},
 {id:'Other',icon:'✦',hint:'Other services'}
];
const tiers=[
 {id:'low',name:'Low Quality',hint:'Lowest price'},
 {id:'medium',name:'Medium Quality',hint:'Balanced choice'},
 {id:'premium',name:'Premium Quality',hint:'Top quality option'},
 {id:'non_drop',name:'Non-Drop',hint:'Designed to reduce follower or engagement loss'}
];
const panel:any={background:'linear-gradient(145deg,#121d40,#0c1530)',border:'1px solid #293762',borderRadius:18,padding:14,boxShadow:'0 12px 30px #02071944'};
const btn:any={border:0,borderRadius:15,padding:'15px 18px',background:'linear-gradient(90deg,#637dff,#8b69f6)',color:'#fff',fontWeight:900,fontSize:15,width:'100%',minHeight:54};
const back:any={border:'1px solid #5369ad',borderRadius:12,padding:'10px 15px',background:'#172653',color:'#fff',fontWeight:800};
const field:any={display:'block',width:'100%',height:52,padding:'0 14px',marginTop:8,borderRadius:12,border:'1px solid #344477',background:'#0a1430',color:'#fff',fontSize:15,outline:'none',boxSizing:'border-box'};
export default function BoostingPage(){
 const [page,setPage]=useState('platform'),[platform,setPlatform]=useState('Instagram'),[kind,setKind]=useState('Followers'),[quality,setQuality]=useState('medium');
 const [catalog,setCatalog]=useState<any[]>([]),[selected,setSelected]=useState<any>(null);
 const [wallet,setWallet]=useState(0),[orders,setOrders]=useState<any[]>([]),[link,setLink]=useState(''),[quantity,setQuantity]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState('');
 const [report,setReport]=useState<any>(null),[reportText,setReportText]=useState('');
 const load=async()=>{try{const d=await req('/api/smm/services');setCatalog(d.services||[])}catch(e:any){setMessage(e.message)}};
 const loadOrders=async()=>{if(!token())return;try{const a=await req('/api/smm/orders');setOrders(a.orders||[])}catch{}};
 const loadWallet=async()=>{if(!token())return;try{const d=await req('/api/me/wallet','POST',{});setWallet(Number(d.wallet?.balance||0))}catch{}};
 useEffect(()=>{void load();void loadOrders();void loadWallet()},[]);
 const internalServices=useMemo(()=>catalog.filter(s=>s.platform===platform&&s.category===kind&&s.quality===quality),[catalog,platform,kind,quality]);
 const offers=internalServices.filter(s=>!search||`${s.name} ${s.description||''}`.toLowerCase().includes(search.toLowerCase()));
 const amount=selected&&quantity?Number(selected.pricePer1000)*Number(quantity)/1000:0;
 const valid=!!selected&&Number.isInteger(Number(quantity))&&Number(quantity)>=Number(selected.min||1)&&Number(quantity)<=Number(selected.max||1000000);
 const move=(next:string)=>{setMessage('');setSearch('');setPage(next)};
 const choosePlatform=(p:string)=>{setPlatform(p);setSelected(null);move('service')};
 const chooseKind=(k:string)=>{setKind(k);setSelected(null);move('quality')};
 const chooseQuality=(q:string)=>{setQuality(q);setSelected(null);move('offer')};
 const chooseOffer=(s:any)=>{setSelected(s);setQuantity(String(s.min||1));move('details')};
 const action=async(path:string,body:any={},success?:string)=>{setBusy(true);setMessage('');try{const d=await req(path,'POST',body);setMessage(success||d.message||'Request sent.');await loadOrders();await loadWallet()}catch(e:any){setMessage(e.message)}finally{setBusy(false)}};
 const place=async()=>{if(!token()){location.hash='#/account';return}if(!selected||!link.trim()||!valid)return;setBusy(true);setMessage('');try{const d=await req('/api/smm/orders','POST',{serviceId:selected.id,link:link.trim(),quantity:Number(quantity)});if(d.walletBalance!==undefined)setWallet(Number(d.walletBalance));setMessage(`Order ${d.orderNumber} placed. FX Socials will process it.`);setSelected(null);setLink('');setQuantity('');await loadOrders();move('done')}catch(e:any){setMessage(e.message)}finally{setBusy(false)}};
 const title:any={platform:'Choose an app',service:'What do you need?',quality:'Choose quality',offer:'Choose a service',details:'Finish your order',done:'Order placed',orders:'Your orders'};
 const step:any={platform:'1 of 5',service:'2 of 5',quality:'3 of 5',offer:'4 of 5',details:'5 of 5'};
 const backPage:any={service:'platform',quality:'service',offer:'quality',details:'offer'};
 const goBack=()=>move(backPage[page]||'platform');
 const badge=(s:string)=>({display:'inline-block',padding:'6px 10px',borderRadius:999,background:s==='completed'?'#123b2b':s==='cancelled'?'#482323':'#25335d',color:'#fff',fontSize:11,fontWeight:900,textTransform:'capitalize' as const});
 const card=(active=false):any=>({minHeight:76,borderRadius:14,border:active?'2px solid #aebcff':'1px solid #2b3764',background:active?'#263b83':'#101a37',color:'#fff',padding:15,textAlign:'left',display:'flex',alignItems:'center',gap:13,width:'100%',cursor:'pointer'});
 const current=platforms.find(p=>p.id===platform)!;
 return <main style={{minHeight:'100vh',background:'radial-gradient(ellipse at 50% -15%,#1b2d66 0,#080d20 52%,#060a17 100%)',color:'#f7f8ff',padding:'10px 10px 24px',boxSizing:'border-box'}}>
 <div style={{maxWidth:720,margin:'0 auto'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:16}}>
   <button onClick={()=>location.hash='#/home'} style={{...back,background:'transparent'}}>← FX Socials</button>
   <button onClick={()=>{move('orders');void loadOrders()}} style={back}>My orders</button>
  </div>
  <header style={{...panel,marginBottom:16,background:'linear-gradient(115deg,#17265a,#283d91 55%,#6b57d8)'}}>
   <div style={{fontSize:11,fontWeight:900,letterSpacing:'.16em',color:'#dce3ff'}}>FX SOCIALS · BOOSTING</div>
   <h1 style={{fontSize:'clamp(27px,6vw,38px)',lineHeight:1.08,margin:'10px 0 7px'}}>{title[page]||'Your boost orders'}</h1>
   <div style={{fontSize:13,color:'#e1e6ff',lineHeight:1.5}}>{page==='platform'?'Tap the app you want to grow.':page==='service'?'Tap what you want more of.':page==='quality'?'Choose the price and quality you prefer.':page==='offer'?'Choose one service from the list.':page==='details'?'Add your link and how many you want.':page==='orders'?'See the orders you have made.':'You are all set.'}</div>
   {step[page]&&<div style={{marginTop:14,display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:900,color:'#e4e8ff'}}><span>STEP {step[page]}</span><span>{money(wallet)} wallet</span></div>}
  </header>
  {message&&<div role="status" style={{...panel,marginBottom:14,padding:13,borderColor:'#6579d2',fontSize:13,lineHeight:1.5}}>{message}<button onClick={()=>setMessage('')} style={{float:'right',background:'transparent',border:0,color:'#fff'}}>×</button></div>}
  {true&&page!=='done'&&page!=='orders'&&<button onClick={goBack} style={{...back,marginBottom:14}}>← Back</button>}
  {page==='platform'&&<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:11}}>{platforms.map(p=><button key={p.id} onClick={()=>choosePlatform(p.id)} style={{...panel,minHeight:126,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:9,color:'#fff',cursor:'pointer'}}><span style={{width:48,height:48,borderRadius:15,display:'grid',placeItems:'center',background:p.gradient,fontSize:31,fontWeight:1000}}>{p.mark}</span><b>{p.id}</b><small style={{color:'#bdc8ee'}}>Tap to continue →</small></button>)}</div>}
  {page==='service'&&<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:9}}>{kinds.map(k=><button key={k.id} onClick={()=>chooseKind(k.id)} style={{background:'#111d3b',border:'1px solid #2b3764',borderRadius:15,minHeight:82,padding:12,textAlign:'left',color:'#fff',cursor:'pointer'}}><div style={{fontSize:20}}>{k.icon}</div><b style={{display:'block',marginTop:4,fontSize:13}}>{k.id}</b><small style={{color:'#b8c4ea',fontSize:10}}>{k.hint}</small></button>)}</div>}
  {page==='quality'&&<div style={{display:'grid',gap:11}}>{tiers.map(t=><button key={t.id} onClick={()=>chooseQuality(t.id)} style={{...panel,textAlign:'left',color:'#fff',cursor:'pointer'}}><b style={{fontSize:18}}>{t.name}</b><div style={{color:'#b8c4ea',fontSize:13,marginTop:5}}>{t.hint}</div><div style={{color:'#aebcff',fontSize:12,fontWeight:900,marginTop:10}}>Choose this quality →</div></button>)}</div>}
  {page==='offer'&&<div style={panel}>
   <div style={{fontSize:12,color:'#c2ccef',marginBottom:12}}>FX Socials · {platform} · {kind} · {quality.replace('_',' ')}</div>
   <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search services..." style={field}/>
   {offers.length? <div style={{display:'grid',gap:9,marginTop:13}}>{offers.map(s=><button key={s.id} onClick={()=>chooseOffer(s)} style={{...card(),minHeight:78}}><span style={{flex:1,minWidth:0}}><b style={{display:'block',fontSize:13}}>{s.name}</b><small style={{display:'block',color:'#b8c4ea',marginTop:5}}>Min {Number(s.min||1).toLocaleString()} · Max {Number(s.max||1000000).toLocaleString()}</small></span><span style={{textAlign:'right',whiteSpace:'nowrap'}}><b>{money(s.pricePer1000)}</b><small style={{display:'block',color:'#b8c4ea'}}>per 1,000</small></span></button>)}</div>:<p style={{color:'#c3ccef',fontSize:13}}>No services are available here yet. Please go back or try another app.</p>}
  </div>}
  {page==='details'&&selected&&<div style={panel}>
   <div style={{padding:13,borderRadius:13,background:'#182650',marginBottom:15}}><b>{selected.name}</b><div style={{fontSize:12,color:'#c3ccef',marginTop:5}}>FX Socials · In-house boosting · {platform}</div><div style={{fontSize:12,color:'#c3ccef',marginTop:5}}>Price per 1,000: {money(selected.pricePer1000)}</div></div>
   <label style={{fontSize:13,fontWeight:800}}>1. Paste your public link<input value={link} onChange={e=>setLink(e.target.value)} placeholder="Paste your Instagram / TikTok link" style={field}/></label>
   <label style={{display:'block',fontSize:13,fontWeight:800,marginTop:17}}>2. How many do you want?<input type="number" min={selected.min||1} max={selected.max||1000000} value={quantity} onChange={e=>setQuantity(e.target.value.replace(/\D/g,''))} style={field}/></label>
   <div style={{display:'flex',justifyContent:'space-between',padding:'17px 0',marginTop:14,borderTop:'1px solid #2b3764'}}><b>Total price</b><b style={{fontSize:24,color:'#c8d2ff'}}>{money(amount)}</b></div>
   <button disabled={!valid||!/^https?:\/\//i.test(link.trim())||busy} onClick={place} style={{...btn,opacity:!valid||!/^https?:\/\//i.test(link.trim())||busy?.5:1}}>{busy?'Please wait...':`Place order · ${money(amount)}`}</button>
   {!token()&&<p style={{fontSize:12,color:'#ffd28b'}}>Please sign in before placing your order.</p>}
  </div>}
  {page==='done'&&<div style={{...panel,textAlign:'center'}}><div style={{fontSize:54}}>🎉</div><h2>Thank you!</h2><p style={{color:'#c3ccef',fontSize:14,lineHeight:1.6}}>Your order has been sent. You can check its progress in My Orders.</p><button style={btn} onClick={()=>{move('orders');void loadOrders()}}>See my orders</button><button style={{...back,width:'100%',marginTop:10}} onClick={()=>move('platform')}>Place another order</button></div>}
  {page==='orders'&&<div style={panel}>
   {orders.length?orders.map(o=><div key={o.id} style={{padding:13,borderRadius:14,background:'#101a37',border:'1px solid #2b3967',marginBottom:10}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><b style={{fontSize:13}}>{o.platform||'FX Socials'} · {o.serviceName}</b><span style={badge(o.status)}>{o.status}</span></div><small style={{display:'block',color:'#b8c4ea',marginTop:6}}>FX Socials · {o.orderNumber||o.''} · {Number(o.quantity).toLocaleString()} · {money(o.amount)}</small>
   <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:11}}>{['pending','processing'].includes(o.status)?<><button style={back} disabled={busy||o.speedUpStatus!=='none'} onClick={()=>action(`/api/smm/orders/${o.id}/speed-up`,{},'Speed-up request sent.')}>Speed up</button><button style={back} disabled={busy||o.cancelRequestStatus!=='none'} onClick={()=>action(`/api/smm/orders/${o.id}/cancel-request`,{reason:'Customer requested cancellation'},'Cancellation request sent. Admin approval is needed for a refund.')}>Cancel request</button></>:null}<button style={back} onClick={()=>{setReport(o);setReportText('')}}>Report issue</button></div>}
   </div>):<p style={{color:'#c3ccef'}}>You have no orders yet.</p>}
   <button style={{...btn,marginTop:8}} onClick={()=>move('platform')}>Start a new order</button>
  </div>}
  {report&&<div style={{position:'fixed',inset:0,background:'#000b',display:'grid',placeItems:'center',padding:18,zIndex:50}}><div style={{...panel,width:'min(100%,460px)'}}><h2>Tell us the problem</h2><textarea value={reportText} onChange={e=>setReportText(e.target.value)} placeholder="Write your message here..." rows={5} style={{...field,height:120,padding:12}}/><button style={btn} disabled={busy||reportText.trim().length<5} onClick={async()=>{await action(`/api/smm/orders/${report.id}/report`,{message:reportText},'Your report has been sent.');setReport(null)}}>Send report</button><button style={{...back,width:'100%',marginTop:9}} onClick={()=>setReport(null)}>Close</button></div></div>}
  <div style={{textAlign:'center',color:'#8794bd',fontSize:11,padding:'18px 0'}}>FX Socials · Simple social media boosting</div>
 </div></main>
}
