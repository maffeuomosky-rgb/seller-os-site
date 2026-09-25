import { json, requireGet } from '../lib/http.js';
import { paypalConfigured } from '../lib/paypal.js';
import { buildPayPalPaymentUrl } from '../lib/payment-links.js';

function paypalMode() {
  const requested = String(process.env.PAYPAL_MODE || '').trim().toLowerCase();
  if (requested === 'api' && paypalConfigured()) return 'api';
  if (process.env.PAYPAL_PAYMENT_URL) return 'link';
  if (paypalConfigured()) return 'api';
  return 'disabled';
}

export default async function handler(req, res) {
  if (!requireGet(req, res)) return;
  const priceCents = Number(process.env.PRODUCT_PRICE_CENTS || 4900);
  const currency = String(process.env.PRODUCT_CURRENCY || 'EUR').toUpperCase();
  const mode = paypalMode();
  json(res, 200, {
    product: process.env.PRODUCT_NAME || 'Seller OS 1.1',
    priceCents,
    currency,
    paypalEnabled: mode !== 'disabled',
    paypalMode: mode,
    paypalPaymentUrl: mode === 'link' ? buildPayPalPaymentUrl(process.env.PAYPAL_PAYMENT_URL, priceCents, currency) : null,
    paypalClientId: mode === 'api' ? process.env.PAYPAL_CLIENT_ID : null,
    paypalEnv: String(process.env.PAYPAL_ENV || 'sandbox').toLowerCase(),
    bankEnabled: Boolean(process.env.BANK_ACCOUNT_NAME && process.env.BANK_IBAN),
    supportEmail: process.env.SUPPORT_EMAIL || null
  });
}
