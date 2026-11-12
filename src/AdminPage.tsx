import { useEffect, useState } from 'react';

const API = (import.meta as any).env.VITE_API_BASE_URL || 'https://fx-socials-api.onrender.com';
const ADMIN = 'yasiyrshehu@gmail.com';
const token = () => localStorage.getItem('fxs-session') || '';
const money = (n: any) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
async function api(path: string, body: any = {}) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, sessionToken: token() }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
export default function AdminPage() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState<any>({ stats: {}, users: [], payments: [] });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true); setMessage('');
    try {
      const [stats, users, payments] = await Promise.all([
        api('/api/admin/stats'), api('/api/admin/users'), api('/api/admin/manual-topups'),
      ]);
      setData({ stats: stats.stats || {}, users: users.users || [], payments: payments.requests || [] });
    } catch (error: any) { setMessage(error?.message || 'Could not load admin data.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const act = async (path: string, body: any = {}) => {
    setBusy(true); setMessage('');
    try { await api(path, body); setMessage('Action completed successfully.'); await load(); }
    catch (error: any) { setMessage(error?.message || 'Request failed.'); }
    finally { setBusy(false); }
  };
  const stats = data.stats || {};
  return <main style={styles.page}>
    <div style={styles.header}><div><small>FX SOCIALS ADMIN</small><h1 style={styles.title}>Admin Dashboard</h1><p style={styles.muted}>Customers, wallet activity and manual payment approvals.</p><small>Authorized admin: {ADMIN}</small></div><button style={styles.button} disabled={busy} onClick={() => void load()}>{busy ? 'Working…' : 'Refresh'}</button></div>
    {message && <div style={styles.notice}>{message}<button style={styles.close} onClick={() => setMessage('')}>×</button></div>}
    <nav style={styles.tabs}>{['overview', 'users', 'payments'].map(item => <button key={item} onClick={() => setTab(item)} style={tab === item ? styles.activeTab : styles.tab}>{item}</button>)}</nav>
    {tab === 'overview' && <section><div style={styles.statsGrid}>{[['Customers', stats.users], ['Successful payments', stats.payments]].map(([label, value]) => <div style={styles.card} key={String(label)}><small>{label}</small><strong style={styles.stat}>{value ?? 0}</strong></div>)}</div><div style={styles.card}><h2>FX Socials services</h2><p style={styles.muted}>Digital subscriptions, phone numbers, eSIMs and social media growth services.</p></div></section>}
    {tab === 'users' && <section style={styles.card}><h2>Customers</h2>{data.users.length ? data.users.map((u: any) => <div style={styles.row} key={u.userId || u.id}><div><b>{u.name}</b><span style={styles.sub}>{u.email} · {u.role} · Wallet: {money(u.balance)}</span></div><div style={styles.actions}><button style={styles.small} onClick={() => { const value = prompt('Amount to add (₦)'); if (value) void act('/api/admin/users/add-funds', { userId: u.userId, amountNaira: Number(value) }); }}>Add funds</button><button style={styles.small} onClick={() => { const value = prompt('Refund amount (₦)'); if (value) void act('/api/admin/users/refund', { userId: u.userId, amountNaira: Number(value) }); }}>Refund</button></div></div>) : <p style={styles.muted}>No customers yet.</p>}</section>}
    {tab === 'payments' && <section style={styles.card}><h2>Manual wallet payments</h2>{data.payments.length ? data.payments.map((p: any) => <div style={styles.listing} key={p.id}><div style={styles.listingInfo}><b>{p.requestNumber || p.id}</b><span>{p.name || ''} · {p.email || ''}</span><span>Amount: {money(p.amount)} · {p.status}</span>{p.account && <span>Bank: {p.account.bankName} · {p.account.accountName} · {p.account.accountNumber}</span>}</div><div style={styles.actions}>{['submitted', 'expired'].includes(String(p.status)) && <><button style={styles.button} onClick={() => void act('/api/admin/manual-topups/approve', { requestId: p.id })}>Approve</button><button style={styles.danger} onClick={() => void act('/api/admin/manual-topups/reject', { requestId: p.id })}>Decline</button></>}</div></div>) : <p style={styles.muted}>No manual top-up requests.</p>}</section>}
  </main>;
}
const styles: any = {
 page:{minHeight:'100vh',background:'#050505',color:'#fff',maxWidth:1120,margin:'0 auto',padding:'28px 18px 90px'},
 header:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:18},
 title:{fontSize:'clamp(40px,8vw,68px)',margin:'10px 0',lineHeight:1},
 muted:{color:'#888',lineHeight:1.5},
 notice:{margin:'16px 0',padding:14,borderRadius:14,background:'#fff',color:'#111',fontWeight:700},
 close:{float:'right',border:0,background:'transparent',fontSize:20},
 tabs:{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,margin:'20px 0'},
 tab:{background:'#111',color:'#aaa',border:'1px solid #292929',borderRadius:12,padding:'12px 8px',textTransform:'capitalize'},
 activeTab:{background:'#fff',color:'#000',border:'1px solid #fff',borderRadius:12,padding:'12px 8px',textTransform:'capitalize'},
 statsGrid:{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12},
 card:{background:'#0b0b0b',border:'1px solid #252525',borderRadius:18,padding:20,marginBottom:14},
 stat:{display:'block',fontSize:34,marginTop:8},
 button:{background:'#fff',color:'#000',border:0,borderRadius:12,padding:'12px 16px',fontWeight:900},
 danger:{background:'#1b0d0d',color:'#ffb0b0',border:'1px solid #522525',borderRadius:10,padding:'10px 12px',fontWeight:800},
 small:{background:'#151515',color:'#fff',border:'1px solid #333',borderRadius:9,padding:'8px 10px'},
 row:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,padding:'15px 0',borderBottom:'1px solid #222'},
 sub:{display:'block',color:'#888',fontSize:12,marginTop:5},
 listing:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:20,padding:'18px 0',borderBottom:'1px solid #222'},
 listingInfo:{display:'grid',gap:5},
 actions:{display:'flex',gap:8,flexWrap:'wrap'}
};
