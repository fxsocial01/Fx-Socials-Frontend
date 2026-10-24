import { useEffect, useState } from 'react';
import BoostingPage from './BoostingPage';
import UnifiedServicesPage from './UnifiedServicesPage';

const API = (import.meta as any).env.VITE_API_BASE_URL || 'https://fx-socials-api.onrender.com';
const token = () => localStorage.getItem('fxs-session') || '';
const money = (n: any) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

async function req(path: string, method = 'GET', body?: any) {
  const r = await fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

const go = (p: string) => { location.hash = `#/${p}`; };
const serviceItems = [
  ['marketplace', '🛍️', 'Buy accounts'],
  ['services', '📱', 'Buy number'],
  ['services?tab=esim', '📶', 'Buy eSIM'],
  ['boosting', '🚀', 'Boost social media'],
  ['sell', '💼', 'Sell account'],
  ['support', '💬', 'Customer support'],
  ['how', 'ℹ️', 'How it works'],
  ['dashboard', '👤', 'My account'],
];

export default function AppFixed() {
  const [user, setUser] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('fxs-user') || 'null'); } catch { return null; } });
  const [page, setPage] = useState(() => location.hash.replace('#/', '').split('?')[0] || 'home');
  const [wallet, setWallet] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [auth, setAuth] = useState({ name: '', email: '', password: '' });
  const logged = Boolean(token());

  const loadAccount = async () => {
    if (!logged) return;
    try {
      const w = await req('/api/me/wallet', 'POST', { sessionToken: token() });
      setWallet(Number(w.wallet?.balance || 0));
    } catch {}
    try {
      const d = await req('/api/fleexa/orders');
      setOrders(Array.isArray(d.orders) ? d.orders : []);
    } catch {}
  };

  useEffect(() => {
    const onHash = () => setPage(location.hash.replace('#/', '').split('?')[0] || 'home');
    addEventListener('hashchange', onHash);
    void loadAccount();
    return () => removeEventListener('hashchange', onHash);
  }, [logged]);

  useEffect(() => {
    if (!logged) return;
    const id = window.setInterval(() => void loadAccount(), 10000);
    return () => window.clearInterval(id);
  }, [logged]);

  const login = async () => {
    if (!auth.email || !auth.password || (mode === 'register' && !auth.name)) { setMessage('Please complete the form.'); return; }
    setBusy(true);
    try {
      const d = await req(mode === 'register' ? '/api/auth/register' : '/api/auth/login', 'POST', mode === 'register' ? auth : { email: auth.email, password: auth.password });
      localStorage.setItem('fxs-session', d.token);
      localStorage.setItem('fxs-user', JSON.stringify(d.user));
      setUser(d.user);
      setMessage('');
      go('dashboard');
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const logout = () => { localStorage.removeItem('fxs-session'); localStorage.removeItem('fxs-user'); setUser(null); setWallet(0); setOrders([]); go('home'); };

  if (page === 'services') return <UnifiedServicesPage />;
  if (page === 'boosting') return <BoostingPage user={user} wallet={wallet} setWallet={setWallet} setMessage={setMessage} go={go} busy={busy} setBusy={setBusy} />;

  return <div style={shell}>
    <header style={topbar}>
      <button style={brand} onClick={() => go('dashboard')}><b>FX SOCIALS</b></button>
      <div style={topActions}>
        {logged && <button style={walletPill} onClick={() => go('wallet')}>{money(wallet)}</button>}
        {logged ? <button style={outline} onClick={logout}>Sign out</button> : <button style={primarySmall} onClick={() => go('account')}>Login / Register</button>}
      </div>
    </header>

    {message && <div style={notice}>{message}<button onClick={() => setMessage('')} style={close}>×</button></div>}

    {page === 'home' && <main style={wrap}>
      <section style={hero}><div><div style={eyebrow}>WELCOME TO FX SOCIALS</div><h1 style={heroTitle}>Simple digital services<br /><span style={{ color: '#888' }}>in a few simple steps.</span></h1><p style={lead}>Buy accounts, verification numbers, eSIMs and social media services from one place.</p><button style={primary} onClick={() => go(logged ? 'dashboard' : 'account')}>Get started</button></div></section>
    </main>}

    {page === 'account' && <main style={wrap}><section style={card}><h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>{mode === 'register' && <label style={label}>Name<input style={input} value={auth.name} onChange={e => setAuth({ ...auth, name: e.target.value })} /></label>}<label style={label}>Email<input style={input} type="email" value={auth.email} onChange={e => setAuth({ ...auth, email: e.target.value })} /></label><label style={label}>Password<input style={input} type="password" value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} /></label><button style={primary} disabled={busy} onClick={login}>{busy ? 'Processing…' : mode === 'login' ? 'Login' : 'Create account'}</button><button style={textButton} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'New here? Create an account' : 'Already registered? Login'}</button></section></main>}

    {page === 'dashboard' && <Dashboard user={user} wallet={wallet} orders={orders} logged={logged} refresh={loadAccount} />}
    {page === 'wallet' && <Wallet wallet={wallet} logged={logged} />}
    {page === 'orders' && <Orders orders={orders} />}
    {page === 'support' && <main style={wrap}><section style={card}><h1>Customer support</h1><p style={lead}>Need help with an order or service?</p><a style={primaryLink} href="https://wa.me/2349072978807" target="_blank" rel="noreferrer">Open WhatsApp support</a></section></main>}
    {page === 'how' && <main style={wrap}><section style={card}><div style={eyebrow}>HOW IT WORKS</div><h1>Four simple steps.</h1><ol style={steps}><li>Create your FX Socials account.</li><li>Choose the service you need.</li><li>Fund your wallet and pay.</li><li>Track your purchase from Active Orders.</li></ol></section></main>}
    {page === 'marketplace' && <Marketplace />}
    {page === 'sell' && <main style={wrap}><section style={card}><h1>Sell an account</h1><p style={lead}>Submit an account you own for admin review.</p><button style={primary} onClick={() => setMessage(logged ? 'Use the seller form from your account dashboard.' : 'Please login first.')}>{logged ? 'Continue' : 'Login first'}</button></section></main>}
  </div>;
}

