import { useEffect, useMemo, useState } from 'react';

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';

async function request(path: string, method = 'GET', data?: any) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw { data: result, message: result.error || 'Request failed' };
  return { data: result };
}

const api = {
  get: (path: string) => request(path),
  post: (path: string, data?: any) => request(path, 'POST', data),
};

type User = { userId: string; email: string; name: string; role?: string };
type Product = { id: string; platform: string; username: string; price: number; status: string; description?: string; isSample?: boolean };
type Order = { id: string; productName: string; amount: number; status: string; createdAt: string; delivery: string; userEmail?: string };
type AdminUser = { userId: string; name: string; email: string; balance: number };

const ADMIN = 'yasiyrshehu@gmail.com';
const logo = '/resources/Fx socials.png';
const platforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'X'];
const money = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const token = () => localStorage.getItem('fxs-session') || '';
const errorText = (e: any, fallback: string) => e?.data?.error || e?.message || fallback;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState(location.hash.replace('#/', '') || 'home');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wallet, setWallet] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [auth, setAuth] = useState({ name: '', email: '', password: '' });
  const [amount, setAmount] = useState('5000');
  const [platform, setPlatform] = useState('All platforms');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ platform: 'Instagram', accountLabel: '', accountLogin: '', accountPassword: '', price: '', description: '' });
  const [adminAmount, setAdminAmount] = useState<Record<string, string>>({});

  const isAdmin = user?.role === 'admin' && user.email.toLowerCase() === ADMIN;
  const session = () => ({ sessionToken: token() });
  const go = (next: string) => {
    history.replaceState(null, '', `#/${next}`);
    setPage(next);
    setMessage('');
    window.scrollTo(0, 0);
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(response.data.products || []);
    } catch {
      setMessage('Could not load the store.');
    }
  };

  const loadPrivate = async () => {
    if (!token()) return;
    try {
      const [walletResponse, orderResponse] = await Promise.all([
        api.post('/api/me/wallet', session()),
        api.post('/api/me/orders', session()),
      ]);
      setWallet(walletResponse.data.wallet?.balance || 0);
      setOrders(orderResponse.data.orders || []);
    } catch {
      setMessage('Your session has expired. Please sign in again.');
    }
  };

  const loadAdmin = async () => {
    if (!isAdmin) return;
    try {
      const [productResponse, orderResponse, userResponse] = await Promise.all([
        api.post('/api/admin/products/list', session()),
        api.post('/api/admin/orders', session()),
        api.post('/api/admin/users', session()),
      ]);
      setAdminProducts(productResponse.data.products || []);
      setAdminOrders(orderResponse.data.orders || []);
      setUsers(userResponse.data.users || []);
    } catch (e: any) {
      setMessage(errorText(e, 'Admin access required.'));
    }
  };

  const verifyPayment = async (specificReference?: string) => {
    const query = new URLSearchParams(window.location.search);
    const hashQuery = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const reference = specificReference
      || query.get('reference')
      || query.get('trxref')
      || hashQuery.get('reference')
      || hashQuery.get('trxref')
      || localStorage.getItem('fxs-last-payment-reference')
      || '';

    if (!reference) return;
    if (!token()) {
      localStorage.setItem('fxs-pending-payment-reference', reference);
      go('account');
      setMessage('Sign in to the same Fx Socials account used for this payment, then check Wallet again.');
      return;
    }

    setBusy(true);
    try {
      const response = await api.post('/api/wallet/verify', { ...session(), reference });
      localStorage.removeItem('fxs-last-payment-reference');
      localStorage.removeItem('fxs-pending-payment-reference');
      setMessage(response.data.message || 'Payment verified.');
      await loadPrivate();
      go('wallet');
    } catch (e: any) {
      setMessage(errorText(e, 'Payment is not verified yet. Do not pay again.'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('fxs-user') || 'null');
      if (stored) setUser(stored);
    } catch {
      localStorage.removeItem('fxs-user');
    }

    void loadProducts();
    if (token()) void loadPrivate();

    const pending = localStorage.getItem('fxs-pending-payment-reference');
    const currentReference = new URLSearchParams(window.location.search).get('reference');
    if (pending || currentReference) void verifyPayment(pending || currentReference || undefined);

    const onHash = () => setPage(location.hash.replace('#/', '') || 'home');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (isAdmin && page === 'admin') void loadAdmin();
  }, [isAdmin, page]);

  const authenticate = async () => {
    if (!auth.email || !auth.password || (mode === 'register' && !auth.name)) {
      setMessage(mode === 'register' ? 'Enter your name, email and password.' : 'Enter email and password.');
      return;
    }
    setBusy(true);
    try {
      const payload = mode === 'register'
        ? auth
        : { email: auth.email, password: auth.password };
      const response = await api.post(mode === 'register' ? '/api/auth/register' : '/api/auth/login', payload);
      const nextUser = response.data.user as User;
      localStorage.setItem('fxs-session', response.data.token);
      localStorage.setItem('fxs-user', JSON.stringify(nextUser));
      setUser(nextUser);
      await loadPrivate();
      const pending = localStorage.getItem('fxs-pending-payment-reference');
      if (pending) {
        await verifyPayment(pending);
      } else {
        go('dashboard');
      }
    } catch (e: any) {
      setMessage(errorText(e, 'Authentication failed.'));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', session());
    } catch {
      // Clear the local session even if the server session is already gone.
    }
    localStorage.removeItem('fxs-session');
    localStorage.removeItem('fxs-user');
    setUser(null);
    setWallet(0);
    setOrders([]);
    go('home');
  };

  const fund = async () => {
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value < 100) {
      setMessage('Minimum deposit is ₦100.');
      return;
    }
    if (!token()) {
      setMessage('Please log in before adding funds.');
      go('account');
      return;
    }
    setBusy(true);
    try {
      const response = await api.post('/api/wallet/initialize', { ...session(), amountNaira: value });
      if (!response.data.authorizationUrl || !response.data.reference) throw new Error('Paystack did not return a checkout link.');
      localStorage.setItem('fxs-last-payment-reference', response.data.reference);
      window.location.href = response.data.authorizationUrl;
    } catch (e: any) {
      setMessage(errorText(e, 'Paystack could not start. Do not make another payment until this is fixed.'));
    } finally {
      setBusy(false);
    }
  };

  const buy = async (id: string) => {
    if (id.startsWith('sample-')) {
      setMessage('Sample listing — not for sale.');
      return;
    }
    if (!user) {
      go('account');
      return;
    }
    setBusy(true);
    try {
      const response = await api.post('/api/orders', { ...session(), productId: id });
      setMessage(response.data.message || 'Purchase successful.');
      await Promise.all([loadPrivate(), loadProducts()]);
      go('orders');
    } catch (e: any) {
      setMessage(errorText(e, 'Purchase failed.'));
    } finally {
      setBusy(false);
    }
  };

  const addListing = async () => {
    if (!form.accountLogin.trim() || !form.accountPassword || Number(form.price) < 1) {
      setMessage('Enter the account login, password and price.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/admin/products', { ...session(), ...form, price: Number(form.price) });
      setForm({ platform: 'Instagram', accountLabel: '', accountLogin: '', accountPassword: '', price: '', description: '' });
      setMessage('Account listing saved.');
      await Promise.all([loadAdmin(), loadProducts()]);
    } catch (e: any) {
      setMessage(errorText(e, 'Could not save listing.'));
    } finally {
      setBusy(false);
    }
  };

  const adjust = async (userId: string, type: 'add-funds' | 'refund') => {
    const value = Number(adminAmount[userId]);
    if (!Number.isFinite(value) || value < 100) {
      setMessage('Admin adjustment minimum is ₦100.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/admin/users/${type}`, { ...session(), userId, amountNaira: value });
      setAdminAmount((current) => ({ ...current, [userId]: '' }));
      await loadAdmin();
      setMessage(type === 'add-funds' ? `${money(value)} added to the user's wallet.` : `${money(value)} refunded to the user's wallet.`);
    } catch (e: any) {
      setMessage(errorText(e, 'Wallet adjustment failed.'));
    } finally {
      setBusy(false);
    }
  };

  const removeListing = async (id: string) => {
    if (!confirm('Remove this listing?')) return;
    try {
      await api.post('/api/admin/products/delete', { ...session(), productId: id });
      await Promise.all([loadAdmin(), loadProducts()]);
      setMessage('Listing removed.');
    } catch (e: any) {
      setMessage(errorText(e, 'Could not remove listing.'));
    }
  };

  const visible = useMemo(
    () => products.filter((p) => p.status === 'available'
      && (platform === 'All platforms' || p.platform === platform)
      && [p.platform, p.username, p.description || ''].some((value) => value.toLowerCase().includes(search.toLowerCase()))),
    [products, platform, search],
  );

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => go('home')}><img src={logo} alt="Fx Socials"/><b>FX SOCIALS</b></button>
      <nav>
        <button onClick={() => go('marketplace')}>Buy accounts</button>
        <button onClick={() => go('how')}>How it works</button>
        <button onClick={() => go('support')}>Support</button>
        {isAdmin && <button onClick={() => go('admin')}>Admin</button>}
        {user && <button onClick={() => go('dashboard')}>My account</button>}
      </nav>
      <div className="top-actions">
        {user ? <><button className="wallet-pill" onClick={() => go('wallet')}>{money(wallet)}</button><button className="outline" onClick={logout}>Sign out</button></> : <button className="primary small" onClick={() => go('account')}>Login / Register</button>}
      </div>
    </header>

    {message && <div className="notice">{message}<button onClick={() => setMessage('')}>×</button></div>}

    {page === 'home' && <main><section className="hero"><div><span className="eyebrow">WELCOME TO FX SOCIALS</span><h1>Buy a social account<br/><em>in a few simple steps.</em></h1><p>Pick a platform, choose an account and pay from your wallet.</p><div className="hero-actions"><button className="primary" onClick={() => go('marketplace')}>Start shopping</button><button className="outline" onClick={() => go('account')}>Create account</button></div></div><div className="hero-card"><img src={logo} alt="Fx Socials"/><b>Wallet starts at ₦0</b><p>Add funds only when ready.</p></div></section><section className="section"><h2>Choose an account</h2><Grid items={products.slice(0, 6)} buy={buy}/></section></main>}

    {page === 'account' && <main className="section page"><div className="form-card auth-card"><h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>{mode === 'register' && <label>Name<input value={auth.name} onChange={(e) => setAuth({ ...auth, name: e.target.value })}/></label>}<label>Email<input type="email" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })}/></label><label>Password<input type="password" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })}/></label><button className="primary full" disabled={busy} onClick={authenticate}>{busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}</button><button className="text-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'New here? Create an account' : 'Already registered? Login'}</button></div></main>}

    {page === 'marketplace' && <main className="section page"><h2>Marketplace</h2><div className="platform-selector">{['All platforms', ...platforms].map((item) => <button key={item} className={platform === item ? 'chosen' : ''} onClick={() => setPlatform(item)}>{item}</button>)}</div><input className="search-box" placeholder="Search accounts" value={search} onChange={(e) => setSearch(e.target.value)}/><Grid items={visible} buy={buy}/></main>}

    {page === 'wallet' && <main className="section page">{!user ? <Prompt go={() => go('account')}/> : <div className="form-card wallet-card"><h2>Your wallet</h2><strong className="big-balance">{money(wallet)}</strong><label>Amount in naira<input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}/></label><button className="primary full" disabled={busy} onClick={fund}>{busy ? 'Connecting…' : 'Pay with Paystack'}</button><button className="outline full" disabled={busy} onClick={() => verifyPayment()}>{busy ? 'Checking…' : 'I have paid — check my latest payment'}</button><p className="support-hint">A successful Paystack payment is credited only after server-side verification. Do not pay again because a credit is delayed.</p></div>}</main>}

    {page === 'dashboard' && <main className="section page">{!user ? <Prompt go={() => go('account')}/> : <><h2>Hello, {user.name}</h2><p>{user.email}</p><div className="dashboard-grid"><button onClick={() => go('wallet')}><span>Wallet</span><b>{money(wallet)}</b></button><button onClick={() => go('orders')}><span>Orders</span><b>{orders.length}</b></button>{isAdmin && <button onClick={() => go('admin')}><span>Admin</span><b>Manage store</b></button>}</div></>}</main>}

    {page === 'orders' && <main className="section page"><h2>My orders</h2>{orders.length ? <div className="orders">{orders.map((order) => <article key={order.id}><div><b>{order.productName}</b><span>{new Date(order.createdAt).toLocaleString('en-NG')}</span></div><strong>{money(order.amount)}</strong><small>{order.status}</small><pre>{order.delivery}</pre></article>)}</div> : <div className="empty">No orders yet.</div>}</main>}

    {page === 'how' && <main className="section page"><h2>How it works</h2><div className="steps"><Step n="1" t="Create account"/><Step n="2" t="Add funds"/><Step n="3" t="Choose account"/><Step n="4" t="Buy and receive"/></div></main>}

    {page === 'support' && <main className="section page"><h2>Support</h2><div className="form-card"><p>Email: <a href="mailto:yasiyrshehu@gmail.com">yasiyrshehu@gmail.com</a></p><a className="whatsapp" href="https://wa.me/2347066045578">WhatsApp · 07066045578</a></div></main>}

    {page === 'admin' && <main className="section page">{!isAdmin ? <Prompt go={() => go('account')}/> : <>
      <h2>Admin dashboard</h2>
      <p>Manage inventory and customer wallets from here.</p>
      <div className="form-card"><h3>Add listing</h3>{[['platform', 'Platform'], ['accountLabel', 'Display name'], ['accountLogin', 'Login/email'], ['accountPassword', 'Password'], ['price', 'Price'], ['description', 'Notes']].map(([key, label]) => <label key={key}>{label}<input type={key === 'accountPassword' ? 'password' : 'text'} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}/></label>)}<button className="primary full" disabled={busy} onClick={addListing}>Save listing</button></div>

      <div className="admin-list">
        <h3>New users</h3>
        {users.length ? users.map((customer) => <div className="admin-row" key={customer.userId}><div><b>{customer.name || 'User'}</b><span>{customer.email} · wallet {money(customer.balance)}</span></div><div className="admin-user-actions"><input placeholder="Amount ₦" value={adminAmount[customer.userId] || ''} onChange={(e) => setAdminAmount({ ...adminAmount, [customer.userId]: e.target.value })}/><button className="primary small" disabled={busy} onClick={() => adjust(customer.userId, 'add-funds')}>Add funds</button><button className="danger" disabled={busy} onClick={() => adjust(customer.userId, 'refund')}>Refund</button></div></div>) : <p>No customer accounts yet.</p>}

        <h3>Your listings</h3>
        {adminProducts.length ? adminProducts.map((product) => <div className="admin-row" key={product.id}><div><b>{product.platform} — {product.username}</b><span>{money(product.price)} · {product.status}</span></div>{product.status === 'available' && <button className="danger" onClick={() => removeListing(product.id)}>Remove</button>}</div>) : <p>No listings yet.</p>}

        <h3>Recent orders</h3>
        {adminOrders.length ? adminOrders.map((order) => <div className="admin-row" key={order.id}><div><b>{order.productName}</b><span>{order.userEmail} · {money(order.amount)} · {order.status}</span></div></div>) : <p>No orders yet.</p>}
      </div>
    </>}</main>}

    <footer>© {new Date().getFullYear()} Fx Socials · <a href="mailto:yasiyrshehu@gmail.com">Email</a> · <a href="https://wa.me/2347066045578">WhatsApp</a></footer>
  </div>;
}

function Grid({ items, buy }: { items: Product[]; buy: (id: string) => void }) {
  return <div className="product-grid">{items.length ? items.map((product) => <article className="product" key={product.id}><span className="platform">{product.platform}</span><h3>{product.username}</h3><p>{product.description || 'Available account'}</p><div className="product-bottom"><strong>{money(product.price)}</strong><button className="primary small" disabled={product.isSample} onClick={() => buy(product.id)}>{product.isSample ? 'Preview only' : 'Buy account'}</button></div></article>) : <div className="empty">No accounts available yet.</div>}</div>;
}

function Prompt({ go }: { go: () => void }) {
  return <div className="form-card auth-card"><h2>Login first</h2><button className="primary" onClick={go}>Login / Register</button></div>;
}

function Step({ n, t }: { n: string; t: string }) {
  return <div className="step"><span>{n}</span><h3>{t}</h3></div>;
}
