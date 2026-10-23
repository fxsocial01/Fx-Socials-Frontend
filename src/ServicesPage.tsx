import { useEffect, useMemo, useState } from 'react';

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'https://fx-socials-api.onrender.com';
const money = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const token = () => localStorage.getItem('fxs-session') || '';
const cache = { services: 'fxs-services-cache' };

async function req(path: string, method = 'GET', body?: any, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('Live availability is taking too long. Please tap the selection again to retry.');
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}

const readCache = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeCache = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

type Service = { id: string; name: string };
type Country = { country_code: string; country_name: string; flag?: string; stock: number };
type Server = { server: string; server_name?: string; stock: number; salePrice?: number };
type Product = { id: string; country_code?: string; name: string; description?: string; price: number };
type RentalOrder = { id: string; category: string; amount: number; status: string; provider_payload?: any; customer_payload?: any; created_at: string; updated_at: string };

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
const numberFrom = (o: RentalOrder) => { const p = o.provider_payload || {}; return p.phone_number || p.phoneNumber || p.number || p.msisdn || p.phone || ''; };
const serviceFrom = (o: RentalOrder) => { const p = o.provider_payload || {}; const c = o.customer_payload || {}; return p.service_name || p.service || p.service_code || c.service || 'SMS verification'; };
const countryFrom = (o: RentalOrder) => { const p = o.provider_payload || {}; const c = o.customer_payload || {}; return p.country_name || p.country || p.country_code || c.country || ''; };
const statusLabel = (s: string) => ({ active: 'Waiting for code', received: 'Code received', completed: 'Completed', refunded: 'Refunded', cancelled: 'Cancelled', expired: 'Expired', fulfilling: 'Getting your number', paid: 'Processing' } as any)[s] || s;
const canRefund = (s: string) => ['active', 'received', 'expired'].includes(s);
const statusStyle = (s: string): React.CSSProperties => {
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: 'rgba(245,158,11,.14)', color: '#f59e0b' }, received: { bg: 'rgba(34,197,94,.14)', color: '#22c55e' }, completed: { bg: 'rgba(34,197,94,.14)', color: '#22c55e' }, refunded: { bg: 'rgba(59,130,246,.14)', color: '#60a5fa' }, cancelled: { bg: 'rgba(148,163,184,.14)', color: '#94a3b8' }, expired: { bg: 'rgba(239,68,68,.14)', color: '#f87171' }, fulfilling: { bg: 'rgba(245,158,11,.14)', color: '#f59e0b' }, paid: { bg: 'rgba(245,158,11,.14)', color: '#f59e0b' },
  };
  const v = map[s] || { bg: 'rgba(148,163,184,.14)', color: '#cbd5e1' };
  return { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 999, background: v.bg, color: v.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' };
};

