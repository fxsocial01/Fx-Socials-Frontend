/**
 * Provider-neutral marketplace adapter.
 *
 * The application owns catalog/pricing/payment state. Provider credentials
 * stay in Render environment variables and are never exposed to the client.
 */

export class MarketplaceProvider {
  constructor({ name, apiKey, baseUrl, timeoutMs = 8000 }) {
    this.name = name;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl?.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  configured() {
    return Boolean(this.apiKey && this.baseUrl);
  }

  async request(path, { method = 'GET', body } = {}) {
    if (!this.configured()) throw new Error(`${this.name} provider is not configured`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || `${this.name} request failed (${response.status})`);
      }
      return data;
    } catch (e) {
      if (e?.name === 'AbortError') throw new Error(`${this.name} provider timed out. Please retry.`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function markupPrice(costNaira, markupNaira) {
  const cost = Number(costNaira);
  const markup = Number(markupNaira);
  if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(markup) || markup < 0) {
    throw new Error('Invalid provider cost or markup');
  }
  return Math.round((cost + markup) * 100) / 100;
}

export function grossMargin(saleNaira, providerCostNaira) {
  const sale = Number(saleNaira);
  const cost = Number(providerCostNaira);
  if (!Number.isFinite(sale) || !Number.isFinite(cost)) throw new Error('Invalid sale or provider cost');
  return Math.round((sale - cost) * 100) / 100;
}
