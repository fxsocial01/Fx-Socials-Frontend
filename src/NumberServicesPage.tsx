import { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'https://fx-socials-api.onrender.com';
const money = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const token = () => localStorage.getItem('fxs-session') || '';

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

const Spinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="fx-loading"><span className="fx-spinner" /> <span>{label}</span></div>
);

type Mode = 'us' | 'other' | 'email' | 'rent' | 'esim';

const countries = [
  ['NG', '🇳🇬 Nigeria'], ['US', '🇺🇸 United States'], ['GB', '🇬🇧 United Kingdom'], ['CA', '🇨🇦 Canada'],
  ['AU', '🇦🇺 Australia'], ['DE', '🇩🇪 Germany'], ['FR', '🇫🇷 France'], ['ES', '🇪🇸 Spain'],
  ['IT', '🇮🇹 Italy'], ['NL', '🇳🇱 Netherlands'], ['BE', '🇧🇪 Belgium'], ['SE', '🇸🇪 Sweden'],
  ['NO', '🇳🇴 Norway'], ['DK', '🇩🇰 Denmark'], ['FI', '🇫🇮 Finland'], ['CH', '🇨🇭 Switzerland'],
  ['AT', '🇦🇹 Austria'], ['IE', '🇮🇪 Ireland'], ['PT', '🇵🇹 Portugal'], ['PL', '🇵🇱 Poland'],
  ['CZ', '🇨🇿 Czechia'], ['RO', '🇷🇴 Romania'], ['GR', '🇬🇷 Greece'], ['TR', '🇹🇷 Türkiye'],
  ['ZA', '🇿🇦 South Africa'], ['GH', '🇬🇭 Ghana'], ['KE', '🇰🇪 Kenya'], ['UG', '🇺🇬 Uganda'],
  ['TZ', '🇹🇿 Tanzania'], ['IN', '🇮🇳 India'], ['PK', '🇵🇰 Pakistan'], ['BD', '🇧🇩 Bangladesh'],
  ['AE', '🇦🇪 UAE'], ['SA', '🇸🇦 Saudi Arabia'], ['BR', '🇧🇷 Brazil'], ['MX', '🇲🇽 Mexico'],
  ['AR', '🇦🇷 Argentina'], ['CO', '🇨🇴 Colombia'], ['CL', '🇨🇱 Chile'], ['PE', '🇵🇪 Peru'],
];

