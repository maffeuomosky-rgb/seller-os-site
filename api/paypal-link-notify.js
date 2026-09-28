import { getOrderByCustomerToken, markPaymentNotified } from '../lib/db.js';
import { hashToken } from '../lib/core.js';
import { assertAllowedOrigin, json, readJson, requirePost } from '../lib/http.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (!assertAllowedOrigin(req)) return json(res, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  try {
    const body = await readJson(req);
    const order = await getOrderByCustomerToken(body.orderId || '', hashToken(body.customerToken || ''));
    if (!order || order.payment_method !== 'paypal') return json(res, 404, { error: 'ORDER_NOT_FOUND' });
    if (!process.env.PAYPAL_PAYMENT_URL) return json(res, 503, { error: 'PAYPAL_LINK_NOT_CONFIGURED' });
    const updated = await markPaymentNotified(order.id, 'paypal');
    json(res, 200, { ok: true, status: updated?.order_status || order.order_status });
  } catch (error) {
    console.error('paypal-link-notify', error);
    json(res, 500, { error: 'PAYPAL_NOTIFY_FAILED' });
  }
}