function Dashboard({ user, wallet, orders, logged, refresh }: any) {
  return <main style={wrap}>
    <section style={{ ...card, paddingTop: 18 }}>
      <div style={eyebrow}>FX SOCIALS DASHBOARD</div>
      <h1 style={{ ...heroTitle, marginBottom: 8 }}>Hello, {user?.name || 'there'}.</h1>
      <p style={{ ...lead, marginTop: 0 }}>{user?.email || 'Your account'}</p>
      <div style={serviceGrid}>
        {serviceItems.map(([path, icon, label]) => <button key={path} onClick={() => go(path)} style={serviceButton}><span style={{ fontSize: 24 }}>{icon}</span><b>{label}</b></button>)}
      </div>
    </section>
    <section style={{ ...card, marginTop: 18 }}><div style={balanceRow}><div><div style={eyebrow}>WALLET</div><strong style={{ fontSize: 30 }}>{money(wallet)}</strong></div><button style={outlineDark} onClick={() => go('wallet')}>Fund wallet</button></div></section>
    <ActiveOrders orders={orders} refresh={refresh} />
  </main>;
}

function ActiveOrders({ orders, refresh }: any) {
  return <section style={{ ...card, marginTop: 18 }}>
    <div style={ordersHeader}><div style={historyIcon}>↶</div><div><h2 style={{ margin: 0 }}>Active Orders</h2><p style={{ ...muted, margin: '4px 0 0' }}>All your active number purchases in one place. Auto-refreshing.</p></div></div>
    <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
      {orders.length ? orders.map((o: any) => <OrderCard key={o.id || o.order_id || JSON.stringify(o)} order={o} />) : <div style={empty}>No number purchases yet.</div>}
    </div>
    <button onClick={refresh} style={outlineDark}>Refresh orders</button>
  </section>;
}

