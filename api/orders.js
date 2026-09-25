import { createOrder } from '../lib/db.js';
import { cleanString, generateOpaqueToken, generateOrderId, hashToken, isValidEmail, normalizeEmail, ORDER_STATES } from '../lib/core.js';
import { assertAllowedOrigin, clientIp, json, publicBaseUrl, readJson, requirePost } from '../lib/http.js';
import { emailConfigured, orderReceivedEmailHtml, sendEmail } from '../lib/email.js';
import { allowRequest } from '../lib/rate-limit.js';
import { buildPayPalPaymentUrl } from '../lib/payment-links.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (!assertAllowedOrigin(req)) return json(res, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  if (!allowRequest(`create:${clientIp(req)}`, { limit: 8, windowMs: 60_000 })) return json(res, 429, { error: 'TOO_MANY_REQUESTS' });

  try {
    const body = await readJson(req);
    if (cleanString(body.website, 200)) return json(res, 400, { error: 'INVALID_REQUEST' });

    const name = cleanString(body.name, 140);
    const email = normalizeEmail(body.email);
    const emailConfirm = normalizeEmail(body.emailConfirm);
    const method = body.paymentMethod === 'bank' ? 'bank' : body.paymentMethod === 'paypal' ? 'paypal' : '';
    const consentTerms = body.consentTerms === true;
    const consentImmediate = body.consentImmediateDelivery === true;
    const marketing = body.marketingConsent === true;

    if (name.length < 2) return json(res, 400, { error: 'NAME_REQUIRED' });
    if (!isValidEmail(email)) return json(res, 400, { error: 'EMAIL_INVALID' });
    if (email !== emailConfirm) return json(res, 400, { error: 'EMAIL_MISMATCH' });
    if (!method) return json(res, 400, { error: 'PAYMENT_METHOD_REQUIRED' });
    if (!consentTerms || !consentImmediate) return json(res, 400, { error: 'CONSENT_REQUIRED' });
    if (method === 'bank' && !(process.env.BANK_ACCOUNT_NAME && process.env.BANK_IBAN)) return json(res, 503, { error: 'BANK_NOT_CONFIGURED' });
    if (method === 'paypal' && !(process.env.PAYPAL_PAYMENT_URL || (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET))) return json(res, 503, { error: 'PAYPAL_NOT_CONFIGURED' });

    const customerToken = generateOpaqueToken(32);
    const amountCents = Number(process.env.PRODUCT_PRICE_CENTS || 4900);
    const currency = String(process.env.PRODUCT_CURRENCY || 'EUR').toUpperCase();
    const maxDownloads = Math.max(1, Number(process.env.PRODUCT_MAX_DOWNLOADS || 5));

    let order;
    let lastError;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        order = await createOrder({
          id: generateOrderId(),
          customer_name: name,
          email,
          payment_method: method,
          amount_cents: amountCents,
          currency,
          order_status: ORDER_STATES.WAITING,
          customer_token_hash: hashToken(customerToken),
          max_downloads: maxDownloads,
          consent_terms: true,
          consent_immediate_delivery: true,
          marketing_consent: marketing
        });
        break;
      } catch (error) {
        lastError = error;
        if (String(error.code) !== '23505') throw error;
      }
    }
    if (!order) throw lastError || new Error('Impossibile creare ordine');

    const payload = {
      ok: true,
      orderId: order.id,
      customerToken,
      paymentMethod: method,
      amountCents,
      currency,
      status: order.order_status
    };
    if (method === 'bank') {
      payload.bank = {
        accountName: process.env.BANK_ACCOUNT_NAME,
        iban: process.env.BANK_IBAN,
        reference: `Seller OS · ${order.id}`
      };
    } else if (method === 'paypal' && process.env.PAYPAL_PAYMENT_URL) {
      payload.paypal = {
        mode: 'link',
        paymentUrl: buildPayPalPaymentUrl(process.env.PAYPAL_PAYMENT_URL, amountCents, currency),
        reference: `Seller OS · ${order.id}`
      };
    }
    if (emailConfigured()) {
      try {
        const base = publicBaseUrl(req).replace(/\/$/, '');
        const orderUrl = `${base}/ordine.html?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(customerToken)}`;
        await sendEmail({
          to: email,
          subject: `Ordine Seller OS ricevuto · ${order.id}`,
          html: orderReceivedEmailHtml({ customerName: name, orderId: order.id, orderUrl, paymentMethod: method, bank: payload.bank, paypal: payload.paypal })
        });
      } catch (emailError) { console.error('order acknowledgement email', emailError); }
    }
    json(res, 201, payload);
  } catch (error) {
    console.error('orders.create', error);
    json(res, 500, { error: 'ORDER_CREATE_FAILED' });
  }
}
