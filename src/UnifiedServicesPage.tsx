import { useEffect, useState } from 'react';

const API = (import.meta as any).env.VITE_API_BASE_URL || 'https://fx-socials-api.onrender.com';
const token = () => localStorage.getItem('fxs-session') || '';
const money = (n: any) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

async function req(path: string, method = 'GET', body?: any) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

const value = (o: any, ...keys: string[]) => {
  for (const key of keys) {
    const v = key.split('.').reduce((a: any, p: string) => a?.[p], o);
    if (v !== undefined && v !== null && String(v) !== '') return v;
  }
  return '';
};

const age = (raw: any) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
};

const isDone = (o: any) => ['completed', 'complete', 'success', 'successful', 'done', 'finished'].includes(String(value(o, 'status', 'state')).toLowerCase());

export default function UnifiedServicesPage() {
  const [tab, setTab] = useState('us');
  const [services, setServices] = useState<any[]>([]);
  const [service, setService] = useState('');
  const [price, setPrice] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const logged = Boolean(token());

  const loadOrders = async () => {
    if (!logged) return;
    try {
      const d = await req('/api/fleexa/orders');
      setOrders(Array.isArray(d.orders) ? d.orders : []);
    } catch {}
  };

  useEffect(() => {
    req('/api/fleexa/sms/services')
      .then((d) => {
        const list = Array.isArray(d.services) ? d.services : [];
        setServices(list);
        if (list[0]) setService(list[0].name || list[0].id || '');
      })
      .catch((e) => setMessage(e.message));
  }, []);

  useEffect(() => {
    if (!service || tab !== 'us') return;
    req(`/api/fleexa/sms/prices?service=${encodeURIComponent(service)}`)
      .then((d) => setPrice(Number(d.salePrice || 0)))
      .catch((e) => setMessage(e.message));
  }, [service, tab]);

  useEffect(() => {
    void loadOrders();
    if (!logged) return;
    const id = window.setInterval(() => void loadOrders(), 10000);
    return () => window.clearInterval(id);
  }, [logged]);

  const buyNumber = async () => {
    if (!logged) {
      location.hash = '#/account';
      return;
    }
    setBusy(true);
    try {
      const d = await req('/api/fleexa/sms/buy', 'POST', { service });
      setMessage(`US number ${d.order?.phone || ''} purchased. Waiting for its verification code.`);
      await loadOrders();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    ['us', '🇺🇸 US Number'],
    ['other', '🌍 Other Numbers'],
    ['email', '✉️ Custom Email'],
    ['rent', '📞 Rental'],
    ['esim', '📶 eSIM'],
  ];

  return (
    <main style={page}>
      <div style={wrap}>
        <button onClick={() => (location.hash = '#/home')} style={back}>← FX Socials</button>
        <p style={eyebrow}>FX SOCIALS SERVICES</p>
        <h1 style={title}>Choose what you need.</h1>
        <p style={muted}>Numbers, email, rentals and eSIMs in one place.</p>
        {message && <div style={notice}>{message}<button onClick={() => setMessage('')} style={close}>×</button></div>}
        <div style={tabsStyle}>
          {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} style={{ ...tabButton, ...(tab === id ? active : {}) }}>{label}</button>)}
        </div>

        <section style={card}>
          {tab === 'us' && <>
            <h2>🇺🇸 Buy US Number</h2>
            <p style={muted}>Verification numbers with the FX Socials retail price.</p>
            <label style={label}>Choose service
              <select value={service} onChange={(e) => setService(e.target.value)} style={select}>
                {services.map((s) => <option key={s.id || s.name} value={s.name || s.id}>{s.name || s.id}</option>)}
              </select>
            </label>
            {price > 0 && <div style={priceBox}><span>FX SOCIALS PRICE</span><b>{money(price)}</b></div>}
            <button disabled={busy || !price} onClick={buyNumber} style={primary}>{busy ? 'Processing…' : `Buy US number${price ? ` · ${money(price)}` : ''}`}</button>
          </>}
          {tab !== 'us' && <>
            <h2>{tabs.find((x) => x[0] === tab)?.[1] || 'Services'}</h2>
            <p style={muted}>This service remains available. Choose it from the service options or dashboard to continue.</p>
            <button onClick={() => setMessage('Service options are loading from the connected provider.')} style={primary}>Continue</button>
          </>}
        </section>

        {logged && <section style={{ marginTop: 32 }}>
          <div style={ordersHeader}><div><h2 style={{ margin: 0 }}>Active Orders</h2><p style={{ ...muted, margin: '4px 0 0' }}>Your number purchases and verification codes. Auto-refreshing.</p></div></div>
          <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
            {orders.length ? orders.map((o) => <OrderCard key={o.id || o.order_id || `${value(o, 'phone', 'number')}-${value(o, 'created_at', 'createdAt')}`} order={o} />) : <div style={empty}>No number purchases yet.</div>}
          </div>
        </section>}
      </div>
    </main>
  );
}

