import { useEffect, useState } from 'react';

const API = (import.meta as any).env.VITE_API_BASE_URL || 'https://fx-socials-api.onrender.com';
const ADMIN = 'yasiyrshehu@gmail.com';
const token = () => localStorage.getItem('fxs-session') || '';
const money = (n: any) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const platforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'X'];

async function api(path: string, method = 'POST', body: any = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, sessionToken: token() }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export default function AdminPage() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState<any>({ stats: {}, products: [], orders: [], users: [], payments: [] });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ platform: 'Instagram', username: '', login: '', password: '', price: '', description: '' });

  const load = async () => {
    setBusy(true);
    setMessage('');
    try {
      const [stats, products, orders, users, payments] = await Promise.all([
        api('/api/admin/stats'),
        api('/api/admin/products/list'),
        api('/api/admin/orders'),
        api('/api/admin/users'),
        api('/api/admin/manual-topups'),
      ]);
      setData({
        stats,
        products: products.products || [],
        orders: orders.orders || [],
        users: users.users || [],
        payments: payments.requests || [],
      });
    } catch (error: any) {
      setMessage(error?.message || 'Could not load admin data.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const act = async (path: string, body: any = {}) => {
    setBusy(true);
    setMessage('');
    try {
      await api(path, 'POST', body);
      setMessage('Action completed successfully.');
      await load();
    } catch (error: any) {
      setMessage(error?.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  const addInventory = async () => {
    if (!form.username || !form.login || !form.password || Number(form.price) < 1) {
      setMessage('Complete platform, account name, login, password and sale price.');
      return;
    }
    await act('/api/admin/inventory/add', {
      inventoryType: 'social',
      platform: form.platform,
      username: form.username,
      login: form.login,
      password: form.password,
      price: Number(form.price),
      description: form.description,
    });
    setForm({ platform: 'Instagram', username: '', login: '', password: '', price: '', description: '' });
  };

  const pending = (data.products || []).filter((p: any) => String(p.sellerStatus || p.status) === 'pending_review');
  const stats = data.stats || {};

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <div>
          <small>FX SOCIALS ADMIN</small>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.muted}>Inventory, seller listings, purchases, users and manual wallet payments.</p>
          <small>Authorized admin: {ADMIN}</small>
        </div>
        <button style={styles.button} disabled={busy} onClick={() => void load()}>{busy ? 'Working…' : 'Refresh'}</button>
      </div>

      {message && <div style={styles.notice}>{message}<button style={styles.close} onClick={() => setMessage('')}>×</button></div>}

      <nav style={styles.tabs}>
        {['overview', 'inventory', 'listings', 'orders', 'users', 'payments'].map((item) => (
          <button key={item} onClick={() => setTab(item)} style={tab === item ? styles.activeTab : styles.tab}>{item}</button>
        ))}
      </nav>

      {tab === 'overview' && (
        <section>
          <div style={styles.statsGrid}>
            {[
              ['Users', stats.users],
              ['Products', stats.products],
              ['Orders', stats.orders],
              ['Payments', stats.payments],
            ].map(([label, value]) => (
              <div style={styles.card} key={String(label)}><small>{label}</small><strong style={styles.stat}>{value ?? 0}</strong></div>
            ))}
          </div>
          <div style={styles.card}>
            <h2>Admin controls</h2>
            <p style={styles.muted}>Use Inventory to add a complete account for sale. Use Listings to approve seller accounts. Use Orders and Users to manage customers. Use Payments to approve manual wallet funding.</p>
          </div>
        </section>
      )}

      {tab === 'inventory' && (
        <section>
          <div style={styles.card}>
            <h2>List account for sale</h2>
            <p style={styles.muted}>This is the clean admin listing form. Approved inventory appears on the customer Buy Account page.</p>
            <label>Platform<select style={styles.input} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>{platforms.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label>Account display name<input style={styles.input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. Instagram 20K account" /></label>
            <label>Login email or username<input style={styles.input} value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} /></label>
            <label>Password<input style={styles.input} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <label>Sale price (₦)<input style={styles.input} type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
            <label>Description<input style={styles.input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Niche, followers, country, notes, etc." /></label>
            <button style={styles.button} disabled={busy} onClick={() => void addInventory()}>{busy ? 'Saving…' : 'List account for sale'}</button>
          </div>

          <div style={styles.card}>
            <h2>Current inventory</h2>
            {(data.products || []).length ? (data.products || []).map((p: any) => (
              <div style={styles.row} key={p.id}>
                <div><b>{p.platform} — {p.username}</b><span style={styles.sub}>{money(p.price)} · {p.status}</span></div>
                {p.status !== 'removed' && <button style={styles.danger} onClick={() => void act('/api/admin/products/delete', { productId: p.id })}>Remove</button>}
              </div>
            )) : <p style={styles.muted}>No inventory yet.</p>}
          </div>
        </section>
      )}

      {tab === 'listings' && (
        <section>
          <div style={styles.card}>
            <h2>Seller submissions</h2>
            <p style={styles.muted}>Seller price + 40% FX Socials markup = customer price. The seller price is what the seller requests to receive.</p>
            {pending.length ? pending.map((p: any) => (
              <div style={styles.listing} key={p.id}>
                <div style={styles.listingInfo}>
                  <h3>{p.platform} — {p.username}</h3>
                  <span>Seller: {p.sellerEmail || '—'}</span>
                  <span>Listing: {p.sellerOrderNumber || p.id}</span>
                  <span>Seller price: {money(p.basePrice)}</span>
                  <span>FX Socials 40%: {money(Number(p.basePrice || 0) * 0.4)}</span>
                  <strong>Buyer price: {money(p.price)}</strong>
                  <span>{p.description || 'No description provided.'}</span>
                </div>
                <div style={styles.actions}>
                  <button style={styles.button} onClick={() => void act('/api/admin/listings/review', { productId: p.id, decision: 'approve' })}>Approve</button>
                  <button style={styles.danger} onClick={() => void act('/api/admin/listings/review', { productId: p.id, decision: 'reject' })}>Reject</button>
                </div>
              </div>
            )) : <p style={styles.muted}>No pending seller listings.</p>}
          </div>
          <div style={styles.card}>
            <h2>All listings</h2>
            {(data.products || []).map((p: any) => <div style={styles.row} key={p.id}><div><b>{p.platform} — {p.username}</b><span style={styles.sub}>{money(p.basePrice || p.price)} → {money(p.price)} · {p.sellerStatus || p.status}</span></div></div>)}
          </div>
        </section>
      )}

      {tab === 'orders' && <section style={styles.card}><h2>Account purchases</h2>{(data.orders || []).length ? (data.orders || []).map((o: any) => <div style={styles.row} key={o.id}><div><b>Order #{o.orderNumber || o.id}</b><span style={styles.sub}>{o.productName} · {money(o.amount)} · {o.userEmail || ''}</span></div><span>{o.status}</span></div>) : <p style={styles.muted}>No account purchases yet.</p>}</section>}

      {tab === 'users' && <section style={styles.card}><h2>Users</h2>{(data.users || []).length ? (data.users || []).map((u: any) => <div style={styles.row} key={u.userId || u.id}><div><b>{u.name}</b><span style={styles.sub}>{u.email} · {u.role} · {money(u.balance)}</span></div><div style={styles.actions}><button style={styles.small} onClick={() => { const value = prompt('Amount to add'); if (value) void act('/api/admin/users/add-funds', { userId: u.userId, amountNaira: Number(value) }); }}>Add funds</button><button style={styles.small} onClick={() => { const value = prompt('Refund amount'); if (value) void act('/api/admin/users/refund', { userId: u.userId, amountNaira: Number(value) }); }}>Refund</button></div></div>) : <p style={styles.muted}>No users yet.</p>}</section>}

      {tab === 'payments' && <section style={styles.card}><h2>Manual wallet payments</h2>{(data.payments || []).length ? (data.payments || []).map((p: any) => <div style={styles.listing} key={p.id}><div style={styles.listingInfo}><b>{p.requestNumber || p.id}</b><span>{p.name || ''} · {p.email || ''}</span><span>Amount: {money(p.amount)} · {p.status}</span>{p.account && <span>Bank: {p.account.bankName} · {p.account.accountName} · {p.account.accountNumber}</span>}</div><div style={styles.actions}>{['submitted', 'expired'].includes(String(p.status)) && <><button style={styles.button} onClick={() => void act('/api/admin/manual-topups/approve', { requestId: p.id })}>Approve</button><button style={styles.danger} onClick={() => void act('/api/admin/manual-topups/reject', { requestId: p.id })}>Decline</button></>}</div></div>) : <p style={styles.muted}>No manual top-up requests.</p>}</section>}
    </main>
  );
}

const styles: any = {
  page: { minHeight: '100vh', background: '#050505', color: '#fff', maxWidth: 1120, margin: '0 auto', padding: '28px 18px 90px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 },
  title: { fontSize: 'clamp(40px, 8vw, 68px)', margin: '10px 0', lineHeight: 1 },
  muted: { color: '#888', lineHeight: 1.5 },
  notice: { margin: '16px 0', padding: 14, borderRadius: 14, background: '#fff', color: '#111', fontWeight: 700 },
  close: { float: 'right', border: 0, background: 'transparent', fontSize: 20 },
  tabs: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8, margin: '20px 0' },
  tab: { background: '#111', color: '#aaa', border: '1px solid #292929', borderRadius: 12, padding: '12px 8px', textTransform: 'capitalize' },
  activeTab: { background: '#fff', color: '#000', border: '1px solid #fff', borderRadius: 12, padding: '12px 8px', textTransform: 'capitalize' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 },
  card: { background: '#0b0b0b', border: '1px solid #252525', borderRadius: 18, padding: 20, marginBottom: 14 },
  stat: { display: 'block', fontSize: 34, marginTop: 8 },
  input: { display: 'block', width: '100%', boxSizing: 'border-box', margin: '8px 0 14px', padding: 13, borderRadius: 10, border: '1px solid #333', background: '#151515', color: '#fff' },
  button: { background: '#fff', color: '#000', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 900 },
  danger: { background: '#1b0d0d', color: '#ffb0b0', border: '1px solid #522525', borderRadius: 10, padding: '10px 12px', fontWeight: 800 },
  small: { background: '#151515', color: '#fff', border: '1px solid #333', borderRadius: 9, padding: '8px 10px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '15px 0', borderBottom: '1px solid #222' },
  sub: { display: 'block', color: '#888', fontSize: 12, marginTop: 5 },
  listing: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, padding: '18px 0', borderBottom: '1px solid #222' },
  listingInfo: { display: 'grid', gap: 5 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
};
