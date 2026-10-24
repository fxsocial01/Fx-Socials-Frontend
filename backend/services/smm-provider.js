import { marketplaceConfig } from './marketplace-config.js';

const timeoutMs = Number(process.env.SMM_PROVIDER_TIMEOUT_MS || 30000);

function providerUrls() {
  const configured = String(marketplaceConfig.smm.baseUrl || '').replace(/\/$/, '');
  return [...new Set([configured, 'https://app.smmpanel.ng/api/v2'].filter(Boolean))];
}

function payload(action, params = {}) {
  return new URLSearchParams({
    action,
    ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  });
}

async function request(baseUrl, apiKey, action, params, useBearer) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body = payload(action, params);
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'FX-Socials/1.0'
    };
    if (useBearer) headers.Authorization = `Bearer ${apiKey}`;
    else body.set('key', apiKey);

    const response = await fetch(baseUrl, { method: 'POST', signal: controller.signal, headers, body });
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { response, data, text };
  } finally {
    clearTimeout(timer);
  }
}

async function call(action, params = {}) {
  const apiKey = String(marketplaceConfig.smm.apiKey || '').trim();
  if (!apiKey) throw Object.assign(new Error('SMM provider is not configured on the server. Add SMM_API_KEY in Render.'), { status: 503 });

  let lastError = null;
  for (const baseUrl of providerUrls()) {
    // The provider documents form-encoded `key` authentication, so use that first.
    // Bearer is retained as a compatibility fallback.
    for (const useBearer of [false, true]) {
      try {
        const { response, data } = await request(baseUrl, apiKey, action, params, useBearer);
        if (response.ok && data && typeof data === 'object') {
          if (data.error) throw Object.assign(new Error(String(data.error)), { status: response.status || 502 });
          return data;
        }

        if (data?.error) {
          throw Object.assign(new Error(String(data.error)), { status: response.status || 502 });
        }

        if (response.status === 401 || response.status === 403) {
          lastError = Object.assign(
            new Error('SMM provider rejected the API credentials (HTTP ' + response.status + '). Check that the SMM_API_KEY in Render is a valid active API key from SMM Panel Nigeria and that API access is enabled for the account.'),
            { status: 502, providerStatus: response.status }
          );
          continue;
        }

        lastError = Object.assign(new Error(`SMM provider returned ${response.status} non-JSON at ${baseUrl}.`), { status: 502, providerStatus: response.status });
      } catch (error) {
        if (error?.name === 'AbortError') {
          lastError = Object.assign(new Error('SMM provider is taking longer than expected. Please retry availability.'), { status: 504 });
          continue;
        }
        lastError = error;
      }
    }
  }

  throw lastError || Object.assign(new Error('SMM provider is unavailable.'), { status: 502 });
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