export default function NumberServicesPage() {
  const [mode, setMode] = useState<Mode>('us');
  const [services, setServices] = useState<any[]>([]);
  const [service, setService] = useState('');
  const [price, setPrice] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [rentApp, setRentApp] = useState('WhatsApp');
  const [months, setMonths] = useState('1');
  const [emailProducts, setEmailProducts] = useState<any[]>([]);
  const [emailSite, setEmailSite] = useState('');
  const [emailDomain, setEmailDomain] = useState('@outlook.com');
  const [emailDomains, setEmailDomains] = useState<any[]>([]);
  const [otherServices, setOtherServices] = useState<any[]>([]);
  const [otherCountry, setOtherCountry] = useState('');
  const [otherService, setOtherService] = useState('');
  const [otherServers, setOtherServers] = useState<any[]>([]);
  const [otherServer, setOtherServer] = useState('');
  const [esims, setEsims] = useState<any[]>([]);
  const [wallet, setWallet] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otherServicesLoading, setOtherServicesLoading] = useState(false);
  const [serversLoading, setServersLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [domainLoading, setDomainLoading] = useState(false);
  const [rentLoading, setRentLoading] = useState(false);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const actionTimer = useRef<number | null>(null);
  const beginAction = (label: string) => { if (actionTimer.current) window.clearTimeout(actionTimer.current); setActionLoading(label); };
  const endAction = () => { if (actionTimer.current) window.clearTimeout(actionTimer.current); actionTimer.current = window.setTimeout(() => setActionLoading(''), 250); };
  useEffect(() => () => { if (actionTimer.current) window.clearTimeout(actionTimer.current); }, []);

  const logged = Boolean(token());

  const loadWallet = async () => {
    if (!logged) return;
    try { const d = await req('/api/me/wallet', 'POST', { sessionToken: token() }); setWallet(Number(d.wallet?.balance || 0)); } catch {}
  };

  const loadOrders = async () => {
    if (!logged) return;
    try { const d = await req('/api/fleexa/orders'); setOrders(d.orders || []); } catch {}
  };

  const loadInitial = async () => {
    setLoading(true);
    try {
      const [f, o, e, email] = await Promise.all([
        req('/api/fleexa/sms/services'),
        req('/api/marketplace/live/sms/services'),
        req('/api/marketplace/live/esim/catalog'),
        req('/api/fleexa/email/products'),
      ]);
      setServices(f.services || []);
      setOtherServices(o.services || []);
      setEsims(e.products || []);
      setEmailProducts(email.products || email.services || []);
    } catch (err: any) {
      setMessage(err.message || 'Could not load digital services.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadWallet(); void loadOrders(); void loadInitial(); }, []);

  const loadPrice = async (s: string) => {
    if (!s) { setPrice(null); return; }
    beginAction('Checking live price…'); setPriceLoading(true); setPrice(null);
    try { setPrice(await req(`/api/fleexa/sms/prices?service=${encodeURIComponent(s)}`)); }
    catch (e: any) { setMessage(e.message); }
    finally { setPriceLoading(false); endAction(); }
  };

  useEffect(() => { if (mode === 'us' && service) void loadPrice(service); }, [mode, service]);

  const loadDomains = async (site: string) => {
    if (!site) { setEmailDomains([]); return; }
    beginAction('Checking available email domains…'); setDomainLoading(true);
    try { const d = await req(`/api/fleexa/email/domains?site=${encodeURIComponent(site)}`); setEmailDomains(d.domains || []); }
    catch (e: any) { setMessage(e.message); }
    finally { setDomainLoading(false); endAction(); }
  };

  useEffect(() => { if (mode === 'email' && emailSite) void loadDomains(emailSite); }, [mode, emailSite]);

  const loadRentAreas = async () => {
    beginAction('Checking live rental availability and prices…'); setRentLoading(true);
    try { const d = await req('/api/fleexa/rent/areas'); setAreas(d.areas || []); }
    catch (e: any) { setMessage(e.message); }
    finally { setRentLoading(false); endAction(); }
  };

  useEffect(() => { if (mode === 'rent' && !areas.length) void loadRentAreas(); }, [mode]);

  // Other Numbers intentionally follows: COUNTRY → SERVICE → SERVER → PRICE.
  const loadOtherServices = async () => {
    beginAction('Loading services for the selected country…'); setOtherServicesLoading(true); setSelectionLoading(true); setOtherService(''); setOtherServer(''); setOtherServers([]);
    try {
      const d = await req('/api/marketplace/live/sms/services');
      setOtherServices(d.services || []);
    } catch (e: any) { setMessage(e.message || 'Could not fetch services.'); }
    finally { setOtherServicesLoading(false); setSelectionLoading(false); endAction(); }
  };

  const loadOtherServers = async (s: string, country: string) => {
    if (!s || !country) return;
    beginAction('Checking available servers and prices…'); setServersLoading(true); setSelectionLoading(true); setOtherServers([]); setOtherServer('');
    try {
      const d = await req(`/api/marketplace/live/sms/prices?service=${encodeURIComponent(s)}&country=${encodeURIComponent(country)}`);
      setOtherServers((d.servers || []).filter((x: any) => Number(x.stock || 0) > 0));
    } catch (e: any) { setMessage(e.message || 'Could not fetch available servers.'); }
    finally { setServersLoading(false); setSelectionLoading(false); endAction(); }
  };

  useEffect(() => {
    if (mode === 'other' && otherCountry) void loadOtherServices();
  }, [mode, otherCountry]);

  useEffect(() => {
    if (mode === 'other' && otherService && otherCountry) void loadOtherServers(otherService, otherCountry);
  }, [mode, otherService, otherCountry]);

  const selectedOther = useMemo(
    () => otherServers.find(x => String(x.server) === String(otherServer)),
    [otherServers, otherServer]
  );

  const requireLogin = () => {
    if (!logged) { location.hash = '#/account'; return false; }
    return true;
  };

  const buy = async () => {
    if (!requireLogin() || !service || !price?.salePrice) return;
    setBusy(true);
    try {
      const d = await req('/api/fleexa/sms/buy', 'POST', { service, maxPrice: price.providerPrice });
      setWallet(Number(d.walletBalance || 0));
      setMessage(`US number ${d.order?.phone || ''} purchased. Waiting for the verification code.`);
      await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); endAction(); }
  };

  const buyEmail = async () => {
    if (!requireLogin() || !emailSite || !emailDomain) return;
    setBusy(true);
    try {
      const d = await req('/api/fleexa/email/buy', 'POST', { site: emailSite, domain: emailDomain });
      setWallet(Number(d.walletBalance || 0)); setMessage(`Email ${d.order?.email || ''} purchased.`); await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); endAction(); }
  };

  const buyRent = async () => {
    if (!requireLogin()) return;
    setBusy(true);
    try {
      const d = await req('/api/fleexa/rent/buy', 'POST', { appName: rentApp, time: months });
      setWallet(Number(d.walletBalance || 0)); setMessage(`Rental ${d.order?.number || ''} purchased until ${d.order?.expire_at || 'the expiry date'}.`); await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const buyOther = async () => {
    if (!requireLogin() || !otherService || !otherCountry || !otherServer) return;
    setBusy(true);
    try {
      const p = await req('/api/marketplace/live/sms/prepare', 'POST', { service: otherService, country: otherCountry, server: otherServer });
      const d = await req('/api/marketplace/orders/purchase', 'POST', { productId: p.productId, customer: { service: otherService, country: otherCountry, server: otherServer } });
      setWallet(Number(d.walletBalance || 0)); setMessage('Other-country number purchased.'); await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const buyEsim = async (p: any) => {
    if (!requireLogin()) return;
    setBusy(true);
    try { const d = await req('/api/marketplace/orders/purchase', 'POST', { productId: p.id, customer: { category: 'esim', country: p.country_code } }); setWallet(Number(d.walletBalance || 0)); setMessage('eSIM purchased successfully.'); }
    catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const tabs: [Mode, string, string][] = [
    ['us', '🇺🇸', 'US Number'], ['other', '🌍', 'Other Numbers'], ['email', '✉️', 'Custom Email'], ['rent', '📞', 'Rental'], ['esim', '📶', 'eSIM'],
  ];

  return (
    <main className="fx-page">
      <div className="fx-wrap">
        <div className="fx-top">
          <button onClick={() => location.hash = '#/home'} className="fx-back">← FX Socials</button>
          {logged && <button onClick={() => location.hash = '#/wallet'} className="fx-wallet">Wallet {money(wallet)}</button>}
        </div>

        <header className="fx-header">
          <div className="fx-eyebrow">FX SOCIALS SERVICES</div>
          <h1>Choose what you need.</h1>
          <p>Numbers, email, rentals and eSIMs — simple and clear.</p>
        </header>

        {(actionLoading || message) && <div className="fx-notice">{actionLoading && <Spinner label={actionLoading} />}{message && <><span>{message}</span><button onClick={() => setMessage('')}>×</button></>}</div>}

        <div className="fx-tabs">
          {tabs.map(([id, icon, text]) => (
            <button key={id} onClick={() => setMode(id)} className={mode === id ? 'fx-tab active' : 'fx-tab'}>
              <span>{icon}</span><b>{text}</b>
            </button>
          ))}
        </div>

        <section className="fx-card">
          {mode === 'us' && <>
            <h2>🇺🇸 US Number</h2>
            <p className="fx-muted">Choose an app, fetch the live price, then buy.</p>
            {loading ? <Spinner label="Fetching US services…" /> : <label>Choose service<select value={service} onChange={e => setService(e.target.value)}><option value="">Choose service</option>{services.map(s => <option key={s.id || s.name} value={s.name || s.id}>{s.name || s.id}</option>)}</select></label>}
            {priceLoading && <Spinner label="Fetching live price…" />}
            {!priceLoading && price && <div className="fx-price"><small>FX SOCIALS PRICE</small><strong>{money(price.salePrice)}</strong><span>per number</span></div>}
            <button disabled={busy || priceLoading || !price} onClick={buy} className="fx-primary">{busy ? 'Getting number…' : priceLoading ? 'Fetching price…' : price ? `Buy US Number · ${money(price.salePrice)}` : 'Choose a service first'}</button>
          </>}

          {mode === 'other' && <>
            <h2>🌍 Other Numbers</h2>
            <p className="fx-muted">Follow the steps in order: country → service → server → price.</p>

            <label>1. Choose country
              <select value={otherCountry} disabled={otherServicesLoading} onChange={e => { const value=e.target.value; setSelectionLoading(Boolean(value)); setOtherServicesLoading(Boolean(value)); setOtherCountry(value); setOtherService(''); setOtherServer(''); setOtherServers([]); }}>
                <option value="">Choose country</option>
                {countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </label>

            {!otherCountry && <div className="fx-hint">Choose a country to start. Services will appear next.</div>}

            {selectionLoading && !otherServicesLoading && !serversLoading && <Spinner label="Preparing your selection…" />}
            {otherCountry && (otherServicesLoading ? <Spinner label="Fetching services…" /> : <label>2. Choose service
              <select value={otherService} onChange={e => { const value=e.target.value; setSelectionLoading(Boolean(value)); setServersLoading(Boolean(value)); setOtherService(value); }} disabled={otherServicesLoading || serversLoading}>
                <option value="">Choose service</option>
                {otherServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>)}

            {otherCountry && otherService && (serversLoading ? <Spinner label="Fetching servers and prices…" /> : otherServers.length > 0 ? <label>3. Choose server
              <select value={otherServer} onChange={e => setOtherServer(e.target.value)} disabled={serversLoading}>
                <option value="">Choose server</option>
                {otherServers.map(s => <option key={s.server} value={s.server}>{s.server_name || `Server ${s.server}`} · {Number(s.stock || 0)} in stock</option>)}
              </select>
            </label> : <div className="fx-empty">No available server was returned for this country and service. Try another service.</div>)}

            {selectedOther && <div className="fx-price fx-price-large"><small>4. FX SOCIALS PRICE</small><strong>{money(selectedOther.salePrice)}</strong><span>{selectedOther.server_name || `Server ${selectedOther.server}`} · {Number(selectedOther.stock || 0)} in stock</span></div>}

            <button disabled={busy || serversLoading || !selectedOther} onClick={buyOther} className="fx-primary">
              {busy ? 'Processing…' : selectedOther ? `Buy Number · ${money(selectedOther.salePrice)}` : 'Choose a server first'}
            </button>
          </>}

          {mode === 'email' && <>
            <h2>✉️ Custom Email</h2><p className="fx-muted">Choose the service and then a live email domain.</p>
            {loading ? <Spinner label="Fetching email services…" /> : <label>Choose service<select value={emailSite} onChange={e => setEmailSite(e.target.value)}><option value="">Choose service</option>{emailProducts.map(p => <option key={p.id || p.site || p.name} value={p.site || p.name}>{p.name || p.site}</option>)}</select></label>}
            {domainLoading && <Spinner label="Fetching email domains…" />}
            {!domainLoading && emailSite && <label>Choose domain<select value={emailDomain} onChange={e => setEmailDomain(e.target.value)}>{(emailDomains.length ? emailDomains : ['@outlook.com']).map((d: any) => <option key={d.domain || d} value={d.domain || d}>{d.domain || d}</option>)}</select></label>}
            <button disabled={busy || domainLoading || !emailSite} onClick={buyEmail} className="fx-primary">{busy ? 'Getting email…' : domainLoading ? 'Fetching domain…' : 'Buy custom email'}</button>
          </>}

          {mode === 'rent' && <>
            <h2>📞 Rental Number</h2><p className="fx-muted">Choose the app and rental period.</p>
            <label>Service<select value={rentApp} onChange={e => setRentApp(e.target.value)}><option>WhatsApp</option><option>Telegram</option><option>Google</option><option>Instagram</option><option>All access</option></select></label>
            <label>Rental period<select value={months} onChange={e => setMonths(e.target.value)}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} month{i ? 's' : ''}</option>)}</select></label>
            {rentLoading ? <Spinner label="Fetching rental availability…" /> : areas.length > 0 ? <div className="fx-list">{areas.slice(0, 6).map((a: any) => <div className="fx-row" key={a.id || a.area_code || a.name}><span>{a.name || a.area_code || 'Available number'}</span><b>{money(Number(a.price_ngn || a.rate || a.price || 0) * 1.4)}</b></div>)}</div> : <div className="fx-empty">No rental availability returned yet.</div>}
            <button disabled={busy || rentLoading} onClick={buyRent} className="fx-primary">{busy ? 'Getting rental…' : 'Buy rental number'}</button>
          </>}

          {mode === 'esim' && <>
            <h2>📶 eSIM</h2><p className="fx-muted">Available eSIM plans.</p>
            {loading ? <Spinner label="Fetching eSIM plans…" /> : <div className="fx-list">{esims.length ? esims.map(p => <div className="fx-product" key={p.id}><b>{p.name}</b><span>{p.description || ''}</span><button onClick={() => buyEsim(p)} className="fx-primary">Buy eSIM · {money(p.price)}</button></div>) : <div className="fx-empty">No eSIM plans are configured yet.</div>}</div>}
          </>}
        </section>

        {orders.length > 0 && <section className="fx-orders"><h2>Recent orders</h2>{orders.map(o => <div className="fx-order" key={o.id}>{o.type} · {o.phone || o.email || o.number || 'Processing'} · {money(o.amount)} · {o.status}</div>)}</section>}
      </div>

      <style>{`
        *{box-sizing:border-box}.fx-page{min-height:100vh;background:#050505;color:#fff;padding:18px 0 70px;font-family:inherit}.fx-wrap{width:min(940px,100%);margin:auto;padding:0 18px}.fx-top{display:flex;justify-content:space-between;align-items:center;gap:12px}.fx-back,.fx-wallet,.fx-notice button{border:0;background:transparent;color:#aaa}.fx-back{font-size:16px;padding:10px 0}.fx-wallet{background:#111;border:1px solid #292929;border-radius:999px;padding:10px 14px;color:#fff;font-weight:800}.fx-header{padding:28px 0 18px}.fx-eyebrow{font-size:11px;letter-spacing:.16em;font-weight:900;color:#777}.fx-header h1{font-size:clamp(40px,8vw,64px);line-height:1;letter-spacing:-.055em;margin:9px 0}.fx-header p,.fx-muted{color:#888;margin:0;line-height:1.55}.fx-notice{margin:12px 0;padding:13px 15px;border:1px solid #303030;border-radius:13px;background:#111;display:flex;justify-content:space-between;gap:12px;font-size:14px}.fx-notice button{font-size:22px;padding:0;cursor:pointer}.fx-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0 14px}.fx-tab{min-height:68px;border:1px solid #292929;border-radius:15px;background:#0d0d0d;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:12px;cursor:pointer}.fx-tab span{font-size:19px}.fx-tab.active{background:#fff;color:#050505;border-color:#fff}.fx-card{border:1px solid #292929;border-radius:20px;background:#0b0b0b;padding:20px}.fx-card h2{font-size:24px;margin:0 0 7px;letter-spacing:-.02em}.fx-card label{display:block;margin-top:18px;color:#aaa;font-size:14px;font-weight:700}.fx-card select{display:block;width:100%;height:52px;margin-top:7px;padding:0 14px;border:1px solid #333;border-radius:13px;background:#151515;color:#fff;font-size:16px;outline:none}.fx-card select:focus{border-color:#777}.fx-loading{display:flex;align-items:center;gap:10px;margin-top:15px;padding:14px 15px;border:1px solid #292929;border-radius:13px;background:#101010;color:#aaa}.fx-spinner{width:17px;height:17px;border:2px solid #3b3b3b;border-top-color:#fff;border-radius:50%;display:inline-block;animation:fxspin .75s linear infinite;flex:0 0 auto}.fx-hint,.fx-empty{margin-top:14px;padding:13px 14px;border-radius:12px;background:#111;border:1px solid #292929;color:#777;font-size:14px;line-height:1.45}.fx-price{margin-top:16px;padding:17px;border-radius:14px;background:#151515;border:1px solid #292929;display:flex;flex-direction:column;gap:3px}.fx-price small{color:#999;font-weight:800;letter-spacing:.08em}.fx-price strong{font-size:29px;letter-spacing:-.03em}.fx-price span{color:#777;font-size:13px}.fx-price-large{margin-top:18px}.fx-primary{width:100%;min-height:52px;margin-top:17px;border:0;border-radius:13px;background:#fff;color:#050505;font-size:15px;font-weight:900;padding:12px 15px;cursor:pointer}.fx-primary:disabled{opacity:.42;cursor:not-allowed}.fx-list{display:grid;gap:9px;margin-top:15px}.fx-row{padding:13px;border:1px solid #292929;border-radius:12px;display:flex;justify-content:space-between;gap:10px}.fx-product{padding:15px;border:1px solid #292929;border-radius:14px;display:grid;gap:8px}.fx-product span{color:#777;font-size:14px;line-height:1.45}.fx-orders{margin-top:22px}.fx-order{margin-top:8px;padding:12px;border:1px solid #292929;border-radius:12px;background:#0b0b0b;color:#aaa;font-size:13px}@keyframes fxspin{to{transform:rotate(360deg)}}@media(max-width:760px){.fx-tabs{grid-template-columns:repeat(2,1fr)}.fx-tab:last-child{grid-column:span 2}.fx-card{padding:17px}.fx-header{padding-top:22px}.fx-header h1{font-size:43px}}
      `}</style>
    </main>
  );
}
