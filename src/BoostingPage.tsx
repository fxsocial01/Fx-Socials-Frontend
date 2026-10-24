import { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE=(import.meta as any).env.VITE_API_BASE_URL||'https://fx-socials-api.onrender.com';
const money=(n:number)=>`₦${Number(n||0).toLocaleString('en-NG')}`;
const token=()=>localStorage.getItem('fxs-session')||'';
const platforms=[
  {id:'Instagram',label:'Instagram',icon:'◎'},
  {id:'TikTok',label:'TikTok',icon:'♪'},
  {id:'Facebook',label:'Facebook',icon:'f'},
  {id:'YouTube',label:'YouTube',icon:'▶'},
  {id:'X',label:'X',icon:'𝕏'},
];
async function req(path:string,method='GET',body?:any){
  const r=await fetch(`${API_BASE}${path}`,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Request failed');
  return d;
}

export default function BoostingPage(){
  const [services,setServices]=useState<any[]>([]);
  const [platform,setPlatform]=useState('Instagram');
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState<any|null>(null);
  const [link,setLink]=useState('');
  const [quantity,setQuantity]=useState('');
  const [wallet,setWallet]=useState(0);
  const [orders,setOrders]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const orderFormRef=useRef<HTMLElement|null>(null);
  const linkInputRef=useRef<HTMLInputElement|null>(null);

  const load=async()=>{try{setLoading(true);const d=await req('/api/smm/services');setServices(d.services||[]);}catch(e:any){setMessage(e.message||'Boosting services are temporarily unavailable.')}finally{setLoading(false)}};
  const loadWallet=async()=>{if(!token())return;try{const d=await req('/api/me/wallet','POST',{sessionToken:token()});setWallet(Number(d.wallet?.balance||0));}catch{}};
  const loadOrders=async()=>{if(!token())return;try{const d=await req('/api/smm/orders');setOrders(d.orders||[]);}catch{}};
  useEffect(()=>{void load();void loadWallet();void loadOrders()},[]);

  useEffect(()=>{
    if(!selected)return;
    const timer=window.setTimeout(()=>{
      orderFormRef.current?.scrollIntoView({behavior:'smooth',block:'start'});
      window.setTimeout(()=>linkInputRef.current?.focus(),450);
    },80);
    return()=>window.clearTimeout(timer);
  },[selected]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return services.filter(s=>{
      const text=String(s.name||'').toLowerCase();
      const matchesPlatform=!platform||text.includes(platform.toLowerCase())||(platform==='X'&&/twitter|tweet| x /.test(` ${text} `));
      return matchesPlatform&&(!q||text.includes(q));
    }).sort((a,b)=>Number(a.pricePer1000||0)-Number(b.pricePer1000||0));
  },[services,platform,search]);

  const choosePlatform=(p:string)=>{setPlatform(p);setSelected(null);setSearch('');};
  const chooseService=(s:any)=>{setSelected(s);setQuantity(String(s.min||''));};
  const validQty=selected&&Number(quantity)>=Number(selected.min)&&Number(quantity)<=Number(selected.max);
  const total=selected&&quantity?Number(selected.pricePer1000||0)*Number(quantity)/1000:0;
  const placeOrder=async()=>{
    if(!token()){location.hash='#/account';return;}
    if(!selected||!link.trim()||!validQty){setMessage('Pick a service, enter your public link, and choose a valid quantity.');return;}
    setBusy(true);setMessage('');
    try{
      const d=await req('/api/smm/orders','POST',{serviceId:selected.id,link:link.trim(),quantity:Number(quantity),sessionToken:token()});
      setWallet(Number(d.walletBalance||0));setMessage(`Your boost order ${d.orderNumber||''} has been placed.`);setSelected(null);setLink('');setQuantity('');await loadOrders();
    }catch(e:any){setMessage(e.message||'Could not place the boost order.')}finally{setBusy(false)}
  };

  return <main style={{minHeight:'100vh',background:'#050505',color:'#fff',paddingBottom:60}}>
    <div style={{maxWidth:900,margin:'0 auto',padding:'28px 18px'}}>
      <button onClick={()=>location.hash='#/home'} style={{border:0,background:'transparent',color:'#aaa',fontSize:15,padding:0,cursor:'pointer'}}>← FX Socials</button>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,marginTop:28,flexWrap:'wrap'}}>
        <div><div style={{fontSize:11,fontWeight:800,letterSpacing:'.16em',color:'#888'}}>BOOSTING</div><h1 style={{fontSize:'clamp(38px,8vw,64px)',lineHeight:.98,letterSpacing:'-.055em',margin:'10px 0'}}>What do you want<br/>to boost?</h1><p style={{color:'#999',fontSize:16,margin:0}}>Tap an app. Pick a service. Paste your link. That's it.</p></div>
        <button onClick={()=>location.hash='#/wallet'} style={{border:'1px solid #333',background:'#101010',color:'#fff',borderRadius:999,padding:'12px 16px',fontWeight:800}}>Wallet {money(wallet)}</button>
      </div>

      {message&&<div style={{marginTop:22,padding:14,borderRadius:14,background:'#fff',color:'#111',fontWeight:600}}>{message}<button onClick={()=>setMessage('')} style={{float:'right',border:0,background:'transparent',fontSize:20,cursor:'pointer'}}>×</button></div>}

      <section style={{marginTop:30}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:9}}>
          {platforms.map(p=><button key={p.id} onClick={()=>choosePlatform(p.id)} aria-label={`Boost ${p.label}`} style={{minHeight:88,border:platform===p.id?'2px solid #fff':'1px solid #292929',background:platform===p.id?'#fff':'#0d0d0d',color:platform===p.id?'#050505':'#fff',borderRadius:18,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:7}}><span style={{fontSize:28,fontWeight:900,lineHeight:1}}>{p.icon}</span><span style={{fontSize:12,fontWeight:800}}>{p.label}</span></button>)}
        </div>
      </section>

      <div style={{position:'relative',marginTop:18}}><span style={{position:'absolute',left:16,top:12,color:'#777',fontSize:20}}>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${platform} services`} style={{width:'100%',height:50,borderRadius:15,border:'1px solid #303030',background:'#101010',color:'#fff',padding:'0 16px 0 46px',fontSize:15,outline:'none'}}/></div>

      <section style={{marginTop:18}}>
        {loading?<div style={{padding:28,textAlign:'center',color:'#888'}}>Loading services…</div>:filtered.length?<div style={{display:'grid',gap:10}}>{filtered.map(s=>{
          const active=selected?.id===s.id;
          return <button key={s.id} onClick={()=>chooseService(s)} style={{textAlign:'left',border:active?'2px solid #fff':'1px solid #292929',background:active?'#171717':'#0d0d0d',color:'#fff',borderRadius:16,padding:16,cursor:'pointer'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div><div style={{fontSize:16,fontWeight:800}}>{s.name}</div><div style={{fontSize:12,color:'#777',marginTop:5}}>From {money(s.pricePer1000)} per 1,000</div></div><span style={{fontSize:13,fontWeight:800}}>{active?'✓ Selected':'Tap to choose'}</span></div></button>;
        })}</div>:<div style={{padding:28,textAlign:'center',border:'1px solid #292929',borderRadius:16,color:'#888'}}>No {platform} services match that search.</div>}
      </section>

      {selected&&<section ref={orderFormRef} style={{scrollMarginTop:18,marginTop:20,border:'1px solid #292929',background:'#0d0d0d',borderRadius:18,padding:18}}>
        <div style={{fontSize:12,color:'#888'}}>YOU CHOSE</div><div style={{fontSize:20,fontWeight:900,marginTop:5}}>{selected.name}</div>
        <label style={{display:'block',marginTop:18,fontSize:13,color:'#aaa'}}>Public post / profile link<input ref={linkInputRef} value={link} onChange={e=>setLink(e.target.value)} placeholder="https://instagram.com/..." style={{display:'block',width:'100%',marginTop:7,height:48,borderRadius:12,border:'1px solid #333',background:'#151515',color:'#fff',padding:'0 13px'}}/></label>
        <label style={{display:'block',marginTop:14,fontSize:13,color:'#aaa'}}>Quantity<input type="number" min={selected.min} max={selected.max} value={quantity} onChange={e=>setQuantity(e.target.value.replace(/\D/g,''))} placeholder={`${selected.min} - ${selected.max}`} style={{display:'block',width:'100%',marginTop:7,height:48,borderRadius:12,border:'1px solid #333',background:'#151515',color:'#fff',padding:'0 13px'}}/></label>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:18,paddingTop:16,borderTop:'1px solid #242424'}}><span style={{color:'#888'}}>Your price</span><strong style={{fontSize:24}}>{money(total)}</strong></div>
        <button disabled={busy||!validQty||!link.trim()} onClick={placeOrder} style={{width:'100%',height:52,marginTop:14,border:0,borderRadius:13,background:'#fff',color:'#050505',fontWeight:900,cursor:'pointer',opacity:busy||!validQty||!link.trim()?0.5:1}}>{busy?'Placing order…':`Boost now · ${money(total)}`}</button>
      </section>}

      {orders.length>0&&<section style={{marginTop:28}}><h2 style={{fontSize:20}}>Your boost orders</h2><div style={{display:'grid',gap:8}}>{orders.map(o=><div key={o.id} style={{border:'1px solid #292929',background:'#0d0d0d',borderRadius:13,padding:13}}><b>{o.serviceName}</b><div style={{fontSize:12,color:'#888',marginTop:4}}>{Number(o.quantity).toLocaleString()} · {money(o.amount)} · {o.status}</div></div>)}</div></section>}
    </div>
    <style>{`@media(max-width:650px){.boost-platforms{grid-template-columns:repeat(3,1fr)!important}}`}</style>
  </main>;
}