export default function ServicesPage() {
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

  const loadWallet = async () => { if (!logged) return; try { const d = await req('/api/me/wallet', 'POST', { sessionToken: token() }); setWallet(Number(d.wallet?.balance || 0)); } catch {} };
  const loadRentals = async () => { if (!logged) { setRentals([]); return; } try { const d = await req('/api/marketplace/orders'); setRentals((d.orders || []).filter((o: any) => o.category === 'sms')); } catch {} };
  const loadServices = async () => {
    if (services.length) return;
    try { const d = await req('/api/marketplace/live/sms/services'); const list = d.services || []; setServices(list); writeCache(cache.services, list); } catch (e: any) { setMessage(e.message); }
  };
  const loadCountries = async (s: string) => {
    if (!s) { setCountries([]); setCountry(''); setServers([]); setServer(''); return; }
    setLoading(true);
    try {
      const key = `fxs-countries-${s}`; const cached = readCache(key);
      if (cached) { setCountries(cached); setCountry(''); setServers([]); setServer(''); setLoading(false); void refreshCountries(s, key); return; }
      const d = await req(`/api/marketplace/live/sms/countries?service=${encodeURIComponent(s)}`, 'GET', undefined, 8000); const list = d.countries || [];
      setCountries(list); writeCache(key, list); setCountry(''); setServers([]); setServer('');
    } catch (e: any) { setMessage(e.message); } finally { setLoading(false); }
  };
  const refreshCountries = async (s: string, key: string) => { try { const d = await req(`/api/marketplace/live/sms/countries?service=${encodeURIComponent(s)}`, 'GET', undefined, 8000); const list = d.countries || []; writeCache(key, list); setCountries(list); } catch {} };
  const loadServers = async (s: string, c: string) => {
    if (!s || !c) { setServers([]); setServer(''); return; }
    setLoading(true);
    try {
      const key = `fxs-prices-${s}-${c}`;
      const cached = readCache(key);
      if (cached?.servers?.length) {
        setServers(cached.servers);
        setServer('');
        setLoading(false);
        void refreshServers(s, c, key);
        return;
      }
      const d = await req(`/api/marketplace/live/sms/prices?service=${encodeURIComponent(s)}&country=${encodeURIComponent(c)}`, 'GET', undefined, 8000);
      const list = (d.servers || []).filter((x: any) => Number(x.stock || 0) > 0).map((x: any) => ({ server: x.server, server_name: x.server_name, stock: Number(x.stock || 0), salePrice: Number(x.salePrice || 0) }));
      setServers(list); writeCache(key, { servers: list, checkedAt: Date.now() }); setServer('');
    }
    catch (e: any) { setMessage(e.message); setServers([]); }
    finally { setLoading(false); }
  };
  const refreshServers = async (s: string, c: string, key: string) => {
    try {
      const d = await req(`/api/marketplace/live/sms/prices?service=${encodeURIComponent(s)}&country=${encodeURIComponent(c)}`, 'GET', undefined, 8000);
      const list = (d.servers || []).filter((x: any) => Number(x.stock || 0) > 0).map((x: any) => ({ server: x.server, server_name: x.server_name, stock: Number(x.stock || 0), salePrice: Number(x.salePrice || 0) }));
      writeCache(key, { servers: list, checkedAt: Date.now() });
      setServers(list);
    } catch {}
  };
  const loadEsims = async () => { try { const d = await req('/api/marketplace/live/esim/catalog'); setEsims(d.products || []); } catch (e: any) { setMessage(e.message); } };

  useEffect(() => { void loadWallet(); void loadRentals(); void loadServices(); void loadEsims(); }, []);
  useEffect(() => { if (!logged) return; const id = window.setInterval(() => { void loadRentals(); void loadWallet(); }, 5000); return () => window.clearInterval(id); }, [logged]);
  useEffect(() => { if (service) void loadCountries(service); }, [service]);
  useEffect(() => { if (service && country) void loadServers(service, country); }, [service, country]);

  const selected = useMemo(() => servers.find(s => s.server === server), [servers, server]);
  const pay = async () => {
    if (!logged) { location.hash = '#/account'; return; }
    if (!service || !country || !server || !selected) { setMessage('Please select a service, country and number option.'); return; }
    setBusy(true);
    try { const p = await req('/api/marketplace/live/sms/prepare', 'POST', { service, country, server }); const d = await req('/api/marketplace/orders/purchase', 'POST', { productId: p.productId, customer: { service, country, server } }); setWallet(Number(d.walletBalance || 0)); localStorage.setItem('fxs-marketplace-order-id', d.orderId || ''); setMessage('Number purchased successfully. Your order is shown below.'); await loadRentals(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }
    catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  };
  const esimPay = async (p: Product) => {
    if (!logged) { location.hash = '#/account'; return; }
    setBusy(true);
    try { const d = await req('/api/marketplace/orders/purchase', 'POST', { productId: p.id, customer: { category: 'esim', country: p.country_code } }); setWallet(Number(d.walletBalance || 0)); setMessage('eSIM purchased successfully from your FX Socials wallet.'); localStorage.setItem('fxs-marketplace-order-id', d.orderId || ''); }
    catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  };
  const cancelRental = async (id: string) => {
    if (!confirm('Cancel this SMS rental and request the available wallet refund?')) return;
    setCancelling(id);
    try { const d = await req(`/api/marketplace/orders/${id}/cancel`, 'POST'); setMessage(d.message || 'Rental cancelled and wallet refunded.'); await Promise.all([loadRentals(), loadWallet()]); }
    catch (e: any) { setMessage(e.message); } finally { setCancelling(''); }
  };

  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={() => location.hash = '#/home'}><b>FX SOCIALS</b></button><nav><button onClick={() => location.hash = '#/marketplace'}>Buy accounts</button><button onClick={() => location.hash = '#/services'}>Numbers & eSIMs</button><button onClick={() => location.hash = '#/sell'}>Sell an account</button><button onClick={() => location.hash = '#/how'}>How it works</button><button onClick={() => location.hash = '#/support'}>Support</button></nav><div className="top-actions">{logged && <button className="wallet-pill" onClick={() => location.hash = '#/wallet'}>{money(wallet)}</button>}<button className="primary small" onClick={() => location.hash = logged ? '#/dashboard' : '#/account'}>{logged ? 'My account' : 'Login / Register'}</button></div></header>
    <main className="section page">
      <section className="hero services-hero"><div><span className="eyebrow">FX SOCIALS SERVICES</span><h1>Numbers & eSIMs<br /><em>simple, fast, clear.</em></h1><p>Buy a number or eSIM directly from this page. No extra switcher or separate rental selector.</p></div><div className="hero-card"><b>FX SOCIALS PRICING</b><strong>40% markup</strong><p>Provider costs stay private. Your customer sees one simple FX Socials price.</p></div></section>
      {message && <div className="notice">{message}<button onClick={() => setMessage('')}>×</button></div>}

      <section className="form-card service-card"><div className="service-card-head"><div><h2>Buy Number</h2><p>Choose the service, country and available number. Supplier pricing is never displayed.</p></div>{logged && <button className="wallet-pill" onClick={() => location.hash = '#/wallet'}>Wallet {money(wallet)}</button>}</div>
        <div className="service-fields"><label>Social / service<select value={service} onChange={e => setService(e.target.value)}><option value="">Select service</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Country<select value={country} onChange={e => setCountry(e.target.value)} disabled={!service || loading}><option value="">{service ? 'Select country' : 'Select service first'}</option>{countries.map(c => <option key={c.country_code} value={c.country_code}>{c.flag || ''} {c.country_name} · {c.stock} available</option>)}</select></label><label>Number / server<select value={server} onChange={e => setServer(e.target.value)} disabled={!country || loading}><option value="">{country ? 'Select number option' : 'Select country first'}</option>{servers.map(s => <option key={s.server} value={s.server}>{s.server_name || `Server ${s.server}`} · ${money(s.salePrice || 0)} · ${s.stock} available</option>)}</select></label></div>
        {loading && <p className="support-hint">Checking number availability…</p>}{selected && <div className="fx-price"><span>FX SOCIALS PRICE</span><strong>{money(selected.salePrice || 0)}</strong><small>Final customer price · provider price hidden</small></div>}{!loading && country && !servers.length && <div className="empty">No numbers are available for this selection right now.</div>}<button className="primary full" disabled={busy || !selected} onClick={pay}>{busy ? 'Processing…' : `Pay from wallet · ${selected ? money(selected.salePrice || 0) : 'FX Socials price'}`}</button>
      </section>

      <section className="section service-esims"><div className="service-card-head"><div><h2>eSIMs</h2><p>Available eSIM plans are shown directly below. No extra switcher.</p></div></div><div className="product-grid">{esims.length ? esims.map(p => <article className="product" key={p.id}><span className="platform">eSIM · {p.country_code || 'GLOBAL'}</span><h3>{p.name}</h3><p>{p.description || 'Digital eSIM plan.'}</p><div className="product-bottom"><strong>{money(p.price)}</strong><button className="primary small" disabled={busy} onClick={() => esimPay(p)}>Pay from wallet</button></div></article>) : <div className="empty">No eSIM plans are available yet.</div>}</div></section>

      <section className="section service-orders" style={{ overflowX: 'auto' }}><div className="service-card-head" style={{ marginBottom: 14 }}><div><h2>SMS rental history</h2><p>Numbers, codes, statuses and wallet refunds refresh automatically.</p></div>{logged && <button className="outline small" onClick={() => void Promise.all([loadRentals(), loadWallet()])}>Refresh</button>}</div>{!logged ? <div className="empty">Log in to see your number purchases.</div> : rentals.length ? <div style={{ minWidth: 720, border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,.025)' }}><table style={{ width: '100%', borderCollapse: 'collapse', color: '#f8fafc', fontSize: 13 }}><thead><tr style={{ background: 'rgba(255,255,255,.045)', textAlign: 'left' }}>{['Number','Verification Code','Country','Service','Status','Actions'].map(h => <th key={h} style={{ padding: '10px 9px', color: '#94a3b8', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,.08)' }}>{h}</th>)}</tr></thead><tbody>{rentals.map(o => { const code = codeFrom(o); const number = numberFrom(o); return <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}><td style={{ padding: '10px 9px', fontWeight: 800, whiteSpace: 'nowrap' }}>{number || 'Assigning…'}</td><td style={{ padding: '10px 9px' }}><span style={{ display: 'inline-flex', alignItems: 'center', minWidth: 72, justifyContent: 'center', padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,.06)', color: code ? '#f8fafc' : '#64748b', fontWeight: 800 }}>{code || 'N/A'}</span></td><td style={{ padding: '10px 9px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>{countryFrom(o) || '—'}</td><td style={{ padding: '10px 9px', color: '#cbd5e1', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{serviceFrom(o)}</td><td style={{ padding: '10px 9px' }}><span style={statusStyle(o.status)}><span style={{ width: 5, height: 5, borderRadius: 50, background: 'currentColor' }} />{statusLabel(o.status)}</span></td><td style={{ padding: '10px 9px', whiteSpace: 'nowrap' }}>{o.status === 'refunded' ? <span style={{ color: '#60a5fa', fontWeight: 700 }}>{money(o.amount)} returned</span> : canRefund(o.status) ? <button className="danger" disabled={cancelling === o.id} onClick={() => cancelRental(o.id)}>{cancelling === o.id ? 'Refunding…' : 'Cancel & refund'}</button> : <span style={{ color: '#64748b' }}>N/A</span>}</td></tr>; })}</tbody></table></div> : <div className="empty">No SMS number purchases yet.</div>}</section>
      <p className="support-hint service-note">All purchases use your FX Socials wallet. Top up your wallet before buying.</p>
    </main>
  </div>;
}
