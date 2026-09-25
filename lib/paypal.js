import { validateCompletedCapture } from './core.js';

function baseUrl() {
  return String(process.env.PAYPAL_ENV || 'sandbox').toLowerCase() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export async function paypalAccessToken() {
  if (!paypalConfigured()) throw new Error('PayPal non configurato');
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(`PayPal token error (${response.status})`);
  return data.access_token;
}

async function paypalFetch(path, options = {}) {
  const token = await paypalAccessToken();
  const response = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = data?.message || data?.details?.[0]?.description || `PayPal error ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export async function createPayPalOrder({ internalOrderId, amountCents, currency, customerName }) {
  const value = (Number(amountCents) / 100).toFixed(2);
  return paypalFetch('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: internalOrderId,
        custom_id: internalOrderId,
        description: 'Seller OS 1.1 — licenza personale',
        amount: { currency_code: currency, value }
      }]
    })
  });
}

export async function capturePayPalOrder(paypalOrderId) {
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    body: '{}'
  });
}

export async function getPayPalOrder(paypalOrderId) {
  return paypalFetch(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, { method: 'GET' });
}

export async function captureAndValidate({ paypalOrderId, amountCents, currency }) {
  let data;
  try {
    data = await capturePayPalOrder(paypalOrderId);
  } catch (error) {
    // Capture can already have happened via a retry/webhook. Query current order before failing.
    data = await getPayPalOrder(paypalOrderId);
  }
  const validated = validateCompletedCapture(data, amountCents, currency);
  if (!validated.ok) throw new Error(`Pagamento PayPal non verificato: ${validated.reason}`);
  return { order: data, capture: validated.capture };
}

export async function verifyPayPalWebhook(headers, event) {
  if (!process.env.PAYPAL_WEBHOOK_ID) throw new Error('PAYPAL_WEBHOOK_ID non configurato');
  const token = await paypalAccessToken();
  const response = await fetch(`${baseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transmission_id: headers['paypal-transmission-id'],
      transmission_time: headers['paypal-transmission-time'],
      cert_url: headers['paypal-cert-url'],
      auth_algo: headers['paypal-auth-algo'],
      transmission_sig: headers['paypal-transmission-sig'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: event
    })
  });
  const data = await response.json();
  return response.ok && data.verification_status === 'SUCCESS';
}
