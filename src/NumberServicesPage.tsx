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
  if (!r.ok) { if (r.status === 401 && token()) { localStorage.removeItem('fxs-session'); localStorage.removeItem('fxs-user'); throw new Error('Your FX Socials session has expired. Please log in again, then retry your purchase.'); } throw new Error(d.error || 'Request failed'); }
  return d;
}

const Spinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="fx-loading"><span className="fx-spinner" /> <span>{label}</span></div>
);

type Mode = 'us' | 'other' | 'email' | 'rent' | 'esim' | 'proxy' | 'cards';

type SearchChoice = { value: string; label: string; };
function SearchableChoice({ label, value, placeholder, searchPlaceholder, options, onChange, disabled = false }: {
  label: string; value: string; placeholder: string; searchPlaceholder: string;
  options: SearchChoice[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const filtered = options.filter(option => option.label.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = options.find(option => option.value === value);
  return <div className="fx-search-choice" ref={root}>
    <span className="fx-choice-label">{label}</span>
    <button type="button" className="fx-choice-trigger" disabled={disabled} aria-expanded={open} onClick={() => { setOpen(current => !current); setQuery(''); }}>
      <span className={selected ? 'is-selected' : 'is-placeholder'}>{selected?.label || placeholder}</span>
      <span className="fx-choice-chevron">⌄</span>
    </button>
    {open && <div className="fx-choice-menu">
      <input autoFocus type="search" className="fx-choice-search" value={query} onChange={event => setQuery(event.target.value)} placeholder={searchPlaceholder} />
      <div className="fx-choice-options">
        {filtered.length ? filtered.map(option => <button type="button" key={option.value} className={option.value === value ? 'fx-choice-option active' : 'fx-choice-option'} onClick={() => { onChange(option.value); setOpen(false); setQuery(''); }}>
          <span>{option.label}</span>{option.value === value && <span aria-hidden="true">✓</span>}
        </button>) : <div className="fx-choice-empty">No matching results</div>}
      </div>
    </div>}
  </div>;
}


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
  const [otherCountries, setOtherCountries] = useState<any[]>([]);
  const [otherService, setOtherService] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [otherServiceSearch, setOtherServiceSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [rentServices, setRentServices] = useState<any[]>([]);
  const [rentCountries, setRentCountries] = useState<any[]>([]);
  const [rentServiceSearch, setRentServiceSearch] = useState('');
  const [rentCountrySearch, setRentCountrySearch] = useState('');
  const [rentService, setRentService] = useState('');
  const [rentCountry, setRentCountry] = useState('');
  const [rentServers, setRentServers] = useState<any[]>([]);
  const [rentServer, setRentServer] = useState('');
  const [proxies, setProxies] = useState<any[]>([]);
  const [proxyCountries, setProxyCountries] = useState<any[]>([]);
  const [proxyCountry, setProxyCountry] = useState('');
  const [proxyCountrySearch, setProxyCountrySearch] = useState('');
  const [proxyPlan, setProxyPlan] = useState('');
  const [proxyType, setProxyType] = useState('2');
  const [cardAvailability, setCardAvailability] = useState<any>(null);
  const [otherServers, setOtherServers] = useState<any[]>([]);
  const [otherServer, setOtherServer] = useState('');
  const [otherServerSearch, setOtherServerSearch] = useState('');
  const [esims, setEsims] = useState<any[]>([]);
  const [wallet, setWallet] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
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
    if (!token()) { setOrders([]); return; }
    setOrdersLoading(true);
    const [historyResult, rentalsResult, fleexaResult] = await Promise.allSettled([
      req('/api/transactions'),
      req('/api/marketplace/orders'),
      req('/api/fleexa/orders'),
    ]);
    const history = historyResult.status === 'fulfilled' ? (historyResult.value.transactions || []) : [];
    const rentals = rentalsResult.status === 'fulfilled' ? (rentalsResult.value.orders || []) : [];
    const fleexaOrders = fleexaResult.status === 'fulfilled' ? (fleexaResult.value.orders || []) : [];
    const byId = new Map<string, any>();
    history.forEach((order: any) => byId.set(String(order.id), order));
    // Provider-synced rental data is authoritative for the number, live status and incoming OTP.
    rentals.forEach((order: any) => byId.set(String(order.id), {
      ...(byId.get(String(order.id)) || {}),
      ...order,
      source: order.provider || 'SocioSMS',
      category: 'sms',
      phone: order.provider_payload?.phone || order.provider_payload?.number || order.phone,
      provider_payload: order.provider_payload || {},
      amount: order.amount ?? Number(order.amount_kobo || 0) / 100,
    }));
    // Fleexa's order endpoint now checks active SMS requests and returns any OTP received.
    fleexaOrders.forEach((order: any) => byId.set(String(order.id), {
      ...(byId.get(String(order.id)) || {}),
      ...order,
      source: 'Fleexa',
      category: order.type || 'sms',
      phone: order.phone || order.provider_payload?.number || order.provider_payload?.phone,
      provider_payload: order.provider_payload || {},
      amount: order.amount ?? Number(order.amount_kobo || 0) / 100,
    }));
    const merged = [...byId.values()].sort((a, b) =>
      new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime()
    );
    setOrders(merged.slice(0, 50));
    if (historyResult.status === 'rejected' || rentalsResult.status === 'rejected' || fleexaResult.status === 'rejected') {
      const failure = historyResult.status === 'rejected' ? historyResult.reason : rentalsResult.status === 'rejected' ? rentalsResult.reason : null;
      if (!merged.length) setMessage(failure?.message || 'Could not load transaction history.');
    }
    setOrdersLoading(false);
  };

  const loadInitial = async () => {
    beginAction('Connecting to digital services…'); setLoading(true);
    try {
      const results = await Promise.allSettled([
        req('/api/fleexa/sms/services'),
        req('/api/marketplace/live/sms/services'),
        req('/api/marketplace/live/esim/catalog'),
        req('/api/fleexa/email/products'),
      ]);
      const [f, o, e, email] = results.map(x => x.status === 'fulfilled' ? x.value : null);
      if (f) setServices(f.services || []);
      if (o) setOtherServices(o.services || []);
      if (e) setEsims(e.products || []);
      if (email) setEmailProducts(email.products || email.services || []);
      const failed = results.find(x => x.status === 'rejected') as PromiseRejectedResult | undefined;
      if (failed && !f && !o && !e && !email) throw failed.reason;
      if (!f || !o) setMessage('Some provider catalogs could not load. Check provider API configuration and try again.');
    } catch (err: any) {
      setMessage(err.message || 'Could not load digital services.');
    } finally { setLoading(false); endAction(); }
  };

  useEffect(() => { void loadWallet(); void loadOrders(); void loadInitial(); }, []);

  const hasActiveSmsOrders = orders.some((order: any) =>
    order.category === 'sms' && ['active', 'received', 'waiting', 'fulfilling', 'paid', 'pending'].includes(String(order.status || '').toLowerCase()) &&
    Boolean(order.provider_order_id || order.order_reference)
  );
  useEffect(() => {
    if (!logged || !hasActiveSmsOrders) return;
    const timer = window.setInterval(() => { void loadOrders(); }, 5000);
    return () => window.clearInterval(timer);
  }, [logged, hasActiveSmsOrders]);

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
    try {
      const d = await req('/api/marketplace/live/sms/services');
      setRentServices(d.services || []);
      setAreas([]);
    }
    catch (e: any) { setMessage(e.message); }
    finally { setRentLoading(false); endAction(); }
  };

  useEffect(() => { if (mode === 'rent' && !rentServices.length) void loadRentAreas(); }, [mode]);

  const loadRentCountries = async (s: string) => {
    if (!s) { setRentCountries([]); return; }
    setRentLoading(true);
    try { const d = await req(`/api/marketplace/live/sms/countries?service=${encodeURIComponent(s)}`); setRentCountries(d.countries || []); }
    catch (e: any) { setMessage(e.message || 'Could not load rental countries.'); }
    finally { setRentLoading(false); }
  };

  const loadRentServers = async (s: string, country: string) => {
    if (!s || !country) { setRentServers([]); return; }
    setRentLoading(true);
    try { const d = await req(`/api/marketplace/live/sms/prices?service=${encodeURIComponent(s)}&country=${encodeURIComponent(country)}`); setRentServers((d.servers || []).filter((x: any) => Number(x.stock || 0) > 0)); }
    catch (e: any) { setMessage(e.message || 'Could not load rental stock.'); }
    finally { setRentLoading(false); }
  };

  useEffect(() => { if (mode === 'rent' && rentService) void loadRentCountries(rentService); }, [mode, rentService]);
  useEffect(() => { if (mode === 'rent' && rentService && rentCountry) void loadRentServers(rentService, rentCountry); }, [mode, rentService, rentCountry]);

  const loadProxyCatalog = async () => {
    setRentLoading(true);
    try { const d = await req('/api/fleexa/proxy/plans'); setProxies(d.plans || []); setProxyCountries(d.countries || []); }
    catch (e: any) { setMessage(e.message || 'Could not load proxy plans.'); }
    finally { setRentLoading(false); }
  };
  useEffect(() => { if (mode === 'proxy' && !proxies.length) void loadProxyCatalog(); }, [mode]);

  // SocioSMS requires SERVICE → COUNTRY → SERVER. Use its live catalog rather than a hard-coded country list.
  const loadOtherCountries = async (s: string) => {
    if (!s) { setOtherCountries([]); return; }
    beginAction('Loading countries for this service…'); setOtherServicesLoading(true); setOtherCountries([]); setOtherCountry(''); setOtherServer(''); setOtherServers([]);
    try {
      const d = await req(`/api/marketplace/live/sms/countries?service=${encodeURIComponent(s)}`);
      setOtherCountries(d.countries || []);
    } catch (e: any) { setMessage(e.message || 'Could not fetch countries for this service.'); }
    finally { setOtherServicesLoading(false); endAction(); }
  };

  const loadOtherServices = async () => {
    beginAction('Loading all SocioSMS services…'); setOtherServicesLoading(true);
    try {
      const d = await req('/api/marketplace/live/sms/services');
      setOtherServices(d.services || []);
    } catch (e: any) { setMessage(e.message || 'Could not fetch services.'); }
    finally { setOtherServicesLoading(false); endAction(); }
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
    if (mode === 'other' && !otherServices.length) void loadOtherServices();
  }, [mode]);

  useEffect(() => {
    if (mode === 'other' && otherService) void loadOtherCountries(otherService);
  }, [mode, otherService]);

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
    beginAction('Request sent — reserving your US number…'); setBusy(true);
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
    beginAction('Creating your email order…'); setBusy(true);
    try {
      const d = await req('/api/fleexa/email/buy', 'POST', { site: emailSite, domain: emailDomain });
      setWallet(Number(d.walletBalance || 0)); setMessage(`Email ${d.order?.email || ''} purchased.`); await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); endAction(); }
  };

  const buyRent = async () => {
    if (!requireLogin() || !rentService || !rentCountry || !rentServer) return;
    beginAction('Contacting SocioSMS to reserve your rental…'); setBusy(true);
    try {
      // Prepare/sync the selected SocioSMS product before the wallet-backed rental purchase.
      const prepared = await req('/api/marketplace/live/sms/prepare', 'POST', { service: rentService, country: rentCountry, server: rentServer });
      if (!prepared.productId) throw new Error('Could not prepare this rental option. Please refresh availability and try again.');
      const d = await req('/api/marketplace/live/sms/rentals', 'POST', { service: rentService, country: rentCountry, server: rentServer });
      setWallet(Number(d.walletBalance || 0)); setMessage(`Rental number ${d.rental?.phone || d.rental?.number || ''} purchased.`); await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); endAction(); }
  };

  const buyProxy = async () => {
    if (!requireLogin() || !proxyPlan || !proxyCountry) return;
    beginAction('Creating your Fleexa proxy order…'); setBusy(true);
    try { const d = await req('/api/fleexa/proxy/order', 'POST', { planId: proxyPlan, country: proxyCountry, proxyType: Number(proxyType) }); setWallet(Number(d.walletBalance || 0)); setMessage('Proxy order created. Your proxy details are available in your orders.'); await loadOrders(); }
    catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); endAction(); }
  };

  const buyOther = async () => {
    if (!requireLogin() || !otherService || !otherCountry || !otherServer) return;
    beginAction('Preparing your number purchase…'); setBusy(true);
    try {
      const p = await req('/api/marketplace/live/sms/prepare', 'POST', { service: otherService, country: otherCountry, server: otherServer });
      if (!p.productId) throw new Error('Could not prepare this number. Refresh the live prices and try again.');
      const d = await req('/api/marketplace/live/sms/rentals', 'POST', { service: otherService, country: otherCountry, server: otherServer });
      const number = d.rental?.phone || d.rental?.number || '';
      setWallet(Number(d.walletBalance || 0));
      setMessage(number ? `Number purchased: ${number}. Waiting for your verification code…` : 'Number purchased. Waiting for provider number details…');
      await loadOrders();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); endAction(); }
  };

  const buyEsim = async (p: any) => {
    if (!requireLogin()) return;
    beginAction('Processing your eSIM order…'); setBusy(true);
    try { const d = await req('/api/marketplace/orders/purchase', 'POST', { productId: p.id, customer: { category: 'esim', country: p.country_code } }); setWallet(Number(d.walletBalance || 0)); setMessage('eSIM purchased successfully.'); await loadOrders(); }
    catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); endAction(); }
  };

  const tabs: [Mode, string, string][] = [
    ['us', '🇺🇸', 'US Number'], ['other', '🌍', 'Other Numbers'], ['email', '✉️', 'Custom Email'], ['rent', '📞', 'Rental'], ['esim', '📶', 'eSIM'], ['proxy', '🛡️', 'Proxies'], ['cards', '💳', 'Virtual Cards'],
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
            {loading ? <Spinner label="Fetching US services…" /> : <SearchableChoice label="Choose service" value={service} placeholder="Choose service" searchPlaceholder="Search services…" options={services.map(s => ({ value: String(s.name || s.id), label: String(s.name || s.id) }))} onChange={setService} />}
            {priceLoading && <Spinner label="Fetching live price…" />}
            {!priceLoading && price && <div className="fx-price"><small>FX SOCIALS PRICE</small><strong>{money(price.salePrice)}</strong><span>per number</span></div>}
            <button disabled={busy || priceLoading || !price} onClick={buy} className="fx-primary">{busy ? 'Getting number…' : priceLoading ? 'Fetching price…' : price ? `Buy US Number · ${money(price.salePrice)}` : 'Choose a service first'}</button>
          </>}

          {mode === 'other' && <>
            <h2>🌍 Other Numbers</h2>
            <p className="fx-muted">Choose a live SocioSMS service, then its supported country and server.</p>

            {otherServicesLoading && !otherServices.length ? <Spinner label="Fetching SocioSMS services…" /> : <SearchableChoice label="1. Choose service" value={otherService} placeholder="Choose service" searchPlaceholder="Search all services…" options={otherServices.map(s => ({ value: String(s.id || s.name), label: String(s.name || s.id) }))} onChange={value => { setOtherService(value); setOtherCountry(''); setOtherCountries([]); setOtherServer(''); setOtherServers([]); setCountrySearch(''); }} disabled={otherServicesLoading} />}

            {otherService && (otherServicesLoading ? <Spinner label="Fetching supported countries…" /> : <SearchableChoice label="2. Choose country" value={otherCountry} placeholder="Choose country" searchPlaceholder="Search countries…" options={otherCountries.map(c => ({ value: String(c.country_code || c.code), label: `${c.flag || ''} ${c.country_name || c.name || c.country_code || c.code}${c.stock != null ? ` · ${Number(c.stock)} in stock` : ''}`.trim() }))} onChange={value => { setOtherCountry(value); setOtherServer(''); setOtherServers([]); }} disabled={!otherCountries.length} />)}

            {otherCountry && otherService && (serversLoading ? <Spinner label="Fetching servers and prices…" /> : otherServers.length > 0 ? <label>3. Choose server
              <input type="search" value={otherServerSearch} onChange={e => setOtherServerSearch(e.target.value)} placeholder="Search servers…" />
              <select value={otherServer} onChange={e => setOtherServer(e.target.value)} disabled={serversLoading}>
                <option value="">Choose server</option>
                {otherServers.filter(s => String(s.server_name || s.server).toLowerCase().includes(otherServerSearch.toLowerCase())).map(s => <option key={s.server} value={s.server}>{s.server_name || `Server ${s.server}`} · {Number(s.stock || 0)} in stock</option>)}
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
            <h2>📞 Rental Number</h2><p className="fx-muted">Rent a number directly through the SocioSMS rental API. Choose a service, country and server.</p>
            <label>Choose service<input type="search" value={rentServiceSearch} onChange={e => setRentServiceSearch(e.target.value)} placeholder="Search rental services…" /><select value={rentService} onChange={e => { setRentService(e.target.value); setRentCountry(''); setRentCountrySearch(''); setRentServer(''); }}><option value="">Choose service</option>{rentServices.filter(s => String(s.name || s.id).toLowerCase().includes(rentServiceSearch.toLowerCase())).map(s => <option key={s.id || s.name} value={s.id || s.name}>{s.name || s.id}</option>)}</select></label>
            {rentService && <label>Choose country<input type="search" value={rentCountrySearch} onChange={e => setRentCountrySearch(e.target.value)} placeholder="Search available countries…" /><select value={rentCountry} onChange={e => { setRentCountry(e.target.value); setRentServer(''); }}><option value="">Choose country</option>{rentCountries.filter(c => String(c.country_name || c.name || c.country_code || c.code).toLowerCase().includes(rentCountrySearch.toLowerCase())).map(c => <option key={c.country_code || c.code} value={c.country_code || c.code}>{c.flag || ''} {c.country_name || c.name || c.country_code || c.code} · {Number(c.stock || 0)} in stock</option>)}</select></label>}
            {rentService && rentCountry && <label>Choose server<select value={rentServer} onChange={e => setRentServer(e.target.value)}><option value="">Choose server</option>{rentServers.map(s => <option key={s.server} value={s.server}>{s.server_name || `Server ${s.server}`} · {Number(s.stock || 0)} in stock · {money(s.salePrice)}</option>)}</select></label>}
            <label>Rental period<select value={months} onChange={e => setMonths(e.target.value)}><option value="1">One service session</option></select></label>
            <button disabled={busy || rentLoading || !rentServer} onClick={buyRent} className="fx-primary">{busy ? 'Getting rental…' : 'Buy rental number'}</button>
          </>}

          {mode === 'esim' && <>
            <h2>📶 eSIM</h2><p className="fx-muted">Available eSIM plans.</p>
            {loading ? <Spinner label="Fetching eSIM plans…" /> : <div className="fx-list">{esims.length ? esims.map(p => <div className="fx-product" key={p.id}><b>{p.name}</b><span>{p.description || ''}</span><button onClick={() => buyEsim(p)} className="fx-primary">Buy eSIM · {money(p.price)}</button></div>) : <div className="fx-empty">No eSIM plans are configured yet.</div>}</div>}
          </>}

          {mode === 'proxy' && <>
            <h2>🛡️ Residential Proxies</h2><p className="fx-muted">Fleexa residential proxy plans. Each IP is time-limited; credentials are returned after extraction.</p>
            {rentLoading ? <Spinner label="Fetching Fleexa proxy plans…" /> : <>
              <label>Choose plan<select value={proxyPlan} onChange={e => setProxyPlan(e.target.value)}><option value="">Choose proxy plan</option>{proxies.map(p => <option key={p.id} value={p.id}>{p.label} · {p.quantity} IP · {money(p.price_ngn)}</option>)}</select></label>
              <label>Choose country<input type="search" value={proxyCountrySearch} onChange={e => setProxyCountrySearch(e.target.value)} placeholder="Search proxy countries…" /><select value={proxyCountry} onChange={e => setProxyCountry(e.target.value)}><option value="">Choose country</option>{proxyCountries.filter(c => String(c.name || c.code).toLowerCase().includes(proxyCountrySearch.toLowerCase())).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
              <label>Proxy type<select value={proxyType} onChange={e => setProxyType(e.target.value)}><option value="2">HTTP/HTTPS</option><option value="3">SOCKS5</option></select></label>
              <button disabled={busy || !proxyPlan || !proxyCountry} onClick={buyProxy} className="fx-primary">{busy ? 'Ordering proxy…' : 'Buy proxy'}</button>
            </>}
          </>}
          {mode === 'cards' && <><h2>💳 Virtual Cards</h2><p className="fx-muted">Virtual card issuance requires a verified Fleexa card-API integration. This option will become available once Fleexa provides reseller endpoints and customer KYC/consent flows.</p><div className="fx-empty">Card API integration is not enabled. No payment will be taken.</div></>}
        </section>

        <section className="fx-orders"><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><h2>My orders</h2><button type="button" onClick={() => void loadOrders()} disabled={ordersLoading} className="fx-refresh">{ordersLoading ? 'Refreshing…' : 'Refresh orders'}</button></div>{orders.length === 0 ? <div className="fx-empty">{ordersLoading ? 'Loading your purchases…' : 'No orders are showing yet. Pull to refresh or tap Refresh orders.'}</div> : orders.map(o => {
          const payload = o.provider_payload || {};
          const phone = payload.phone || payload.number || o.phone || o.number;
          const code = payload.code || payload.otp || payload.sms_code || payload.pin || payload.verification_code || payload.activation_code;
          const smsMessage = payload.message || payload.sms_text || payload.sms || payload.text;
          return <div className="fx-order" key={o.id}>
            <strong>{o.source || o.category || o.type || 'Digital service'}</strong>
            <div>{phone || o.email || payload.service || o.service || 'Processing'}</div>
            <div>{money(o.amount ?? Number(o.amount_kobo || o.amountKobo || 0) / 100)} · {o.status}</div>
            {code && <div className="fx-code">Verification code: <strong>{String(code)}</strong></div>}
            {!code && smsMessage && <div className="fx-code">{String(smsMessage)}</div>}
            {o.category === 'sms' && ['active','waiting','received','fulfilling','paid','pending'].includes(String(o.status || '').toLowerCase()) && <small>Waiting for SMS · checking automatically every 5 seconds</small>}
          </div>;
        })}</section>
      </div>

      <style>{`
        .fx-search-choice{position:relative;display:block;margin-top:18px;color:#647796;font-size:14px;font-weight:700;z-index:5}.fx-choice-label{display:block;margin-bottom:7px}.fx-choice-trigger{width:100%;min-height:54px;padding:0 16px;border:1px solid #dce6f5;border-radius:14px;background:#fff;color:#18345f;display:flex;align-items:center;justify-content:space-between;text-align:left;font-size:16px;font-weight:700}.fx-choice-trigger:disabled{opacity:.6;cursor:wait}.fx-choice-trigger .is-placeholder{color:#8a9ab3;font-weight:500}.fx-choice-chevron{font-size:23px;line-height:1;color:#18345f}.fx-choice-menu{position:absolute;top:calc(100% + 7px);left:0;right:0;z-index:30;padding:10px;background:#fff;border:1px solid #dce6f5;border-radius:16px;box-shadow:0 16px 40px #18345f26;max-height: min(390px,65vh);display:flex;flex-direction:column}.fx-choice-search{width:100%;height:46px;flex:0 0 auto;margin:0 0 8px;padding:0 13px;border:1px solid #dce6f5;border-radius:11px;background:#f7f9ff;color:#18345f;font-size:15px;outline:none}.fx-choice-search:focus{border-color:#245fe5}.fx-choice-options{overflow-y:auto;min-height:0}.fx-choice-option{width:100%;min-height:44px;padding:10px 12px;border:0;border-radius:9px;background:#fff;color:#18345f;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;font-size:15px;font-weight:600}.fx-choice-option:hover,.fx-choice-option.active{background:#edf3ff;color:#245fe5}.fx-choice-empty{padding:15px 12px;color:#8290a8;font-size:14px;font-weight:500}
        *{box-sizing:border-box}.fx-page{min-height:100vh;background:#050505;color:#fff;padding:18px 0 70px;font-family:inherit}.fx-wrap{width:min(940px,100%);margin:auto;padding:0 18px}.fx-top{display:flex;justify-content:space-between;align-items:center;gap:12px}.fx-back,.fx-wallet,.fx-notice button{border:0;background:transparent;color:#aaa}.fx-back{font-size:16px;padding:10px 0}.fx-wallet{background:#111;border:1px solid #292929;border-radius:999px;padding:10px 14px;color:#fff;font-weight:800}.fx-header{padding:28px 0 18px}.fx-eyebrow{font-size:11px;letter-spacing:.16em;font-weight:900;color:#777}.fx-header h1{font-size:clamp(40px,8vw,64px);line-height:1;letter-spacing:-.055em;margin:9px 0}.fx-header p,.fx-muted{color:#888;margin:0;line-height:1.55}.fx-notice{margin:12px 0;padding:13px 15px;border:1px solid #303030;border-radius:13px;background:#111;display:flex;justify-content:space-between;gap:12px;font-size:14px}.fx-notice button{font-size:22px;padding:0;cursor:pointer}.fx-tabs{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin:12px 0 14px}.fx-tab{min-height:68px;border:1px solid #292929;border-radius:15px;background:#0d0d0d;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:12px;cursor:pointer}.fx-tab span{font-size:19px}.fx-tab.active{background:#fff;color:#050505;border-color:#fff}.fx-card{border:1px solid #292929;border-radius:20px;background:#0b0b0b;padding:20px}.fx-card h2{font-size:24px;margin:0 0 7px;letter-spacing:-.02em}.fx-card label{display:block;margin-top:18px;color:#aaa;font-size:14px;font-weight:700}.fx-card select,.fx-card input{display:block;width:100%;height:52px;margin-top:7px;padding:0 14px;border:1px solid #333;border-radius:13px;background:#151515;color:#fff;font-size:16px;outline:none}.fx-card select:focus,.fx-card input:focus{border-color:#777}.fx-loading{display:flex;align-items:center;gap:10px;margin-top:15px;padding:14px 15px;border:1px solid #292929;border-radius:13px;background:#101010;color:#aaa}.fx-spinner{width:17px;height:17px;border:2px solid #3b3b3b;border-top-color:#fff;border-radius:50%;display:inline-block;animation:fxspin .75s linear infinite;flex:0 0 auto}.fx-hint,.fx-empty{margin-top:14px;padding:13px 14px;border-radius:12px;background:#111;border:1px solid #292929;color:#777;font-size:14px;line-height:1.45}.fx-price{margin-top:16px;padding:17px;border-radius:14px;background:#151515;border:1px solid #292929;display:flex;flex-direction:column;gap:3px}.fx-price small{color:#999;font-weight:800;letter-spacing:.08em}.fx-price strong{font-size:29px;letter-spacing:-.03em}.fx-price span{color:#777;font-size:13px}.fx-price-large{margin-top:18px}.fx-primary{width:100%;min-height:52px;margin-top:17px;border:0;border-radius:13px;background:#fff;color:#050505;font-size:15px;font-weight:900;padding:12px 15px;cursor:pointer}.fx-primary:disabled{opacity:.42;cursor:not-allowed}.fx-list{display:grid;gap:9px;margin-top:15px}.fx-row{padding:13px;border:1px solid #292929;border-radius:12px;display:flex;justify-content:space-between;gap:10px}.fx-product{padding:15px;border:1px solid #292929;border-radius:14px;display:grid;gap:8px}.fx-product span{color:#777;font-size:14px;line-height:1.45}.fx-orders{margin-top:22px}.fx-refresh{border:1px solid #333;background:#151515;color:#fff;border-radius:10px;padding:9px 12px;font-size:12px;font-weight:800;cursor:pointer}.fx-refresh:disabled{opacity:.5}.fx-code{margin-top:8px;padding:10px 12px;border-radius:10px;background:#13251b;color:#9df0b4;font-size:16px;overflow-wrap:anywhere}.fx-order{margin-top:8px;padding:12px;border:1px solid #292929;border-radius:12px;background:#0b0b0b;color:#aaa;font-size:13px}@keyframes fxspin{to{transform:rotate(360deg)}}@media(max-width:760px){.fx-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}.fx-tab:last-child{grid-column:auto}.fx-card{padding:17px}.fx-header{padding-top:22px}.fx-header h1{font-size:43px}}
      `}</style>
    </main>
  );
}
