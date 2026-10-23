import { marketplaceConfig } from './marketplace-config.js';

const timeoutMs = Number(process.env.SMM_PROVIDER_TIMEOUT_MS || 20000);

async function call(action, params = {}) {
  const { apiKey, baseUrl } = marketplaceConfig.smm;
  if (!apiKey) throw Object.assign(new Error('SMM provider is not configured on the server.'), { status: 503 });
  const body = new URLSearchParams({ key: apiKey, action, ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')) });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    if (!response.ok) throw Object.assign(new Error(data?.error || data?.message || `SMM provider request failed (${response.status})`), { status: response.status });
    if (data?.error) throw Object.assign(new Error(String(data.error)), { status: 502 });
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') throw Object.assign(new Error('Boosting provider is taking longer than expected. Please retry.'), { status: 504 });
    throw e;
  } finally { clearTimeout(timer); }
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
