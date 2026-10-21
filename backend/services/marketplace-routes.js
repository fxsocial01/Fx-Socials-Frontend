import crypto from 'crypto';
import { getMarketplaceProvider, marketplaceConfig } from './marketplace-config.js';

const moneyKobo = (n) => Math.round(Number(n) * 100);
const timingSafe = (a, b) => {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};

async function socioRequest(path, options = {}) {
  const base = (marketplaceConfig.sms.baseUrl || 'https://sociosms.com/api/public/v1').replace(/\/$/, '');
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${marketplaceConfig.sms.apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || body?.message || `SocioSMS request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.providerBody = body;
    throw error;
  }
  return body;
}

async function fulfillSmsRental(order, q) {
  if (order.category !== 'sms') return { status: order.status, providerOrderId: order.provider_order_id };
  if (order.provider_order_id) return { status: order.status, providerOrderId: order.provider_order_id };
  if (!marketplaceConfig.sms.apiKey) throw new Error('SMS provider is not configured');

  const product = await q('SELECT * FROM marketplace_products WHERE id=$1', [order.product_id]);
  if (!product.rowCount) throw new Error('Marketplace product not found');
  const p = product.rows[0];
  const metadata = p.metadata || {};
  const request = {
    service: p.service_code,
    ...(p.country_code ? { country: p.country_code } : {}),
    ...(metadata.server ? { server: metadata.server } : {}),
    ...(metadata.strategy ? { strategy: metadata.strategy } : {}),
    ...(metadata.maxPriceNgn ? { max_price_ngn: Number(metadata.maxPriceNgn) } : {}),
    ...(metadata.autoCancelAfter ? { auto_cancel_after: Number(metadata.autoCancelAfter) } : {})
  };

  await q("UPDATE marketplace_orders SET status='fulfilling',updated_at=now() WHERE id=$1 AND status IN ('paid','fulfillment_pending','failed')", [order.id]);
  const result = await socioRequest('/rentals', { method: 'POST', body: JSON.stringify(request) });
  const rental = result?.rental;
  if (!rental?.id) throw new Error('SMS provider did not return a rental');

  await q(`UPDATE marketplace_orders SET provider_order_id=$1,status='active',provider_payload=$2,updated_at=now() WHERE id=$3`, [rental.id, rental, order.id]);
  return { status: 'active', providerOrderId: rental.id, rental };
}

async function syncSmsRental(order, q) {
  if (order.category !== 'sms' || !order.provider_order_id || !marketplaceConfig.sms.apiKey) return null;
  const result = await socioRequest(`/rentals/${encodeURIComponent(order.provider_order_id)}`);
  const rental = result?.rental;
  if (!rental) return null;
  const nextStatus = rental.status === 'received' ? 'completed' : rental.status === 'expired' || rental.status === 'cancelled' ? 'refunded' : order.status;
  await q(`UPDATE marketplace_orders SET status=$1,provider_payload=$2,updated_at=now() WHERE id=$3`, [nextStatus, rental, order.id]);
  return rental;
}

export function registerMarketplaceRoutes({ app, pool, auth, admin }) {
  const q = (text, params = []) => pool.query(text, params);
  const ensureSchema = async () => {
    await q(`CREATE TABLE IF NOT EXISTS marketplace_products (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), category TEXT NOT NULL CHECK(category IN ('esim','sms')), provider TEXT NOT NULL, provider_product_id TEXT, country_code TEXT, service_code TEXT, name TEXT NOT NULL, description TEXT, provider_cost_kobo BIGINT NOT NULL DEFAULT 0, sale_price_kobo BIGINT NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'NGN', status TEXT NOT NULL DEFAULT 'active', metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS marketplace_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), product_id UUID NOT NULL REFERENCES marketplace_products(id), paystack_reference TEXT UNIQUE, provider_order_id TEXT, provider TEXT NOT NULL, category TEXT NOT NULL, amount_kobo BIGINT NOT NULL, provider_cost_kobo BIGINT, gross_margin_kobo BIGINT, status TEXT NOT NULL DEFAULT 'pending_payment', customer_payload JSONB NOT NULL DEFAULT '{}'::jsonb, provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS marketplace_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID REFERENCES marketplace_orders(id), provider TEXT NOT NULL, event_type TEXT NOT NULL, external_event_id TEXT, payload JSONB NOT NULL DEFAULT '{}'::jsonb, received_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(provider, external_event_id));
      ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS provider_order_id TEXT;
    `);
  };

  app.get('/api/marketplace/catalog', async (req, res) => {
    try {
      await ensureSchema();
      const params = []; const where = ["status='active'"];
      if (req.query.category) { params.push(String(req.query.category).toLowerCase()); where.push(`category=$${params.length}`); }
      if (req.query.country) { params.push(String(req.query.country).toUpperCase()); where.push(`country_code=$${params.length}`); }
      if (req.query.service) { params.push(String(req.query.service)); where.push(`service_code=$${params.length}`); }
      const r = await q(`SELECT id,category,provider,provider_product_id,country_code,service_code,name,description,provider_cost_kobo,sale_price_kobo,currency,metadata FROM marketplace_products WHERE ${where.join(' AND ')} ORDER BY category,country_code,name`, params);
      res.json({ products: r.rows.map(p => ({ ...p, providerCost: Number(p.provider_cost_kobo) / 100, price: Number(p.sale_price_kobo) / 100, grossMargin: (Number(p.sale_price_kobo) - Number(p.provider_cost_kobo)) / 100 })) });
    } catch { res.status(500).json({ error: 'Could not load marketplace catalog' }); }
  });

  app.get('/api/marketplace/orders', auth, async (req, res) => {
    try {
      await ensureSchema();
      const r = await q('SELECT id,category,provider,paystack_reference,provider_order_id,amount_kobo,provider_cost_kobo,gross_margin_kobo,status,provider_payload,created_at,updated_at FROM marketplace_orders WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
      const orders = [];
      for (const o of r.rows) {
        let providerPayload = o.provider_payload || {};
        if (o.category === 'sms' && o.provider_order_id && ['active', 'fulfilling'].includes(o.status)) {
          try { const rental = await syncSmsRental(o, q); if (rental) { providerPayload = rental; o.status = rental.status === 'received' ? 'completed' : rental.status === 'expired' || rental.status === 'cancelled' ? 'refunded' : o.status; } } catch {}
        }
        orders.push({ ...o, providerPayload, amount: Number(o.amount_kobo) / 100, providerCost: Number(o.provider_cost_kobo || 0) / 100, grossMargin: Number(o.gross_margin_kobo || 0) / 100 });
      }
      res.json({ orders });
    } catch (e) { res.status(500).json({ error: e.message || 'Could not load marketplace orders' }); }
  });

  app.get('/api/marketplace/orders/:id', auth, async (req, res) => {
    try {
      await ensureSchema();
      const r = await q('SELECT * FROM marketplace_orders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      if (!r.rowCount) return res.status(404).json({ error: 'Order not found' });
      const order = r.rows[0];
      if (order.category === 'sms' && order.provider_order_id) {
        try { const rental = await syncSmsRental(order, q); if (rental) order.provider_payload = rental; } catch {}
      }
      res.json({ order: { ...order, amount: Number(order.amount_kobo) / 100, providerCost: Number(order.provider_cost_kobo || 0) / 100, grossMargin: Number(order.gross_margin_kobo || 0) / 100 } });
    } catch (e) { res.status(500).json({ error: e.message || 'Could not load order' }); }
  });

  app.post('/api/marketplace/orders/initialize', auth, async (req, res) => {
    try {
      await ensureSchema();
      const r = await q("SELECT * FROM marketplace_products WHERE id=$1 AND status='active'", [req.body.productId]);
      if (!r.rowCount) return res.status(404).json({ error: 'Marketplace product not found' });
      const p = r.rows[0];
      const reference = `FXMKT-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
      const order = await q(`INSERT INTO marketplace_orders(user_id,product_id,paystack_reference,provider,category,amount_kobo,provider_cost_kobo,gross_margin_kobo,status,customer_payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'pending_payment',$9) RETURNING id`, [req.user.id, p.id, reference, p.provider, p.category, p.sale_price_kobo, p.provider_cost_kobo, Number(p.sale_price_kobo) - Number(p.provider_cost_kobo), req.body.customer || {}]);
      const pay = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: req.user.email, amount: Number(p.sale_price_kobo), reference, callback_url: `${process.env.FRONTEND_URL || ''}/#/marketplace` }) });
      const data = await pay.json();
      if (!data.status) return res.status(502).json({ error: data.message || 'Paystack initialization failed' });
      res.json({ ok: true, orderId: order.rows[0].id, reference, authorizationUrl: data.data.authorization_url, amount: Number(p.sale_price_kobo) / 100 });
    } catch (e) { res.status(500).json({ error: e.message || 'Could not initialize payment' }); }
  });

  const fulfillPaidOrder = async (orderId) => {
    const found = await q('SELECT * FROM marketplace_orders WHERE id=$1', [orderId]);
    if (!found.rowCount) throw new Error('Marketplace order not found');
    let order = found.rows[0];
    if (order.status === 'pending_payment') await q("UPDATE marketplace_orders SET status='paid',updated_at=now() WHERE id=$1", [order.id]);
    order = (await q('SELECT * FROM marketplace_orders WHERE id=$1', [order.id])).rows[0];
    if (order.category === 'sms') return fulfillSmsRental(order, q);
    return { status: order.status };
  };

  app.post('/api/marketplace/orders/verify', auth, async (req, res) => {
    try {
      const reference = String(req.body.reference || '');
      const found = await q('SELECT * FROM marketplace_orders WHERE paystack_reference=$1 AND user_id=$2', [reference, req.user.id]);
      if (!found.rowCount) return res.status(404).json({ error: 'Order reference not found' });
      const order = found.rows[0];
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
      const data = await response.json();
      if (!data.status || data.data?.status !== 'success') return res.status(400).json({ error: 'Payment is not verified yet' });
      if (Number(data.data.amount) !== Number(order.amount_kobo)) return res.status(400).json({ error: 'Verified amount does not match order amount' });
      await q("UPDATE marketplace_orders SET status=CASE WHEN status='pending_payment' THEN 'paid' ELSE status END,customer_payload=$1,updated_at=now() WHERE id=$2", [data.data, order.id]);
      const fulfillment = await fulfillPaidOrder(order.id);
      res.json({ ok: true, orderId: order.id, status: fulfillment.status, providerOrderId: fulfillment.providerOrderId || null, rental: fulfillment.rental || null });
    } catch (e) { res.status(e.status === 402 ? 502 : 500).json({ error: e.message || 'Payment verification or fulfillment failed' }); }
  });

  app.post('/api/marketplace/orders/:id/cancel', auth, async (req, res) => {
    try {
      const found = await q('SELECT * FROM marketplace_orders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      if (!found.rowCount) return res.status(404).json({ error: 'Order not found' });
      const order = found.rows[0];
      if (order.category !== 'sms' || !order.provider_order_id) return res.status(400).json({ error: 'This order cannot be cancelled here' });
      const result = await socioRequest(`/rentals/${encodeURIComponent(order.provider_order_id)}/cancel`, { method: 'POST' });
      const refunded = Number(result.refunded_ngn || 0);
      await q("UPDATE marketplace_orders SET status='refunded',provider_payload=$1,updated_at=now() WHERE id=$2", [result, order.id]);
      res.json({ ok: true, refunded: refunded, message: 'Rental cancelled and provider refund confirmed.' });
    } catch (e) { res.status(e.status === 409 ? 409 : 502).json({ error: e.message || 'Could not cancel rental' }); }
  });

  app.post('/api/marketplace/orders/:id/finish', auth, async (req, res) => {
    try {
      const found = await q('SELECT * FROM marketplace_orders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      if (!found.rowCount) return res.status(404).json({ error: 'Order not found' });
      const order = found.rows[0];
      if (order.category !== 'sms' || !order.provider_order_id) return res.status(400).json({ error: 'This order cannot be completed here' });
      await socioRequest(`/rentals/${encodeURIComponent(order.provider_order_id)}/finish`, { method: 'POST' });
      await q("UPDATE marketplace_orders SET status='completed',updated_at=now() WHERE id=$1", [order.id]);
      res.json({ ok: true });
    } catch (e) { res.status(502).json({ error: e.message || 'Could not complete rental' }); }
  });

  app.post('/api/marketplace/webhooks/paystack', async (req, res) => {
    const signature = req.headers['x-paystack-signature'];
    const raw = req.rawBody || JSON.stringify(req.body);
    if (!signature || !process.env.PAYSTACK_SECRET_KEY) return res.status(401).json({ error: 'Webhook authentication unavailable' });
    const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
    if (!timingSafe(signature, expected)) return res.status(401).json({ error: 'Invalid webhook signature' });
    try {
      if (req.body?.event === 'charge.success' && req.body?.data?.reference) {
        const found = await q('SELECT * FROM marketplace_orders WHERE paystack_reference=$1', [req.body.data.reference]);
        if (found.rowCount) {
          const order = found.rows[0];
          if (Number(req.body.data.amount) === Number(order.amount_kobo)) {
            await q("UPDATE marketplace_orders SET status=CASE WHEN status='pending_payment' THEN 'paid' ELSE status END,customer_payload=$1,updated_at=now() WHERE id=$2", [req.body.data, order.id]);
            try { await fulfillPaidOrder(order.id); } catch (e) { await q("UPDATE marketplace_orders SET status='failed',provider_payload=$1,updated_at=now() WHERE id=$2", [{ error: e.message }, order.id]); }
          }
        }
      }
      res.json({ received: true });
    } catch { res.status(500).json({ error: 'Could not process Paystack webhook' }); }
  });

  app.post('/api/marketplace/webhooks/provider', async (req, res) => {
    try {
      await ensureSchema();
      const signature = String(req.headers['x-sociosms-signature'] || '');
      const secret = marketplaceConfig.sms.webhookSecret;
      if (secret) {
        const raw = req.rawBody || JSON.stringify(req.body);
        const expected = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
        if (!timingSafe(signature, expected)) return res.status(401).json({ error: 'Invalid provider signature' });
      }
      const rental = req.body?.rental || {};
      const providerId = String(rental.id || '');
      const eventType = String(req.headers['x-sociosms-event'] || req.body?.event || 'provider.webhook');
      const eventId = providerId ? `${eventType}:${providerId}` : crypto.createHash('sha256').update(req.rawBody || JSON.stringify(req.body)).digest('hex');
      const provider = getMarketplaceProvider('sms');
      const order = providerId ? await q('SELECT * FROM marketplace_orders WHERE provider_order_id=$1', [providerId]) : { rowCount: 0 };
      const orderId = order.rowCount ? order.rows[0].id : null;
      await q('INSERT INTO marketplace_events(order_id,provider,event_type,external_event_id,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(provider,external_event_id) DO NOTHING', [orderId, provider.name, eventType, eventId, req.body]);
      if (order.rowCount) {
        const next = eventType === 'rental.code_received' ? 'completed' : eventType === 'rental.expired_refunded' || eventType === 'rental.cancelled' || rental.status === 'expired' || rental.status === 'cancelled' ? 'refunded' : 'active';
        await q('UPDATE marketplace_orders SET status=$1,provider_payload=$2,updated_at=now() WHERE id=$3', [next, rental, order.rows[0].id]);
      }
      res.json({ received: true });
    } catch (e) { res.status(500).json({ error: e.message || 'Could not process provider webhook' }); }
  });

  app.post('/api/admin/marketplace/products', auth, admin, async (req, res) => {
    try {
      await ensureSchema();
      const { category, provider, providerProductId, countryCode, serviceCode, name, description, providerCostNaira, salePriceNaira, metadata = {} } = req.body;
      const cost = Number(providerCostNaira), sale = Number(salePriceNaira);
      if (!['esim', 'sms'].includes(category) || !provider || !name || !Number.isFinite(cost) || !Number.isFinite(sale) || sale < cost) return res.status(400).json({ error: 'Invalid marketplace product or pricing' });
      const r = await q(`INSERT INTO marketplace_products(category,provider,provider_product_id,country_code,service_code,name,description,provider_cost_kobo,sale_price_kobo,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, [category, provider, providerProductId || null, countryCode ? String(countryCode).toUpperCase() : null, serviceCode || null, name, description || null, moneyKobo(cost), moneyKobo(sale), metadata]);
      res.json({ ok: true, id: r.rows[0].id, providerCost: cost, price: sale, grossMargin: sale - cost });
    } catch (e) { res.status(400).json({ error: e.message || 'Could not create product' }); }
  });

  app.get('/api/marketplace/provider-status', auth, admin, async (req, res) => {
    const out = {};
    for (const category of ['esim', 'sms']) { const p = getMarketplaceProvider(category); out[category] = { provider: p.name, configured: p.configured() }; }
    res.json(out);
  });
}
