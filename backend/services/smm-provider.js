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

async function request(baseUrl, body, apiKey, useBearer) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
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
  const apiKey = marketplaceConfig.smm.apiKey;
  if (!apiKey) throw Object.assign(new Error('SMM provider is not configured on the server. Add SMM_API_KEY in Render.'), { status: 503 });

  let lastInvalid = null;
  for (const baseUrl of providerUrls()) {
    // SMM Panel Nigeria documents both Bearer authentication and the traditional key POST field.
    // Try Bearer first because it avoids proxies rewriting the key field, then fall back to form auth.
    for (const useBearer of [true, false]) {
      try {
        const { response, data } = await request(baseUrl, payload(action, params), apiKey, useBearer);
        if (response.ok && data && typeof data === 'object') {
          if (data.error) {
            throw Object.assign(new Error(String(data.error)), { status: response.status || 502 });
          }
          return data;
        }
        if (!response.ok && data?.error) {
          throw Object.assign(new Error(String(data.error)), { status: response.status || 502 });
        }
        lastInvalid = new Error(`SMM provider returned ${response.status} HTML/non-JSON at ${baseUrl}.`);
      } catch (error) {
        if (error?.name === 'AbortError') {
          lastInvalid = Object.assign(new Error('SMM provider is taking longer than expected. Please retry availability.'), { status: 504 });
          continue;
        }
        if (error?.status && error.status !== 502 && error.status !== 503 && error.status !== 504) throw error;
        lastInvalid = error;
      }
    }
  }

  throw Object.assign(lastInvalid || new Error('SMM provider is unavailable.'), { status: lastInvalid?.status || 502 });
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
