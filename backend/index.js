import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 10000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : undefined,
});

app.use(cors({ origin: FRONTEND_URL === '*' ? true : FRONTEND_URL }));
app.use(express.json());

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'yasiyrshehu@gmail.com').trim().toLowerCase();

function moneyKobo(value) {
  return Math.round(Number(value) * 100);
}

function tokenFor(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

function auth(req, res, next) {
  try {
    const raw = String(req.body?.sessionToken || req.headers.authorization || '')
      .replace(/^Bearer\s+/i, '')
      .trim();
    if (!raw) throw new Error('Missing token');
    req.user = jwt.verify(raw, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

function admin(req, res, next) {
  if (req.user?.role !== 'admin' || req.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function enc(value) {
  const key = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY || '', 'base64');
  if (key.length !== 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return [iv.toString('base64'), encrypted.toString('base64'), cipher.getAuthTag().toString('base64')].join('.');
}

function dec(value) {
  const [ivB, dataB, tagB] = String(value).split('.');
  const key = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY || '', 'base64');
  if (key.length !== 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

async function q(text, params = []) {
  return pool.query(text, params);
}

async function init() {
  await q(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS users(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      balance_kobo BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS products(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      platform TEXT NOT NULL,
      username TEXT NOT NULL,
      login_enc TEXT NOT NULL,
      password_enc TEXT NOT NULL,
      price_kobo BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS orders(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      product_id UUID REFERENCES products(id),
      product_name TEXT NOT NULL,
      amount_kobo BIGINT NOT NULL,
      status TEXT NOT NULL,
      delivery_login_enc TEXT,
      delivery_password_enc TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS payments(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      reference TEXT UNIQUE NOT NULL,
      requested_kobo BIGINT NOT NULL,
      charged_kobo BIGINT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS wallet_audit(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID NOT NULL REFERENCES users(id),
      user_id UUID NOT NULL REFERENCES users(id),
      amount_kobo BIGINT NOT NULL,
      type TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  if (process.env.ADMIN_BOOTSTRAP_PASSWORD) {
    const existing = await q('SELECT id, role FROM users WHERE email=$1', [ADMIN_EMAIL]);
    const hash = await bcrypt.hash(process.env.ADMIN_BOOTSTRAP_PASSWORD, 12);
    if (!existing.rowCount) {
      await q(
        'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)',
        ['Fx Socials Admin', ADMIN_EMAIL, hash, 'admin'],
      );
    } else {
      await q(
        'UPDATE users SET role=$1, password_hash=$2, name=$3 WHERE email=$4',
        ['admin', hash, 'Fx Socials Admin', ADMIN_EMAIL],
      );
    }
  }
}

app.get('/health', (req, res) => res.json({ ok: true, brand: 'Fx Socials' }));

app.get('/api/products', async (req, res) => {
  try {
    const result = await q(
      "SELECT id,platform,username,price_kobo,status,description FROM products WHERE status='available' ORDER BY created_at DESC",
    );
    res.json({
      products: result.rows.map((x) => ({
        id: x.id,
        platform: x.platform,
        username: x.username,
        price: Number(x.price_kobo) / 100,
        status: x.status,
        description: x.description || '',
      })),
    });
  } catch {
    res.status(500).json({ error: 'Could not load the store' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (email === ADMIN_EMAIL) {
      return res.status(403).json({ error: 'This email is reserved for the store administrator' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await q(
      'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role',
      [name, email, hash, 'customer'],
    );
    const user = result.rows[0];
    res.json({
      token: tokenFor(user),
      user: { userId: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    res.status(400).json({ error: e?.code === '23505' ? 'Email already registered' : 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Enter email and password' });

    let result = await q('SELECT * FROM users WHERE email=$1', [email]);
    let user = result.rows[0];

    if (email === ADMIN_EMAIL && process.env.ADMIN_BOOTSTRAP_PASSWORD && password === process.env.ADMIN_BOOTSTRAP_PASSWORD) {
      const hash = await bcrypt.hash(password, 12);
      if (!user) {
        result = await q(
          'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING *',
          ['Fx Socials Admin', email, hash, 'admin'],
        );
      } else {
        result = await q(
          'UPDATE users SET name=$1,password_hash=$2,role=$3 WHERE id=$4 RETURNING *',
          ['Fx Socials Admin', hash, 'admin', user.id],
        );
      }
      user = result.rows[0];
    } else if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      token: tokenFor(user),
      user: { userId: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', auth, (req, res) => res.json({ ok: true }));

app.post('/api/me/wallet', auth, async (req, res) => {
  const result = await q('SELECT balance_kobo FROM users WHERE id=$1', [req.user.id]);
  res.json({ wallet: { balance: Number(result.rows[0]?.balance_kobo || 0) / 100 } });
});

app.post('/api/me/orders', auth, async (req, res) => {
  const result = await q(
    'SELECT id,product_name,amount_kobo,status,created_at,delivery_login_enc,delivery_password_enc FROM orders WHERE user_id=$1 ORDER BY created_at DESC',
    [req.user.id],
  );
  res.json({
    orders: result.rows.map((x) => ({
      id: x.id,
      productName: x.product_name,
      amount: Number(x.amount_kobo) / 100,
      status: x.status,
      createdAt: x.created_at,
      delivery: x.delivery_login_enc
        ? `Login: ${dec(x.delivery_login_enc)}\nPassword: ${dec(x.delivery_password_enc)}`
        : 'Pending',
    })),
  });
});

app.post('/api/wallet/initialize', auth, async (req, res) => {
  const requested = Math.round(Number(req.body?.amountNaira));
  if (!Number.isFinite(requested) || requested < 100 || requested > 5000000) {
    return res.status(400).json({ error: 'Enter an amount between ₦100 and ₦5,000,000' });
  }
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(503).json({ error: 'Paystack secret key is not configured on the Render backend' });
  }

  const reference = `FXWALLET-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  await q(
    'INSERT INTO payments(user_id,reference,requested_kobo,charged_kobo,status) VALUES($1,$2,$3,$3,$4)',
    [req.user.id, reference, moneyKobo(requested), 'pending'],
  );

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user.email,
        amount: moneyKobo(requested),
        reference,
        currency: 'NGN',
        callback_url: `${FRONTEND_URL}/#/wallet`,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
      const message = String(data.message || 'Paystack initialization failed');
      return res.status(502).json({
        error: message.toLowerCase().includes('invalid key')
          ? 'Paystack rejected the server key. In Render, PAYSTACK_SECRET_KEY must be your current live secret key (sk_live_...). Do not paste the key into chat.'
          : message,
      });
    }
    res.json({ authorizationUrl: data.data.authorization_url, reference });
  } catch {
    res.status(502).json({ error: 'Could not reach Paystack. Please try again later.' });
  }
});

app.post('/api/wallet/verify', auth, async (req, res) => {
  const reference = String(req.body?.reference || '').trim();
  if (!reference) return res.status(400).json({ error: 'Payment reference is required' });

  const payment = await q(
    'SELECT * FROM payments WHERE reference=$1 AND user_id=$2',
    [reference, req.user.id],
  );
  if (!payment.rowCount) return res.status(404).json({ error: 'Payment reference not found' });
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(503).json({ error: 'Paystack secret key is not configured on the Render backend' });
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
  );
  const data = await response.json();
  if (!response.ok || !data.status) {
    const message = String(data.message || 'Paystack verification failed');
    return res.status(502).json({
      error: message.toLowerCase().includes('invalid key')
        ? 'Paystack rejected the server key. Check PAYSTACK_SECRET_KEY in Render; do not pay again.'
        : message,
    });
  }
  if (data.data?.status !== 'success') {
    return res.status(400).json({ error: `Paystack reports this transaction as ${data.data?.status || 'not successful'}. Do not pay again.` });
  }
  if (String(data.data?.currency || '').toUpperCase() !== 'NGN') {
    return res.status(400).json({ error: 'Paystack returned a non-NGN transaction. Wallet was not credited.' });
  }

  const requested = Number(payment.rows[0].requested_kobo);
  const requestedFromPaystack = Number(data.data?.requested_amount);
  const charged = Number(data.data?.amount || 0);
  if (Number.isFinite(requestedFromPaystack) && requestedFromPaystack !== requested) {
    return res.status(400).json({ error: 'Paystack amount does not match the original wallet top-up. Do not pay again; contact support with the reference.' });
  }
  if (!Number.isFinite(requestedFromPaystack) && charged !== requested) {
    return res.status(400).json({ error: 'Paystack amount does not match the original wallet top-up. Do not pay again; contact support with the reference.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query('SELECT * FROM payments WHERE reference=$1 FOR UPDATE', [reference]);
    if (!locked.rowCount) throw new Error('Payment record disappeared');
    if (locked.rows[0].status === 'success') {
      await client.query('COMMIT');
      return res.json({ message: 'Payment already credited.' });
    }
    await client.query(
      'UPDATE payments SET charged_kobo=$1,status=$2 WHERE reference=$3',
      [charged, 'success', reference],
    );
    await client.query(
      'UPDATE users SET balance_kobo=balance_kobo+$1 WHERE id=$2',
      [requested, req.user.id],
    );
    await client.query('COMMIT');
    res.json({ message: `Payment verified. ₦${requested / 100} credited to your wallet.` });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Could not credit wallet' });
  } finally {
    client.release();
  }
});

app.post('/api/orders', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const productResult = await client.query(
      "SELECT * FROM products WHERE id=$1 AND status='available' FOR UPDATE",
      [req.body?.productId],
    );
    if (!productResult.rowCount) throw new Error('Account unavailable');
    const product = productResult.rows[0];
    const userResult = await client.query('SELECT balance_kobo FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
    if (Number(userResult.rows[0].balance_kobo) < Number(product.price_kobo)) throw new Error('Insufficient wallet balance');
    await client.query('UPDATE users SET balance_kobo=balance_kobo-$1 WHERE id=$2', [product.price_kobo, req.user.id]);
    await client.query("UPDATE products SET status='sold' WHERE id=$1", [product.id]);
    await client.query(
      'INSERT INTO orders(user_id,product_id,product_name,amount_kobo,status,delivery_login_enc,delivery_password_enc) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [req.user.id, product.id, product.username, product.price_kobo, 'completed', product.login_enc, product.password_enc],
    );
    await client.query('COMMIT');
    res.json({ message: 'Purchase successful. Your account details are in My Orders.' });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message || 'Purchase failed' });
  } finally {
    client.release();
  }
});

app.post('/api/admin/products', auth, admin, async (req, res) => {
  const { platform, accountLabel, accountLogin, accountPassword, price, description } = req.body || {};
  if (!accountLogin || !accountPassword || Number(price) < 1) {
    return res.status(400).json({ error: 'Login, password and price are required' });
  }
  try {
    const result = await q(
      'INSERT INTO products(platform,username,login_enc,password_enc,price_kobo,description) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
      [platform || 'Instagram', accountLabel || accountLogin, enc(accountLogin), enc(accountPassword), moneyKobo(price), description || null],
    );
    res.json({ id: result.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Could not save listing' });
  }
});

app.post('/api/admin/products/list', auth, admin, async (req, res) => {
  const result = await q('SELECT id,platform,username,price_kobo,status,description FROM products ORDER BY created_at DESC');
  res.json({ products: result.rows.map((x) => ({ ...x, price: Number(x.price_kobo) / 100, loginSaved: true })) });
});

app.post('/api/admin/products/delete', auth, admin, async (req, res) => {
  await q("UPDATE products SET status='removed' WHERE id=$1", [req.body?.productId]);
  res.json({ ok: true });
});

app.post('/api/admin/users', auth, admin, async (req, res) => {
  const result = await q(
    "SELECT id AS \"userId\",name,email,balance_kobo AS balance,created_at AS \"createdAt\" FROM users WHERE role='customer' ORDER BY created_at DESC",
  );
  res.json({ users: result.rows.map((x) => ({ ...x, balance: Number(x.balance) / 100 })) });
});

async function adjustWallet(req, res, type) {
  const amount = moneyKobo(req.body?.amountNaira);
  if (!Number.isFinite(amount) || amount < 100) return res.status(400).json({ error: 'Minimum adjustment is ₦100' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const target = await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.body?.userId]);
    if (!target.rowCount) throw new Error('User not found');
    const delta = type === 'refund' ? amount : amount;
    await client.query('UPDATE users SET balance_kobo=balance_kobo+$1 WHERE id=$2', [delta, req.body.userId]);
    await client.query(
      'INSERT INTO wallet_audit(admin_id,user_id,amount_kobo,type) VALUES($1,$2,$3,$4)',
      [req.user.id, req.body.userId, amount, type],
    );
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message || 'Wallet adjustment failed' });
  } finally {
    client.release();
  }
}

app.post('/api/admin/users/add-funds', auth, admin, (req, res) => adjustWallet(req, res, 'add-funds'));
app.post('/api/admin/users/refund', auth, admin, (req, res) => adjustWallet(req, res, 'refund'));

app.post('/api/admin/orders', auth, admin, async (req, res) => {
  const result = await q(
    'SELECT o.id,o.product_name,o.amount_kobo,o.status,o.created_at,u.email AS user_email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 100',
  );
  res.json({
    orders: result.rows.map((x) => ({
      ...x,
      productName: x.product_name,
      amount: Number(x.amount_kobo) / 100,
      userEmail: x.user_email,
      createdAt: x.created_at,
    })),
  });
});

init()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Fx Socials API listening on ${PORT}`)))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
