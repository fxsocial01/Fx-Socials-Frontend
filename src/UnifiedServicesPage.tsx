import { useEffect, useState } from 'react';

const API = (import.meta as any).env.VITE_API_BASE_URL || 'https://fx-socials-api.onrender.com';
const token = () => localStorage.getItem('fxs-session') || '';
const money = (n: any) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

async function req(path: string, method = 'GET', body?: any) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const value = (obj: any, ...keys: string[]) => {
  for (const key of keys) {
    const result = key.split('.').reduce((acc: any, part: string) => acc?.[part], obj);
    if (result !== undefined && result !== null && String(result) !== '') return result;
  }
  return '';
};

const age = (raw: any) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
};

export default function UnifiedServicesPage() {
  const [tab, setTab] = useState('us');
  const [usServices, setUsServices] = useState<any[]>([]);
  const [otherServices, setOtherServices] = useState<any[]>([]);
  const [service, setService] = useState('');
  const [country, setCountry] = useState('');
  const [countries, setCountries] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [server, setServer] = useState('');
  const [price, setPrice] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailProducts, setEmailProducts] = useState<any[]>([]);
  const [emailSite, setEmailSite] = useState('');
  const [emailDomain, setEmailDomain] = useState('@outlook.com');
  const [emailDomains, setEmailDomains] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [rentApp, setRentApp] = useState('WhatsApp');
  const [months, setMonths] = useState('1');
  const [esims, setEsims] = useState<any[]>([]);

  const logged = Boolean(token());
  const queryTab = () => {
    const match = location.hash.match(/\?tab=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const loadOrders = async () => {
    if (!logged) return;
    try {
      const data = await req('/api/fleexa/orders');
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch { /* keep existing orders */ }
  };

  const loadAll = async () => {
    try {
      const data = await req('/api/fleexa/sms/services');
      const list = Array.isArray(data.services) ? data.services : [];
      setUsServices(list);
      if (list[0]) setService(list[0].name || list[0].id || '');
    } catch (e: any) { setMessage(e.message); }
    try {
      const data = await req('/api/marketplace/live/sms/services');
      setOtherServices(Array.isArray(data.services) ? data.services : []);
    } catch (e: any) { setMessage(e.message); }
    try {
      const data = await req('/api/fleexa/email/products');
      setEmailProducts(Array.isArray(data.products) ? data.products : []);
    } catch { setEmailProducts([]); }
    try {
      const data = await req('/api/fleexa/rent/areas');
      setAreas(Array.isArray(data.areas) ? data.areas : []);
    } catch { setAreas([]); }
    try {
      const data = await req('/api/marketplace/live/esim/catalog');
      setEsims(Array.isArray(data.products) ? data.products : []);
    } catch { setEsims([]); }
  };

  useEffect(() => {
    const selectedTab = queryTab();
    if (selectedTab) setTab(selectedTab);
    void loadAll();
    void loadOrders();
    if (!logged) return;
    const timer = window.setInterval(() => void loadOrders(), 10000);
    return () => window.clearInterval(timer);
  }, [logged]);

  useEffect(() => {
    if (tab !== 'us' || !service) return;
    req(`/api/fleexa/sms/prices?service=${encodeURIComponent(service)}`)
      .then((data) => setPrice(Number(data.salePrice || 0)))
      .catch((e) => setMessage(e.message));
  }, [tab, service]);

  useEffect(() => {
    if (tab !== 'other' || !service) return;
    setCountry(''); setServers([]); setServer(''); setPrice(0);
    req(`/api/marketplace/live/sms/countries?service=${encodeURIComponent(service)}`)
      .then((data) => setCountries(Array.isArray(data.countries) ? data.countries : []))
      .catch((e) => setMessage(e.message));
  }, [tab, service]);

  useEffect(() => {
    if (tab !== 'other' || !service || !country) return;
    setServers([]); setServer(''); setPrice(0);
    req(`/api/marketplace/live/sms/prices?service=${encodeURIComponent(service)}&country=${encodeURIComponent(country)}`)
      .then((data) => setServers(Array.isArray(data.servers) ? data.servers.filter((item: any) => Number(item.stock || 0) > 0) : []))
      .catch((e) => setMessage(e.message));
  }, [tab, service, country]);

  useEffect(() => {
    const selected = servers.find((item) => String(item.server).toUpperCase() === String(server).toUpperCase());
    setPrice(Number(selected?.salePrice || 0));
  }, [server, servers]);

  useEffect(() => {
    if (tab !== 'email' || !emailSite) return;
    req(`/api/fleexa/email/domains?site=${encodeURIComponent(emailSite)}`)
      .then((data) => setEmailDomains(Array.isArray(data.domains) ? data.domains : []))
      .catch(() => setEmailDomains([]));
  }, [tab, emailSite]);

  const requireLogin = () => {
    if (!logged) { location.hash = '#/account'; return false; }
    return true;
  };

  const buyUS = async () => {
    if (!requireLogin() || !service) return;
    setBusy(true); setMessage('');
    try {
      const data = await req('/api/fleexa/sms/buy', 'POST', { service });
      setMessage(`US number ${data.order?.phone || ''} purchased. Waiting for its verification code.`);
      await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const buyOther = async () => {
    if (!requireLogin() || !service || !country || !server) return;
    setBusy(true); setMessage('');
    try {
      const prepared = await req('/api/marketplace/live/sms/prepare', 'POST', { service, country, server, sessionToken: token() });
      await req('/api/marketplace/orders/purchase', 'POST', { productId: prepared.productId, payload: { service, country, server }, sessionToken: token() });
      setMessage('Number purchased. Waiting for the verification code.');
      await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const buyEmail = async () => {
    if (!requireLogin() || !emailSite) return;
    setBusy(true); setMessage('');
    try {
      const data = await req('/api/fleexa/email/buy', 'POST', { site: emailSite, domain: emailDomain, sessionToken: token() });
      setMessage(`Email ${data.order?.email || ''} purchased.`);
      await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const buyRent = async () => {
    if (!requireLogin()) return;
    setBusy(true); setMessage('');
    try {
      const data = await req('/api/fleexa/rent/buy', 'POST', { appName: rentApp, time: months, sessionToken: token() });
      setMessage(`Rental ${data.order?.number || ''} purchased.`);
      await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const buyEsim = async (product: any) => {
    if (!requireLogin()) return;
    setBusy(true); setMessage('');
    try {
      await req('/api/marketplace/orders/purchase', 'POST', { productId: product.id, payload: { category: 'esim', country: product.country_code }, sessionToken: token() });
      setMessage('eSIM purchased successfully.');
      await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const tabs = [
    ['us', '🇺🇸 US Number'],
    ['other', '🌍 Other Numbers'],
    ['email', '✉️ Custom Email'],
    ['rent', '📞 Rental'],
    ['esim', '📶 eSIM'],
  ];

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <button onClick={() => { location.hash = '#/home'; }} style={styles.back}>← FX Socials</button>
        <p style={styles.eyebrow}>FX SOCIALS SERVICES</p>
        <h1 style={styles.title}>Choose what you need.</h1>
        <p style={styles.muted}>Numbers, email, rentals and eSIMs in one place.</p>
        {message && <div style={styles.notice}>{message}<button onClick={() => setMessage('')} style={styles.close}>×</button></div>}

        <div style={styles.tabs}>
          {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} style={{ ...styles.tab, ...(tab === id ? styles.active : {}) }}>{label}</button>)}
        </div>

        <section style={styles.card}>
          {tab === 'us' && <>
            <h2>🇺🇸 Buy US Number</h2>
            <p style={styles.muted}>Connected to the US number provider. Provider cost is not shown to customers.</p>
            <label style={styles.label}>Choose service<select value={service} onChange={(e) => setService(e.target.value)} style={styles.select}>{usServices.map((item: any) => <option key={item.id || item.name} value={item.name || item.id}>{item.name || item.id}</option>)}</select></label>
            {price > 0 && <div style={styles.price}><span>FX SOCIALS PRICE</span><b>{money(price)}</b></div>}
            <button disabled={busy || !price} onClick={() => void buyUS()} style={styles.primary}>{busy ? 'Processing…' : `Buy US number${price ? ` · ${money(price)}` : ''}`}</button>
          </>}

          {tab === 'other' && <>
            <h2>🌍 Other Numbers</h2>
            <p style={styles.muted}>Live international verification numbers with stock and pricing.</p>
            <label style={styles.label}>Choose service<select value={service} onChange={(e) => setService(e.target.value)} style={styles.select}><option value="">Select service</option>{otherServices.map((item: any) => <option key={item.id || item.code || item.name} value={item.code || item.id || item.name}>{item.name || item.code || item.id}</option>)}</select></label>
            {service && <label style={styles.label}>Choose country<select value={country} onChange={(e) => setCountry(e.target.value)} style={styles.select}><option value="">Select country</option>{countries.map((item: any) => <option key={item.code || item.country_code || item.name} value={item.code || item.country_code || item.name}>{item.name || item.country_name || item.code || item.country_code}</option>)}</select></label>}
            {country && <label style={styles.label}>Choose number option<select value={server} onChange={(e) => setServer(e.target.value)} style={styles.select}><option value="">Select option</option>{servers.map((item: any) => <option key={item.server} value={item.server}>{String(item.country_name || country)} · {item.server} · {money(item.salePrice)}</option>)}</select></label>}
            {price > 0 && <div style={styles.price}><span>FX SOCIALS PRICE</span><b>{money(price)}</b></div>}
            <button disabled={busy || !price} onClick={() => void buyOther()} style={styles.primary}>{busy ? 'Processing…' : `Buy number${price ? ` · ${money(price)}` : ''}`}</button>
          </>}

          {tab === 'email' && <>
            <h2>✉️ Custom Email</h2>
            <p style={styles.muted}>Temporary email products available through the connected provider.</p>
            <label style={styles.label}>Service/site<select value={emailSite} onChange={(e) => setEmailSite(e.target.value)} style={styles.select}><option value="">Select service</option>{emailProducts.map((item: any) => <option key={item.id || item.site || item.name} value={item.site || item.name}>{item.name || item.site}</option>)}</select></label>
            <label style={styles.label}>Email domain<select value={emailDomain} onChange={(e) => setEmailDomain(e.target.value)} style={styles.select}>{(emailDomains.length ? emailDomains : ['@outlook.com']).map((item: any) => <option key={item.domain || item} value={item.domain || item}>{item.domain || item}</option>)}</select></label>
            <button disabled={busy || !emailSite} onClick={() => void buyEmail()} style={styles.primary}>{busy ? 'Processing…' : 'Buy custom email'}</button>
          </>}

          {tab === 'rent' && <>
            <h2>📞 Rental Number</h2>
            <p style={styles.muted}>Long-term number rentals from 1–12 months.</p>
            <label style={styles.label}>Service<select value={rentApp} onChange={(e) => setRentApp(e.target.value)} style={styles.select}><option>WhatsApp</option><option>Telegram</option><option>Google</option><option>Instagram</option><option>All access</option></select></label>
            <label style={styles.label}>Months<select value={months} onChange={(e) => setMonths(e.target.value)} style={styles.select}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} month{index ? 's' : ''}</option>)}</select></label>
            {areas.length > 0 && <div style={styles.areaGrid}>{areas.slice(0, 8).map((item: any) => <div key={item.id || item.area_code || item.name} style={styles.area}><span>{item.name || item.area_code || 'US rental'}</span><b>{money(Number(item.price_ngn || item.rate || item.price || 0) * 1.4)} / month</b></div>)}</div>}
            <button disabled={busy} onClick={() => void buyRent()} style={styles.primary}>{busy ? 'Processing…' : 'Buy rental number'}</button>
          </>}

          {tab === 'esim' && <>
            <h2>📶 eSIM</h2>
            <p style={styles.muted}>Configured eSIM plans. Provider cost is never shown to customers.</p>
            {esims.length ? <div style={styles.areaGrid}>{esims.map((product: any) => <div key={product.id} style={styles.esim}><b>{product.name}</b><span>{product.description || ''}</span><strong>{money(product.price)}</strong><button disabled={busy} onClick={() => void buyEsim(product)} style={styles.primary}>Buy eSIM · {money(product.price)}</button></div>)}</div> : <div style={styles.empty}><b>No eSIM plans configured yet.</b><span>Admin can add eSIM plans to the catalog.</span></div>}
          </>}
        </section>

        {logged && <section style={{ marginTop: 32 }}>
          <h2 style={{ margin: 0 }}>Active Orders</h2>
          <p style={{ ...styles.muted, margin: '4px 0 0' }}>Your number purchases and verification codes. Auto-refreshing.</p>
          <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>{orders.length ? orders.map((order: any) => <OrderCard key={order.id || order.order_id || `${value(order, 'phone', 'number')}-${value(order, 'created_at', 'createdAt')}`} order={order} />) : <div style={styles.empty}>No number purchases yet.</div>}</div>
        </section>}
      </div>
    </main>
  );
}

function OrderCard({ order }: { order: any }) {
  const phone = String(value(order, 'phone', 'number', 'data.phone') || '');
  const code = String(value(order, 'code', 'otp', 'sms_code', 'verification_code', 'data.code') || '');
  const service = String(value(order, 'service_name', 'service', 'app', 'type') || 'WhatsApp');
  const country = String(value(order, 'country_name', 'country', 'country_code') || 'USA');
  const amount = Number(value(order, 'amount', 'price', 'salePrice') || 0);
  const status = String(value(order, 'status', 'state') || '').toLowerCase();
  const done = ['completed', 'complete', 'success', 'successful', 'done', 'finished', 'received'].includes(status);
  const copy = async (text: string) => { if (text) await navigator.clipboard?.writeText(text).catch(() => {}); };
  return <article style={styles.orderCard}>
    <div style={styles.orderTop}><div><h3 style={{ margin: 0, fontSize: 22 }}>{service}</h3><div style={styles.muted}>{country} · {age(value(order, 'created_at', 'createdAt', 'created'))}</div></div><div style={{ textAlign: 'right' }}><strong style={{ fontSize: 21 }}>{money(amount)}</strong><div style={done ? styles.done : styles.waiting}>{done ? 'Completed' : 'Waiting for code'}</div></div></div>
    <div style={styles.detail}><span>{phone || 'Number is being prepared…'}</span>{phone && <button onClick={() => void copy(phone)} style={styles.copy}>Copy</button>}</div>
    <div style={styles.detail}><span style={{ fontWeight: 900, letterSpacing: '.08em' }}>{code || 'Waiting for SMS code…'}</span>{code && <button onClick={() => void copy(code)} style={styles.copy}>Copy</button>}</div>
    <div style={styles.doneBar}>✓ {done ? 'Done' : 'Auto-refreshing for code'}</div>
  </article>;
}

const styles: any = {
  page: { minHeight: '100vh', background: '#050505', color: '#fff', padding: '24px 18px 70px' },
  wrap: { maxWidth: 980, margin: '0 auto' },
  back: { border: 0, background: 'transparent', color: '#aaa', fontSize: 15 },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: '.16em', color: '#888', marginTop: 28 },
  title: { fontSize: 'clamp(42px,8vw,68px)', lineHeight: .98, letterSpacing: '-.055em', margin: '10px 0' },
  muted: { color: '#888', lineHeight: 1.5 },
  notice: { marginTop: 20, padding: 14, borderRadius: 14, background: '#fff', color: '#111', fontWeight: 700 },
  close: { float: 'right', border: 0, background: 'transparent', fontSize: 20 },
  tabs: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 28 },
  tab: { minHeight: 70, border: '1px solid #292929', background: '#0d0d0d', color: '#fff', borderRadius: 16, fontWeight: 900, fontSize: 12 },
  active: { border: '2px solid #fff', background: '#fff', color: '#050505' },
  card: { marginTop: 18, padding: 20, border: '1px solid #222', borderRadius: 20, background: '#0b0b0b' },
  label: { display: 'grid', gap: 8, marginTop: 18, fontWeight: 800 },
  select: { width: '100%', padding: 14, borderRadius: 12, border: '1px solid #333', background: '#111', color: '#fff' },
  price: { marginTop: 18, padding: 16, borderRadius: 14, background: '#151515', display: 'grid', gap: 5 },
  primary: { width: '100%', marginTop: 18, padding: 16, border: 0, borderRadius: 14, background: '#fff', color: '#000', fontWeight: 900 },
  areaGrid: { display: 'grid', gap: 8, marginTop: 16 },
  area: { padding: 13, border: '1px solid #282828', borderRadius: 12, display: 'flex', justifyContent: 'space-between', gap: 10 },
  esim: { display: 'grid', gap: 7, padding: 15, border: '1px solid #292929', borderRadius: 14 },
  empty: { padding: 18, border: '1px dashed #333', borderRadius: 14, color: '#777', display: 'grid', gap: 5 },
  orderCard: { padding: 18, border: '1px solid #242424', borderRadius: 18, background: '#0b0b0b' },
  orderTop: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  detail: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: 14, borderRadius: 12, background: '#151515' },
  copy: { border: '1px solid #333', background: '#0b0b0b', color: '#fff', borderRadius: 9, padding: '7px 10px' },
  done: { marginTop: 7, padding: '5px 8px', borderRadius: 8, background: '#143d2b', color: '#6fe0a5', fontSize: 12, fontWeight: 800 },
  waiting: { marginTop: 7, padding: '5px 8px', borderRadius: 8, background: '#3d3214', color: '#f0c968', fontSize: 12, fontWeight: 800 },
  doneBar: { marginTop: 12, color: '#888', fontWeight: 800 },
};
