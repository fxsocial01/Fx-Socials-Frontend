import { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'https://fx-socials-api.onrender.com';
const money = (n:number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const token = () => localStorage.getItem('fxs-session') || '';
const platforms = [
  { id:'Instagram', label:'Instagram', icon:'https://cdn.simpleicons.org/instagram/ffffff' },
  { id:'TikTok', label:'TikTok', icon:'https://cdn.simpleicons.org/tiktok/ffffff' },
  { id:'Facebook', label:'Facebook', icon:'https://cdn.simpleicons.org/facebook/ffffff' },
  { id:'YouTube', label:'YouTube', icon:'https://cdn.simpleicons.org/youtube/ffffff' },
  { id:'X', label:'X', icon:'https://cdn.simpleicons.org/x/ffffff' },
];

async function req(path:string, method='GET', body?:any) {
  const r = await fetch(`${API_BASE}${path}`, {
    method,
    headers:{'Content-Type':'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

const providerOf = (s:any) => String(s.provider || s.id || '').startsWith('smm-africa:') ? 'smm-africa' : 'smm-panel-ng';
const providerName = (id:string) => id === 'smm-africa' ? 'SMM Africa' : 'SMM Panel Nigeria';

export default function BoostingPage(){
  const [services,setServices] = useState<any[]>([]);
  const [provider,setProvider] = useState('smm-panel-ng');
  const [platform,setPlatform] = useState('Instagram');
  const [search,setSearch] = useState('');
  const [selected,setSelected] = useState<any|null>(null);
  const [link,setLink] = useState('');
  const [quantity,setQuantity] = useState('');
  const [wallet,setWallet] = useState(0);
  const [orders,setOrders] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const orderFormRef = useRef<HTMLElement|null>(null);
  const linkInputRef = useRef<HTMLInputElement|null>(null);

  const load = async() => {
    try { setLoading(true); const d=await req('/api/smm/services'); setServices(Array.isArray(d.services)?d.services:[]); }
    catch(e:any){ setMessage(e.message || 'Boosting services are temporarily unavailable.'); }
    finally { setLoading(false); }
  };
  const loadWallet = async() => { if(!token()) return; try { const d=await req('/api/me/wallet','POST',{sessionToken:token()}); setWallet(Number(d.wallet?.balance||0)); } catch{} };
  const loadOrders = async() => { if(!token()) return; try { const d=await req('/api/smm/orders'); setOrders(d.orders||[]); } catch{} };
  useEffect(()=>{ void load(); void loadWallet(); void loadOrders(); },[]);
  useEffect(()=>{
    if(!selected) return;
    const t=window.setTimeout(()=>{ orderFormRef.current?.scrollIntoView({behavior:'smooth',block:'start'}); window.setTimeout(()=>linkInputRef.current?.focus(),450); },80);
    return()=>window.clearTimeout(t);
  },[selected]);

  const providers = useMemo(()=>[
    {id:'smm-panel-ng',name:'SMM Panel Nigeria',services:services.filter(s=>providerOf(s)==='smm-panel-ng')},
    {id:'smm-africa',name:'SMM Africa',services:services.filter(s=>providerOf(s)==='smm-africa')}
  ],[services]);
  const currentProvider = providers.find(p=>p.id===provider) || providers[0];
  const filtered = useMemo(()=>{
    const q=search.trim().toLowerCase();
    return (currentProvider?.services||[]).filter(s=>{
      const text=`${s.name||''} ${s.category||''}`.toLowerCase();
      const matches=platform==='X' ? /twitter|tweet|x\b/.test(text) : text.includes(platform.toLowerCase());
      return matches && (!q || text.includes(q));
    }).sort((a,b)=>Number(a.pricePer1000||0)-Number(b.pricePer1000||0));
  },[currentProvider,platform,search]);

  const chooseProvider=(id:string)=>{setProvider(id);setSelected(null);setSearch('');setMessage('');};
  const choosePlatform=(p:string)=>{setPlatform(p);setSelected(null);setSearch('');};
  const chooseService=(s:any)=>{setSelected({...s,provider:providerOf(s),providerName:providerName(providerOf(s))});setQuantity(String(s.min||''));};
  const validQty=!!selected && Number(quantity)>=Number(selected.min) && Number(quantity)<=Number(selected.max);
  const total=selected&&quantity ? Number(selected.pricePer1000||0)*Number(quantity)/1000 : 0;

  const placeOrder=async()=>{
    if(!token()){location.hash='#/account';return;}
    if(!selected || !link.trim() || !validQty){setMessage('Pick a service, enter your public link, and choose a valid quantity.');return;}
    setBusy(true); setMessage('');
    try{
      const d=await req('/api/smm/orders','POST',{serviceId:selected.id,link:link.trim(),quantity:Number(quantity),sessionToken:token()});
      setWallet(Number(d.walletBalance||0));
      setMessage(`Your boost order ${d.orderNumber||''} has been placed.`);
      setSelected(null);setLink('');setQuantity('');await loadOrders();
    }catch(e:any){setMessage(e.message||'Could not place the boost order.');}
    finally{setBusy(false);}
  };

  return <main style={{minHeight:'100vh',background:'#050505',color:'#fff',paddingBottom:70}}><div style={{maxWidth:940,margin:'0 auto',padding:'28px 18px'}}>
    <button onClick={()=>location.hash='#/home'} style={{border:0,background:'transparent',color:'#aaa',fontSize:15,padding:0,cursor:'pointer'}}>← FX Socials</button>
    <div style={{marginTop:30}}><div style={{fontSize:11,fontWeight:900,letterSpacing:'.18em',color:'#888'}}>BOOSTING</div><h1 style={{fontSize:'clamp(42px,8vw,68px)',lineHeight:.96,letterSpacing:'-.06em',margin:'12px 0'}}>What do you want<br/>to boost?</h1><p style={{color:'#999',fontSize:17,lineHeight:1.5,maxWidth:680}}>Choose Provider 1 or Provider 2, select a social platform, choose a live service and place your order.</p></div>
    <button onClick={()=>location.hash='#/wallet'} style={{marginTop:20,border:'1px solid #333',background:'#101010',color:'#fff',borderRadius:999,padding:'13px 18px',fontWeight:900}}>Wallet {money(wallet)}</button>
    {message&&<div style={{marginTop:22,padding:16,borderRadius:15,background:'#fff',color:'#111',fontWeight:700,lineHeight:1.4}}>{message}<button onClick={()=>setMessage('')} style={{float:'right',border:0,background:'transparent',fontSize:22,cursor:'pointer'}}>×</button></div>}

    <section style={{marginTop:28}}><div style={{fontSize:11,color:'#888',fontWeight:900,letterSpacing:'.14em',marginBottom:10}}>BOOSTING PROVIDER</div><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{providers.map(p=><button key={p.id} onClick={()=>chooseProvider(p.id)} style={{textAlign:'left',border:provider===p.id?'2px solid #fff':'1px solid #292929',background:provider===p.id?'#fff':'#0d0d0d',color:provider===p.id?'#050505':'#fff',borderRadius:18,padding:'16px 17px',cursor:'pointer'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><div><div style={{fontSize:15,fontWeight:900}}>{p.name}</div><div style={{fontSize:12,marginTop:5,color:provider===p.id?'#555':'#777'}}>{p.services.length} live services · 40% FX Socials markup</div></div><span style={{fontSize:12,fontWeight:900}}>{provider===p.id?'✓ Selected':'Use'}</span></div></button>)}</div><div style={{fontSize:12,color:'#777',marginTop:9}}>Provider 1 is primary. Provider 2 is the backup route. Orders remain tied to the provider that actually receives them.</div></section>

    <section style={{marginTop:25}}><div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:10}}>{platforms.map(p=><button key={p.id} onClick={()=>choosePlatform(p.id)} aria-label={`Boost ${p.label}`} style={{minHeight:108,border:platform===p.id?'2px solid #fff':'1px solid #292929',background:platform===p.id?'#fff':'#0d0d0d',color:platform===p.id?'#050505':'#fff',borderRadius:20,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10}}><img src={p.icon} alt={`${p.label} logo`} style={{width:34,height:34,objectFit:'contain',filter:platform===p.id?'invert(1)':'none'}}/><span style={{fontSize:13,fontWeight:900}}>{p.label}</span></button>)}</div></section>
    <div style={{position:'relative',marginTop:18}}><span style={{position:'absolute',left:16,top:12,color:'#777',fontSize:20}}>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${platform} services on ${currentProvider?.name||'provider'}`} style={{width:'100%',height:54,borderRadius:16,border:'1px solid #303030',background:'#101010',color:'#fff',padding:'0 16px 0 46px',fontSize:15,outline:'none'}}/></div>
    <section style={{marginTop:18}}>{loading?<div style={{padding:32,textAlign:'center',color:'#888',border:'1px solid #292929',borderRadius:18}}>Loading provider services…</div>:filtered.length?<div style={{display:'grid',gap:11}}>{filtered.map(s=>{const active=selected?.id===s.id;return <button key={s.id} onClick={()=>chooseService(s)} style={{textAlign:'left',border:active?'2px solid #fff':'1px solid #292929',background:active?'#171717':'#0d0d0d',color:'#fff',borderRadius:17,padding:17,cursor:'pointer'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div><div style={{fontSize:16,fontWeight:900}}>{s.name}</div><div style={{fontSize:12,color:'#777',marginTop:6}}>{s.category||platform} · {money(s.pricePer1000)} per 1,000 · min {Number(s.min).toLocaleString()} · max {Number(s.max).toLocaleString()}</div></div><span style={{fontSize:12,fontWeight:900}}>{active?'✓ Selected':'Choose'}</span></div></button>})}</div>:<div style={{padding:30,textAlign:'center',border:'1px solid #292929',borderRadius:18,color:'#888'}}>No {platform} services are available from {currentProvider?.name||'this provider'} right now.</div>}</section>
    {selected&&<section ref={orderFormRef} style={{scrollMarginTop:18,marginTop:20,border:'1px solid #292929',background:'#0d0d0d',borderRadius:20,padding:20}}><div style={{fontSize:11,color:'#888',fontWeight:900,letterSpacing:'.12em'}}>ORDER FORM</div><div style={{fontSize:21,fontWeight:900,marginTop:6}}>{selected.name}</div><div style={{fontSize:12,color:'#777',marginTop:5}}>Provider: {selected.providerName}</div><label style={{display:'block',marginTop:18,fontSize:13,color:'#aaa'}}>Public post / profile link<input ref={linkInputRef} value={link} onChange={e=>setLink(e.target.value)} placeholder="https://instagram.com/..." style={{display:'block',width:'100%',marginTop:7,height:50,borderRadius:13,border:'1px solid #333',background:'#151515',color:'#fff',padding:'0 13px'}}/></label><label style={{display:'block',marginTop:14,fontSize:13,color:'#aaa'}}>Quantity<input type="number" min={selected.min} max={selected.max} value={quantity} onChange={e=>setQuantity(e.target.value.replace(/\D/g,''))} placeholder={`${selected.min} - ${selected.max}`} style={{display:'block',width:'100%',marginTop:7,height:50,borderRadius:13,border:'1px solid #333',background:'#151515',color:'#fff',padding:'0 13px'}}/></label><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:18,paddingTop:16,borderTop:'1px solid #242424'}}><span style={{color:'#888'}}>FX Socials price</span><strong style={{fontSize:25}}>{money(total)}</strong></div><button disabled={busy||!validQty||!link.trim()} onClick={placeOrder} style={{width:'100%',height:54,marginTop:14,border:0,borderRadius:14,background:'#fff',color:'#050505',fontWeight:900,cursor:'pointer',opacity:busy||!validQty||!link.trim()?0.5:1}}>{busy?'Placing order…':`Boost now · ${money(total)}`}</button></section>}
    {orders.length>0&&<section style={{marginTop:30}}><h2 style={{fontSize:22}}>Your boost orders</h2><div style={{display:'grid',gap:9}}>{orders.map(o=><div key={o.id} style={{border:'1px solid #292929',background:'#0d0d0d',borderRadius:14,padding:14}}><b>{o.serviceName}</b><div style={{fontSize:12,color:'#888',marginTop:5}}>{Number(o.quantity).toLocaleString()} · {money(o.amount)} · {o.status}</div></div>)}</div></section>}
  </div><style>{`@media(max-width:650px){button{touch-action:manipulation}}`}</style></main>;
}