function OrderCard({ order: o }: any) {
  const value = (...keys: string[]) => { for (const key of keys) { const v = key.split('.').reduce((a: any, p: string) => a?.[p], o); if (v !== undefined && v !== null && String(v) !== '') return v; } return ''; };
  const phone = String(value('phone', 'number', 'data.phone') || '');
  const code = String(value('code', 'otp', 'sms_code', 'verification_code', 'data.code') || '');
  const service = String(value('service_name', 'service', 'app', 'type') || 'WhatsApp');
  const country = String(value('country_name', 'country', 'country_code') || 'USA');
  const amount = Number(value('amount', 'price', 'salePrice') || 0);
  const status = String(value('status', 'state')).toLowerCase();
  const done = ['completed', 'complete', 'success', 'successful', 'done', 'finished'].includes(status);
  const created = value('created_at', 'createdAt', 'created');
  const d = created ? new Date(created) : null;
  const days = d && !Number.isNaN(d.getTime()) ? Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)) : 0;
  const age = !created ? '' : days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} ago`;
  return <article style={orderCard}>
    <div style={orderTop}><div><h3 style={{ margin: 0, fontSize: 22 }}>{service}</h3><div style={muted}>{country}{age ? ` · ${age}` : ''}</div></div><div style={{ textAlign: 'right' }}><strong style={{ fontSize: 21 }}>{money(amount)}</strong><div style={done ? doneBadge : waitingBadge}>{done ? 'Completed' : 'Waiting for code'}</div></div></div>
    <div style={detail}><span>{phone || 'Number is being prepared…'}</span>{phone && <button style={copyButton} onClick={() => navigator.clipboard?.writeText(phone)}>Copy</button>}</div>
    <div style={detail}><span style={{ fontWeight: 900, letterSpacing: '.08em', color: code ? '#3a8b68' : '#777' }}>{code || 'Waiting for SMS code…'}</span>{code && <button style={copyButton} onClick={() => navigator.clipboard?.writeText(code)}>Copy</button>}</div>
    <div style={doneBar}>✓ {done ? 'Done' : 'Auto-refreshing for code'}</div>
  </article>;
}

function Wallet({ wallet, logged }: any) { return <main style={wrap}><section style={card}><div style={eyebrow}>WALLET</div><h1>{money(wallet)}</h1><p style={lead}>Fund your FX Socials wallet through the existing payment flow.</p>{logged && <a style={primaryLink} href={`${API}/api/wallet/initialize`}>Open payment</a>}</section></main>; }
function Orders({ orders }: any) { return <main style={wrap}><section style={card}><h1>My orders</h1>{orders.length ? orders.map((o: any) => <div key={o.id} style={detail}><span>{o.productName || o.service || 'Order'}</span><b>{money(o.amount)} · {o.status}</b></div>) : <div style={empty}>No orders yet.</div>}</section></main>; }
function Marketplace() { const [items, setItems] = useState<any[]>([]); useEffect(() => { req('/api/products').then(d => setItems(d.products || [])).catch(() => setItems([])); }, []); return <main style={wrap}><section style={card}><h1>Buy accounts</h1><div style={productGrid}>{items.filter(x => x.status === 'available').map(x => <article key={x.id} style={product}><div style={eyebrow}>{x.platform}</div><h3>{x.username}</h3><p style={muted}>{x.description || 'Available account'}</p><div style={balanceRow}><b>{money(x.price)}</b><button style={outlineDark} onClick={() => go('account')}>Buy</button></div></article>)}</div></section></main>; }

const shell:any={minHeight:'100vh',background:'#050505',color:'#fff'};const topbar:any={position:'sticky',top:0,zIndex:20,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'16px 18px',background:'#050505ee',backdropFilter:'blur(14px)',borderBottom:'1px solid #222'};const brand:any={border:0,background:'transparent',color:'#fff',fontSize:18,fontWeight:900};const topActions:any={display:'flex',gap:8,alignItems:'center'};const walletPill:any={border:'1px solid #333',background:'#111',color:'#fff',borderRadius:999,padding:'11px 14px',fontWeight:800};const outline:any={border:'1px solid #333',background:'transparent',color:'#fff',borderRadius:12,padding:'11px 14px'};const primarySmall:any={border:0,background:'#fff',color:'#000',borderRadius:12,padding:'11px 14px',fontWeight:900};const wrap:any={maxWidth:980,margin:'0 auto',padding:'28px 18px 70px'};const hero:any={minHeight:'65vh',display:'flex',alignItems:'center',padding:'40px 0'};const eyebrow:any={fontSize:11,fontWeight:900,letterSpacing:'.18em',color:'#888'};const heroTitle:any={fontSize:'clamp(42px,8vw,72px)',lineHeight:.98,letterSpacing:'-.055em',margin:'12px 0 18px'};const lead:any={fontSize:18,lineHeight:1.55,color:'#999',maxWidth:700};const primary:any={display:'inline-block',border:0,background:'#fff',color:'#000',borderRadius:14,padding:'15px 18px',fontWeight:900,textDecoration:'none',marginTop:12};const primaryLink:any={...primary};const card:any={padding:22,border:'1px solid #242424',borderRadius:22,background:'#0b0b0b'};const label:any={display:'grid',gap:8,marginTop:16,fontWeight:800};const input:any={padding:14,borderRadius:12,border:'1px solid #333',background:'#111',color:'#fff'};const textButton:any={display:'block',border:0,background:'transparent',color:'#aaa',marginTop:14};const notice:any={position:'fixed',top:78,left:18,right:18,zIndex:30,padding:18,borderRadius:16,background:'#fff',color:'#111',fontWeight:800};const close:any={float:'right',border:0,background:'transparent',fontSize:22};const serviceGrid:any={display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginTop:22};const serviceButton:any={minHeight:94,border:'1px solid #303030',borderRadius:16,background:'#111',color:'#fff',display:'grid',placeItems:'center',padding:10,fontSize:12};const balanceRow:any={display:'flex',justifyContent:'space-between',alignItems:'center',gap:12};const outlineDark:any={border:'1px solid #333',background:'#151515',color:'#fff',borderRadius:12,padding:'10px 14px',fontWeight:800};const ordersHeader:any={display:'flex',alignItems:'center',gap:14};const historyIcon:any={width:58,height:58,borderRadius:16,background:'#151515',display:'grid',placeItems:'center',fontSize:30};const muted:any={color:'#888',lineHeight:1.5};const orderCard:any={padding:18,border:'1px solid #242424',borderRadius:18,background:'#0b0b0b'};const orderTop:any={display:'flex',justifyContent:'space-between',gap:12};const detail:any={display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginTop:12,padding:14,borderRadius:12,background:'#151515'};const copyButton:any={border:'1px solid #333',background:'#0b0b0b',color:'#fff',borderRadius:9,padding:'7px 10px'};const doneBadge:any={marginTop:7,padding:'5px 8px',borderRadius:8,background:'#143d2b',color:'#6fe0a5',fontSize:12,fontWeight:800};const waitingBadge:any={marginTop:7,padding:'5px 8px',borderRadius:8,background:'#3d3214',color:'#f0c968',fontSize:12,fontWeight:800};const doneBar:any={marginTop:12,color:'#7bb99d',fontWeight:800};const empty:any={padding:18,border:'1px dashed #333',borderRadius:14,color:'#777'};const steps:any={lineHeight:2.2,paddingLeft:22};const productGrid:any={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12};const product:any={padding:16,border:'1px solid #292929',borderRadius:16,background:'#101010'};
