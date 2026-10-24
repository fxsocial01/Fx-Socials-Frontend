import { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE=(import.meta as any).env.VITE_API_BASE_URL||'https://fx-socials-api.onrender.com';
const money=(n:number)=>`₦${Number(n||0).toLocaleString('en-NG')}`;
const token=()=>localStorage.getItem('fxs-session')||'';
async function req(path:string,method='GET',body?:any){const r=await fetch(`${API_BASE}${path}`,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;}
const platforms=[['Instagram','https://cdn.simpleicons.org/instagram/ffffff'],['TikTok','https://cdn.simpleicons.org/tiktok/ffffff'],['Facebook','https://cdn.simpleicons.org/facebook/ffffff'],['YouTube','https://cdn.simpleicons.org/youtube/ffffff'],['X','https://cdn.simpleicons.org/x/ffffff']];
const Spinner=({label='Loading…'}:{label?:string})=><div style={{display:'inline-flex',alignItems:'center',gap:9,color:'#888'}}><span style={{width:16,height:16,border:'2px solid #444',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'fxspin .8s linear infinite'}}/>{label}</div>;

export default function BoostingPage(){
 const [services,setServices]=useState<any[]>([]),[platform,setPlatform]=useState('Instagram'),[search,setSearch]=useState(''),[selected,setSelected]=useState<any|null>(null),[link,setLink]=useState(''),[quantity,setQuantity]=useState(''),[wallet,setWallet]=useState(0),[orders,setOrders]=useState<any[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const formRef=useRef<HTMLElement|null>(null),linkRef=useRef<HTMLInputElement|null>(null);
 const load=async()=>{setLoading(true);setMessage('');try{const d=await req('/api/smm/services');setServices(Array.isArray(d.services)?d.services:[])}catch(e:any){setMessage(e.message||'Boosting services are temporarily unavailable.')}finally{setLoading(false)}};
 const loadWallet=async()=>{if(!token())return;try{const d=await req('/api/me/wallet','POST',{sessionToken:token()});setWallet(Number(d.wallet?.balance||0))}catch{}};
 const loadOrders=async()=>{if(!token())return;try{const d=await req('/api/smm/orders');setOrders(d.orders||[])}catch{}};
 useEffect(()=>{void load();void loadWallet();void loadOrders()},[]);
 useEffect(()=>{if(!selected)return;const t=window.setTimeout(()=>{formRef.current?.scrollIntoView({behavior:'smooth',block:'start'});window.setTimeout(()=>linkRef.current?.focus(),350)},80);return()=>window.clearTimeout(t)},[selected]);
 const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return services.filter((s:any)=>{const t=`${s.name||''} ${s.category||''} ${s.type||''} ${s.description||''}`.toLowerCase();const platformOk=platform==='X'?/twitter|tweet|\bx\b/.test(t):t.includes(platform.toLowerCase());return platformOk&&(!q||t.includes(q))}).sort((a:any,b:any)=>Number(a.pricePer1000||0)-Number(b.pricePer1000||0))},[services,platform,search]);
 const choosePlatform=(p:string)=>{setPlatform(p);setSelected(null);setSearch('')};
 const chooseService=(s:any)=>{setSelected(s);setQuantity(String(s.min||''))};
 const validQty=!!selected&&Number(quantity)>=Number(selected.min)&&Number(quantity)<=Number(selected.max);
 const total=selected&&quantity?Number(selected.pricePer1000||0)*Number(quantity)/1000:0;
 const placeOrder=async()=>{if(!token()){location.hash='#/account';return}if(!selected||!link.trim()||!validQty){setMessage('Pick a service, enter your public link, and choose a valid quantity.');return}setBusy(true);try{const d=await req('/api/smm/orders','POST',{serviceId:selected.id,link:link.trim(),quantity:Number(quantity),sessionToken:token()});setWallet(Number(d.walletBalance||0));setMessage(`Your boost order ${d.orderNumber||''} has been placed.`);setSelected(null);setLink('');setQuantity('');await loadOrders()}catch(e:any){setMessage(e.message||'Could not place the boost order.')}finally{setBusy(false)}};
 return <main style={{minHeight:'100vh',background:'#050505',color:'#fff',paddingBottom:70}}><div style={{maxWidth:940,margin:'0 auto',padding:'28px 18px'}}><button onClick={()=>location.hash='#/home'} style={back}>← FX Socials</button><div style={{marginTop:30}}><div style={eyebrow}>BOOSTING</div><h1 style={hero}>What do you want<br/>to boost?</h1><p style={sub}>Choose a platform, select a live service, add your public link and quantity.</p></div><button onClick={()=>location.hash='#/wallet'} style={walletBtn}>Wallet {money(wallet)}</button>{message&&<div style={notice}>{message}<button onClick={()=>setMessage('')} style={close}>×</button></div>}
 <section style={section}><div style={eyebrow}>BOOSTING SERVICES</div><div style={singleProvider}><b>Available boosting services</b><span>Live catalog · 40% FX Socials markup</span></div></section>
 <section style={section}><div style={platformGrid}>{platforms.map(([id,icon])=><button key={id} onClick={()=>choosePlatform(id)} style={{...platformBtn,border:platform===id?'2px solid #fff':'1px solid #292929',background:platform===id?'#fff':'#0d0d0d',color:platform===id?'#050505':'#fff'}}><img src={icon} alt="" style={{width:32,height:32,objectFit:'contain',filter:platform===id?'invert(1)':'none'}}/><span>{id}</span></button>)}</div></section>
 <div style={{position:'relative',marginTop:18}}><span style={searchIcon}>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${platform} services`} style={input}/></div>
 <section style={{marginTop:18}}>{loading?<div style={empty}><Spinner label="Loading live boosting services…"/></div>:filtered.length?<div style={{display:'grid',gap:11}}>{filtered.map((s:any)=>{const active=selected?.id===s.id;return <button key={s.id} onClick={()=>chooseService(s)} style={{...serviceCard,border:active?'2px solid #fff':'1px solid #292929'}}><div><b>{s.name}</b><div style={muted}>{s.category||platform} · {money(s.pricePer1000)} / 1,000 · min {Number(s.min).toLocaleString()} · max {Number(s.max).toLocaleString()}</div></div><span>{active?'✓ Selected':'Choose'}</span></button>})}</div>:<div style={empty}>No {platform} boosting services are available right now.</div>}</section>
 {selected&&<section ref={formRef} style={{...section,scrollMarginTop:18}}><div style={eyebrow}>ORDER FORM</div><div style={{fontSize:21,fontWeight:900,marginTop:6}}>{selected.name}</div><div style={muted}>FX Socials service</div><label style={label}>Public post / profile link<input ref={linkRef} value={link} onChange={e=>setLink(e.target.value)} placeholder="https://instagram.com/..." style={input}/></label><label style={label}>Quantity<input type="number" min={selected.min} max={selected.max} value={quantity} onChange={e=>setQuantity(e.target.value.replace(/\D/g,''))} style={input}/></label><div style={totalRow}><span>FX Socials price</span><strong>{money(total)}</strong></div><button disabled={busy||!validQty||!link.trim()} onClick={placeOrder} style={{...primary,opacity:busy||!validQty||!link.trim()?0.5:1}}>{busy?'Placing order…':`Boost now · ${money(total)}`}</button></section>}
 {orders.length>0&&<section style={{marginTop:30}}><h2>Your boost orders</h2><div style={{display:'grid',gap:9}}>{orders.map(o=><div key={o.id} style={orderCard}><b>{o.serviceName}</b><div style={muted}>{Number(o.quantity).toLocaleString()} · {money(o.amount)} · {o.status}</div></div>)}</div></section>}
 </div><style>{`@keyframes fxspin{to{transform:rotate(360deg)}}@media(max-width:650px){.fx-platforms{grid-template-columns:repeat(2,1fr)!important}}`}</style></main>;
}
const back:any={border:0,background:'transparent',color:'#aaa',fontSize:15,padding:0,cursor:'pointer'};
const eyebrow:any={fontSize:11,fontWeight:900,letterSpacing:'.18em',color:'#888'};
const hero:any={fontSize:'clamp(42px,8vw,68px)',lineHeight:.96,letterSpacing:'-.06em',margin:'12px 0'};
const sub:any={color:'#999',fontSize:17,lineHeight:1.5,maxWidth:680};
const walletBtn:any={marginTop:20,border:'1px solid #333',background:'#101010',color:'#fff',borderRadius:999,padding:'13px 18px',fontWeight:900};
const notice:any={marginTop:22,padding:16,borderRadius:15,background:'#fff',color:'#111',fontWeight:700,lineHeight:1.4};
const close:any={float:'right',border:0,background:'transparent',fontSize:22,cursor:'pointer'};
const section:any={marginTop:25,border:'1px solid #292929',background:'#0d0d0d',borderRadius:20,padding:20};
const singleProvider:any={marginTop:10,border:'1px solid #292929',borderRadius:17,padding:'16px 17px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10};
const platformGrid:any={display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:10};
const platformBtn:any={minHeight:100,borderRadius:18,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:9,fontWeight:900};
const searchIcon:any={position:'absolute',left:16,top:12,color:'#777',fontSize:20};
const input:any={display:'block',width:'100%',height:52,boxSizing:'border-box',borderRadius:13,border:'1px solid #333',background:'#151515',color:'#fff',padding:'0 13px',fontSize:15,outline:'none'};
const empty:any={padding:30,textAlign:'center',border:'1px solid #292929',borderRadius:18,color:'#888'};
const serviceCard:any={textAlign:'left',background:'#0d0d0d',color:'#fff',borderRadius:17,padding:17,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12};
const muted:any={fontSize:12,color:'#777',marginTop:6};
const label:any={display:'block',marginTop:18,fontSize:13,color:'#aaa'};
const totalRow:any={display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:18,paddingTop:16,borderTop:'1px solid #242424'};
const primary:any={width:'100%',height:54,marginTop:14,border:0,borderRadius:14,background:'#fff',color:'#050505',fontWeight:900,cursor:'pointer'};
const orderCard:any={border:'1px solid #292929',background:'#0d0d0d',borderRadius:14,padding:14};
