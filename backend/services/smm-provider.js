import { marketplaceConfig } from './marketplace-config.js';

const timeoutMs = Number(process.env.SMM_PROVIDER_TIMEOUT_MS || 30000);

function providerUrls() {
  const configured = String(marketplaceConfig.smm.baseUrl || '').replace(/\/$/, '');
  const candidates = [configured, 'https://app.smmpanel.ng/api/v2', 'https://www.smmpanel.ng/api/v2', 'https://smmpanel.ng/api/v2'];
  return [...new Set(candidates.filter(Boolean))];
}

async function call(action, params = {}) {
  const { apiKey } = marketplaceConfig.smm;
  if (!apiKey) throw Object.assign(new Error('SMM provider is not configured on the server.'), { status: 503 });
  const body = new URLSearchParams({ key: apiKey, action, ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')) });
  let lastInvalid = null;
  for (const baseUrl of providerUrls()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(baseUrl, { method:'POST', signal:controller.signal, headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'}, body });
      const text = await response.text();
      let data = null;
      try { data = JSON.parse(text); } catch {}
      if (!response.ok) {
        if (data?.error) throw Object.assign(new Error(String(data.error)), { status: response.status });
        lastInvalid = new Error(`SMM provider HTTP ${response.status} at ${baseUrl}`);
        continue;
      }
      if (!data || typeof data !== 'object') {
        lastInvalid = new Error(`SMM provider returned HTML/non-JSON at ${baseUrl}`);
        continue;
      }
      if (data.error) throw Object.assign(new Error(String(data.error)), { status: 502 });
      return data;
    } catch (e) {
      if (e?.name === 'AbortError') {
        lastInvalid = Object.assign(new Error('SMM provider is taking longer than expected. Please retry availability.'), { status: 504 });
        continue;
      }
      if (e?.status) throw e;
      lastInvalid = e;
    } finally { clearTimeout(timer); }
  }
  throw Object.assign(lastInvalid || new Error('SMM provider is unavailable.'), { status:lastInvalid?.status || 502 });
}

export const smm = {
  services: () => call('services'),
  add: ({ service, link, quantity }) => call('add', { service, link, quantity: String(quantity) }),
  status: order => call('status', { order: String(order) }),
  refill: order => call('refill', { order: String(order) })
};

export const retailFromRate = providerRate => {
  const rate = Number(providerRate || 0);
  return Math.round(rate * (1 + marketplaceConfig.smm.markupPercent / 100) * 100) / 100;
};

export const retailTotal = (providerRate, quantity) => Math.round(retailFromRate(providerRate) * (Number(quantity) / 1000) * 100) / 100;
