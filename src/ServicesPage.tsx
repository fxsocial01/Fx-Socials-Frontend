import { useEffect, useMemo, useState } from 'react';

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'https://fx-socials-api.onrender.com';
const money = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const token = () => localStorage.getItem('fxs-session') || '';
const cache = { services: 'fxs-services-cache' };

async function req(path: string, method = 'GET', body?: any) {
  const r = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

const readCache = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeCache = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

type Service = { id: string; name: string };
type Country = { country_code: string; country_name: string; flag?: string; stock: number };
type Server = { server: string; server_name?: string; stock: number; salePrice?: number };
type Product = { id: string; country_code?: string; name: string; description?: string; price: number };
type RentalOrder = { id: string; category: string; provider_order_id?: string; amount: number; status: string; provider_payload?: any; customer_payload?: any; created_at: string; updated_at: string };

const codeFrom = (o: RentalOrder) => {
  const p = o.provider_payload || {};
  const direct = p.code || p.otp || p.sms_code || p.verification_code || p.verificationCode;
  if (direct) return String(direct);
  if (Array.isArray(p.messages) && p.messages.length) {
    const last = p.messages[p.messages.length - 1];
    return String(last?.code || last?.otp || last?.text || '');
  }
  if (typeof p.sms === 'string') return p.sms;
  return '';
};

const numberFrom = (o: RentalOrder) => {
  const p = o.provider_payload || {};
  return p.phone_number || p.phoneNumber || p.number || p.msisdn || p.phone || '';
};

const serviceFrom = (o: RentalOrder) => {
  const p = o.provider_payload || {};
  const c = o.customer_payload || {};
  return p.service_name || p.service || p.service_code || c.service || 'SMS verification';
};

const countryFrom = (o: RentalOrder) => {
  const p = o.provider_payload || {};
  const c = o.customer_payload || {};
  return p.country_name || p.country || p.country_code || c.country || '';
};

const statusLabel = (s: string) => ({
  active: 'Waiting for code', received: 'Code received', completed: 'Completed', refunded: 'Refunded',
  cancelled: 'Cancelled', expired: 'Expired', fulfilling: 'Getting your number', paid: 'Processing',
} as any)[s] || s;

const canRefund = (s: string) => ['active', 'received', 'expired'].includes(s);

export default function ServicesPage() {
  const [tab, setTab] = useState<'buy' | 'rent' | 'esim'>('rent');
  const [services, setServices] = useState<Service[]>(() => readCache(cache.services) || []);
  const [countries, setCountries] = useState<Country[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [service, setService] = useState('');
  const [country, setCountry] = useState('');
  const [server, setServer] = useState('');
  const [esims, setEsims] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [wallet, setWallet] = useState(0);
  const [rentals, setRentals] = useState<RentalOrder[]>([]);
  const [cancelling, setCancelling] = useState('');
  const logged = Boolean(token());

  const loadWallet = async () => {
    if (!logged) return;
    try { const d = await req('/api/me/wallet', 'POST', { sessionToken: token() }); setWallet(Number(d.wallet?.balance || 0)); } catch {}
  };

  const loadRentals = async () => {
    if (!logged) { setRentals([]); return; }
    try {
      const d = await req('/api/marketplace/orders');
      setRentals((d.orders || []).filter((o: any) => o.category === 'sms'));
    } catch {}
  };

  const loadServices = async () => {
    if (services.length) return;
    try {
      const d = await req('/api/marketplace/live/sms/services');
      const list = d.services || [];
      setServices(list); writeCache(cache.services, list);
    } catch (e: any) { setMessage(e.message); }
  };

  const loadCountries = async (s: string) => {
    if (!s) { setCountries([]); setCountry(''); setServers([]); setServer(''); return; }
    setLoading(true);
    try {
      const key = `fxs-countries-${s}`;
      const cached = readCache(key);
      if (cached) {
        setCountries(cached); setCountry(''); setServers([]); setServer(''); setLoading(false); void refreshCountries(s, key); return;
      }
      const d = await req(`/api/marketplace/live/sms/countries?service=${encodeURIComponent(s)}`);
      const list = d.countries || [];
      setCountries(list); writeCache(key, list); setCountry(''); setServers([]); setServer('');
    } catch (e: any) { setMessage(e.message); } finally { setLoading(false); }
  };

  const refreshCountries = async (s: string, key: string) => {
    try { const d = await req(`/api/marketplace/live/sms/countries?service=${encodeURIComponent(s)}`); const list = d.countries || []; writeCache(key, list); setCountries(list); } catch {}
  };

  const loadServers = async (s: string, c: string) => {
    if (!s || !c) { setServers([]); setServer(''); return; }
    setLoading(true);
    try {
      const d = await req(`/api/marketplace/live/sms/prices?service=${encodeURIComponent(s)}&country=${encodeURIComponent(c)}`);
      setServers((d.servers || []).filter((x: any) => Number(x.stock || 0) > 0).map((x: any) => ({ server: x.server, server_name: x.server_name, stock: Number(x.stock || 0), salePrice: Number(x.salePrice || 0) })));
      setServer('');
    } catch (e: any) { setMessage(e.message); setServers([]); } finally { setLoading(false); }
  };

  const loadEsims = async () => {
    setLoading(true);
    try { const d = await req('/api/marketplace/live/esim/catalog'); setEsims(d.products || []); } catch (e: any) { setMessage(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { void loadWallet(); void loadRentals(); if (tab === 'esim') void loadEsims(); else void loadServices(); }, [tab]);
  useEffect(() => { if (!logged) return; const id = window.setInterval(() => void loadRentals(), 5000); return () => window.clearInterval(id); }, [logged]);
  useEffect(() => { if (tab !== 'esim' && service) void loadCountries(service); }, [service]);
  useEffect(() => { if (tab !== 'esim' && service && country) void loadServers(service, country); }, [service, country]);

  const selected = useMemo(() => servers.find(s => s.server === server), [servers, server]);

  const pay = async () => {
    if (!logged) { location.hash = '#/account'; return; }
    if (!service || !country || !server || !selected) { setMessage('Please select a service, country and number option.'); return; }
    setBusy(true);
    try {
      const p = await req('/api/marketplace/live/sms/prepare', 'POST', { service, country, server });
      const d = await req('/api/marketplace/orders/purchase', 'POST', { productId: p.productId, customer: { service, country, server } });
      setWallet(Number(d.walletBalance || 0));
      localStorage.setItem('fxs-marketplace-order-id', d.orderId || '');
      setMessage('Number purchased successfully. Your order is shown below.');
      await loadRentals();
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  };

  const esimPay = async (p: Product) => {
    if (!logged) { location.hash = '#/account'; return; }
    setBusy(true);
    try {
      const d = await req('/api/marketplace/orders/purchase', 'POST', { productId: p.id, customer: { category: 'esim', country: p.country_code } });
      setWallet(Number(d.walletBalance || 0)); setMessage('eSIM purchased successfully from your FX Socials wallet.');
      localStorage.setItem('fxs-marketplace-order-id', d.orderId || '');
    } catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  };

  const cancelRental = async (id: string) => {
    if (!confirm('Cancel this SMS rental and request the available wallet refund?')) return;
    setCancelling(id);
    try {
      const d = await req(`/api/marketplace/orders/${id}/cancel`, 'POST');
      setMessage(d.message || 'Rental cancelled and wallet refunded.');
      await Promise.all([loadRentals(), loadWallet()]);
    } catch (e: any) { setMessage(e.message); } finally { setCancelling(''); }
  };

  const rentalSection = tab !== 'esim' ? (
    <section className="section service-orders">
      <div className="service-card-head">
        <div><h2>My number purchases</h2><p>Only your SMS number purchases are shown here. Status and codes refresh automatically.</p></div>
        {logged && <button className="outline small" onClick={() => void loadRentals()}>Refresh</button>}
      </div>
      {!logged ? <div className="empty">Log in to see your number purchases.</div> : rentals.length ? rentals.map(o => {
        const code = codeFrom(o);
        const number = numberFrom(o);
        return (
          <article className="product rental-order" key={o.id}>
            <div className="service-card-head">
              <div><span className="platform">{countryFrom(o) || 'SMS'} · {serviceFrom(o)}</span><h3>{number || 'Number being assigned…'}</h3></div>
              <strong>{money(o.amount)}</strong>
            </div>
            <p>Order ID: <b>{o.id}</b></p>
            <p>Status: <b>{statusLabel(o.status)}</b></p>
            <div className="fx-price"><span>PURCHASED NUMBER</span><strong>{number || 'Waiting for number…'}</strong></div>
            <div className="fx-price"><span>VERIFICATION CODE</span><strong>{code || 'Waiting for code…'}</strong>{!code && <small>This updates automatically when the provider receives the SMS.</small>}</div>
            <div className="hero-actions">
              {canRefund(o.status) ? <button className="danger" disabled={cancelling === o.id} onClick={() => cancelRental(o.id)}>{cancelling === o.id ? 'Cancelling…' : 'Cancel & request refund'}</button> : o.status === 'refunded' ? <span className="support-hint"><b>Refunded</b> · wallet credited</span> : <span className="support-hint">{statusLabel(o.status)}</span>}
            </div>
          </article>
        );
      }) : <div className="empty">No SMS number purchases yet.</div>}
    </section>
  ) : null;

  const purchaseSection = tab !== 'esim' ? (
    <>
      <section className="form-card service-card">
        <div className="service-card-head"><div><h2>{tab === 'buy' ? 'Buy Number' : 'Rent Number'}</h2><p>Live availability is checked in the background. Supplier pricing is never displayed.</p></div>{logged && <button className="wallet-pill" onClick={() => location.hash = '#/wallet'}>Wallet {money(wallet)}</button>}</div>
        <div className="service-fields">
          <label>Social / service<select value={service} onChange={e => setService(e.target.value)}><option value="">Select service</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Country<select value={country} onChange={e => setCountry(e.target.value)} disabled={!service || loading}><option value="">{service ? 'Select country' : 'Select service first'}</option>{countries.map(c => <option key={c.country_code} value={c.country_code}>{c.flag || ''} {c.country_name} · {c.stock} available</option>)}</select></label>
          <label>Number / server<select value={server} onChange={e => setServer(e.target.value)} disabled={!country || loading}><option value="">{country ? 'Select number option' : 'Select country first'}</option>{servers.map(s => <option key={s.server} value={s.server}>{s.server_name || `Server ${s.server}`} · {money(s.salePrice || 0)} · {s.stock} available</option>)}</select></label>
        </div>
        {loading && <p className="support-hint">Checking live availability…</p>}
        {selected && <div className="fx-price"><span>FX SOCIALS PRICE</span><strong>{money(selected.salePrice || 0)}</strong><small>Final customer price · provider price hidden</small></div>}
        {!loading && country && !servers.length && <div className="empty">No numbers are available for this selection right now.</div>}
        <button className="primary full" disabled={busy || !selected} onClick={pay}>{busy ? 'Processing…' : `Pay from wallet · ${selected ? money(selected.salePrice || 0) : 'FX Socials price'}`}</button>
      </section>
      {services.length > 0 && <section className="section service-popular"><h2>Available services</h2><div className="platform-selector">{services.slice(0, 30).map(s => <button key={s.id} className={service === s.id ? 'chosen' : ''} onClick={() => setService(s.id)}>{s.name}</button>)}</div></section>}
    </>
  ) : (
    <section className="product-grid service-esims">
      {esims.length ? esims.map(p => <article className="product" key={p.id}><span className="platform">eSIM · {p.country_code || 'GLOBAL'}</span><h3>{p.name}</h3><p>{p.description || 'Digital eSIM plan.'}</p><div className="product-bottom"><strong>{money(p.price)}</strong><button className="primary small" disabled={busy} onClick={() => esimPay(p)}>Pay from wallet</button></div></article>) : <div className="empty">No eSIM plans are available yet.</div>}
    </section>
  );

  return (
    <div className="app-shell">
      <header className="topbar"><button className="brand" onClick={() => location.hash = '#/home'}><b>FX SOCIALS</b></button><nav><button onClick={() => location.hash = '#/marketplace'}>Buy accounts</button><button onClick={() => location.hash = '#/services'}>Numbers & eSIMs</button><button onClick={() => location.hash = '#/sell'}>Sell an account</button><button onClick={() => location.hash = '#/how'}>How it works</button><button onClick={() => location.hash = '#/support'}>Support</button></nav><div className="top-actions">{logged && <button className="wallet-pill" onClick={() => location.hash = '#/wallet'}>{money(wallet)}</button>}<button className="primary small" onClick={() => location.hash = logged ? '#/dashboard' : '#/account'}>{logged ? 'My account' : 'Login / Register'}</button></div></header>
      <main className="section page">
        <section className="hero services-hero"><div><span className="eyebrow">FX SOCIALS SERVICES</span><h1>Numbers & eSIMs<br /><em>simple, fast, clear.</em></h1><p>Choose a service, country and available number. Customers see only the final FX Socials price.</p></div><div className="hero-card"><b>FX SOCIALS PRICING</b><strong>40% markup</strong><p>Provider costs stay private. Your customer sees one simple FX Socials price.</p></div></section>
        {message && <div className="notice">{message}<button onClick={() => setMessage('')}>×</button></div>}
        <div className="platform-selector service-tabs"><button className={tab === 'buy' ? 'chosen' : ''} onClick={() => setTab('buy')}>Buy Number</button><button className={tab === 'rent' ? 'chosen' : ''} onClick={() => setTab('rent')}>Rent Number</button><button className={tab === 'esim' ? 'chosen' : ''} onClick={() => setTab('esim')}>eSIMs</button></div>
        {purchaseSection}
        {rentalSection}
        <p className="support-hint service-note">All purchases use your FX Socials wallet. Top up your wallet before buying.</p>
      </main>
    </div>
  );
}