function OrderCard({ order: o }: { order: any }) {
  const phone = String(value(o, 'phone', 'number', 'data.phone') || '');
  const code = String(value(o, 'code', 'otp', 'sms_code', 'verification_code', 'data.code') || '');
  const service = String(value(o, 'service_name', 'service', 'app', 'type') || 'WhatsApp');
  const country = String(value(o, 'country_name', 'country', 'country_code') || 'USA');
  const amount = Number(value(o, 'amount', 'price', 'salePrice') || 0);
  const done = isDone(o);
  const copy = async (text: string) => { if (text) await navigator.clipboard?.writeText(text).catch(() => {}); };

  return <article style={orderCard}>
    <div style={orderTop}>
      <div><h3 style={{ margin: 0, fontSize: 22 }}>{service}</h3><div style={muted}>{country} · {age(value(o, 'created_at', 'createdAt', 'created'))}</div></div>
      <div style={{ textAlign: 'right' }}><strong style={{ fontSize: 21 }}>{money(amount)}</strong><div style={done ? doneBadge : waitingBadge}>{done ? 'Completed' : 'Waiting for code'}</div></div>
    </div>
    <div style={detail}><span>{phone || 'Number is being prepared…'}</span>{phone && <button onClick={() => void copy(phone)} style={copyButton}>Copy</button>}</div>
    <div style={detail}><span style={{ fontWeight: 900, letterSpacing: '.08em' }}>{code || 'Waiting for SMS code…'}</span>{code && <button onClick={() => void copy(code)} style={copyButton}>Copy</button>}</div>
    <div style={doneBar}>✓ {done ? 'Done' : 'Auto-refreshing for code'}</div>
  </article>;
}

const page: any = { minHeight: '100vh', background: '#050505', color: '#fff', padding: '24px 18px 70px' };
const wrap: any = { maxWidth: 980, margin: '0 auto' };
const back: any = { border: 0, background: 'transparent', color: '#aaa', fontSize: 15 };
const eyebrow: any = { fontSize: 11, fontWeight: 800, letterSpacing: '.16em', color: '#888', marginTop: 28 };
const title: any = { fontSize: 'clamp(42px, 8vw, 68px)', lineHeight: .98, letterSpacing: '-.055em', margin: '10px 0' };
const muted: any = { color: '#888', lineHeight: 1.5 };
const notice: any = { marginTop: 20, padding: 14, borderRadius: 14, background: '#fff', color: '#111', fontWeight: 700 };
const close: any = { float: 'right', border: 0, background: 'transparent', fontSize: 20 };
const tabsStyle: any = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 28 };
const tabButton: any = { minHeight: 70, border: '1px solid #292929', background: '#0d0d0d', color: '#fff', borderRadius: 16, fontWeight: 900, fontSize: 12 };
const active: any = { border: '2px solid #fff', background: '#fff', color: '#050505' };
const card: any = { marginTop: 18, padding: 20, border: '1px solid #222', borderRadius: 20, background: '#0b0b0b' };
const label: any = { display: 'grid', gap: 8, marginTop: 18, fontWeight: 800 };
const select: any = { width: '100%', padding: 14, borderRadius: 12, border: '1px solid #333', background: '#111', color: '#fff' };
const priceBox: any = { marginTop: 18, padding: 16, borderRadius: 14, background: '#151515', display: 'grid', gap: 5 };
const primary: any = { width: '100%', marginTop: 18, padding: 16, border: 0, borderRadius: 14, background: '#fff', color: '#000', fontWeight: 900 };
const ordersHeader: any = { display: 'flex', alignItems: 'center', gap: 12 };
const orderCard: any = { padding: 18, border: '1px solid #242424', borderRadius: 18, background: '#0b0b0b' };
const orderTop: any = { display: 'flex', justifyContent: 'space-between', gap: 12 };
const detail: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: 14, borderRadius: 12, background: '#151515' };
const copyButton: any = { border: '1px solid #333', background: '#0b0b0b', color: '#fff', borderRadius: 9, padding: '7px 10px' };
const doneBadge: any = { marginTop: 7, padding: '5px 8px', borderRadius: 8, background: '#143d2b', color: '#6fe0a5', fontSize: 12, fontWeight: 800 };
const waitingBadge: any = { marginTop: 7, padding: '5px 8px', borderRadius: 8, background: '#3d3214', color: '#f0c968', fontSize: 12, fontWeight: 800 };
const doneBar: any = { marginTop: 12, color: '#888', fontWeight: 800 };
const empty: any = { padding: 18, border: '1px dashed #333', borderRadius: 14, color: '#777' };
