import { MarketplaceProvider } from './marketplace-provider.js';

export const marketplaceConfig = {
  esim: {
    provider: process.env.ESIM_PROVIDER || 'unset',
    baseUrl: process.env.ESIM_PROVIDER_BASE_URL,
    apiKey: process.env.ESIM_PROVIDER_API_KEY
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'unset',
    baseUrl: process.env.SMS_PROVIDER_BASE_URL,
    apiKey: process.env.SMS_PROVIDER_API_KEY,
    webhookSecret: process.env.SMS_PROVIDER_WEBHOOK_SECRET
  },
  smm: {
    provider: process.env.SMM_PROVIDER_2 || 'smm-africa',
    baseUrl: (process.env.SMM_PROVIDER_2_API_URL || 'https://smm.africa/api/v3').replace(/\/$/, ''),
    apiKey: String(process.env.SMM_PROVIDER_2_API_KEY || '').trim(),
    markupPercent: Number(process.env.SMM_MARKUP_PERCENT || 40)
  }
};

export function getMarketplaceProvider(category) {
  const config = marketplaceConfig[category];
  if (!config) throw new Error(`Unsupported marketplace category: ${category}`);
  return new MarketplaceProvider({
    name: config.provider,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl
  });
}
