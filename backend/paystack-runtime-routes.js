import crypto from 'node:crypto';
import pg from 'pg';
const { Pool } = pg;

export function registerPaystackRuntimeRoutes({ app }) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined,
  });
  const frontend = (process.env.FRONTEND_URL || 'https://fx-socials-site.onrender.com').replace(/\/+$/, '');
  const paystack = async (reference) => {
    if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('Paystack is not configured');
    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.status) throw new Error(String(d.message || 'Paystack verification failed'));
    return d.data;
  };

  async function credit(reference) {
    const tx = await paystack(reference);
    if (tx.status !== 'success' || String(tx.currency || '').toUpperCase() !== 'NGN') return { ok: false, reason: 'not_successful' };
    const amount = Number(tx.amount || 0);
    if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, reason: 'invalid_amount' };
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const p = (await c.query('SELECT user_id, requested_kobo, status FROM payments WHERE reference=$1 FOR UPDATE', [reference])).rows[0];
      if (!p) { await c.query('ROLLBACK'); return { ok: false, reason: 'payment_not_found' }; }
      if (p.status === 'success') { await c.query('COMMIT'); return { ok: true, already: true }; }
      if (Number(p.requested_kobo) !== amount) { await c.query('ROLLBACK'); return { ok: false, reason: 'amount_mismatch' }; }
      await c.query('UPDATE payments SET charged_kobo=$1,status=$2 WHERE reference=$3', [amount, 'success', reference]);
      await c.query('UPDATE users SET balance_kobo=balance_kobo+$1 WHERE id=$2', [amount, p.user_id]);
      await c.query('COMMIT');
      return { ok: true, already: false };
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { c.release(); }
  }

  app.get('/api/wallet/callback', async (req, res) => {
    const ref = String(req.query?.reference || req.query?.trxref || '').trim();
    const ok = `${frontend}/#/wallet?payment=success`;
    const fail = `${frontend}/#/wallet?payment=failed`;
    if (!ref) return res.redirect(`${fail}&reason=missing_reference`);
    try {
      const result = await credit(ref);
      return res.redirect(result.ok ? `${ok}&reference=${encodeURIComponent(ref)}` : `${fail}&reason=${result.reason}`);
    } catch (e) {
      console.error('Paystack callback error:', e.message);
      return res.redirect(`${fail}&reason=verification_failed`);
    }
  });

  app.post('/api/wallet/webhook', async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    const signature = String(req.headers['x-paystack-signature'] || '');
    const raw = req.rawBody || '';
    if (!secret || !signature || !raw) return res.sendStatus(401);
    const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.sendStatus(401);
    if (req.body?.event !== 'charge.success') return res.sendStatus(200);
    const ref = String(req.body?.data?.reference || '').trim();
    if (!ref) return res.sendStatus(200);
    try {
      const result = await credit(ref);
      return res.sendStatus(result.ok ? 200 : 200);
    } catch (e) {
      console.error('Paystack webhook error:', e.message);
      return res.sendStatus(500);
    }
  });
}
