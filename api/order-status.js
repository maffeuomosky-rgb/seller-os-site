import { getOrderByCustomerToken } from '../lib/db.js';
import { hashToken } from '../lib/core.js';
import { json, query, requireGet } from '../lib/http.js';
import { buildPayPalPaymentUrl } from '../lib/payment-links.js';

export default async function handler(req, res) {
  if (!requireGet(req, res)) return;
  try {
    const q = query(req);
    const id = q.get('id') || '';
    const token = q.get('token') || '';
    if (!id || !token) return json(res, 400, { error: 'MISSING_ORDER_AUTH' });
    const order = await getOrderByCustomerToken(id, hashToken(token));
    if (!order) return json(res, 404, { error: 'ORDER_NOT_FOUND' });
    const payload = {
      id: order.id,
      customerName: order.customer_name,
      email: order.email,
      paymentMethod: order.payment_method,
      amountCents: order.amount_cents,
      currency: order.currency,
      orderStatus: order.order_status,
      paymentStatus: order.payment_status,
      deliveryStatus: order.delivery_status,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      deliveredAt: order.delivered_at,
      canDownload: Boolean(order.download_token_hash) && ['PAGATO','CONSEGNATO'].includes(order.order_status) && order.download_expires_at && new Date(order.download_expires_at).getTime() > Date.now() && Number(order.download_count || 0) < Number(order.max_downloads || 0),
      downloadExpiresAt: order.download_expires_at,
      downloadCount: Number(order.download_count || 0),
      maxDownloads: Number(order.max_downloads || 0)
    };
    if (order.payment_method === 'bank') {
      payload.bank = {
        accountName: process.env.BANK_ACCOUNT_NAME || '',
        iban: process.env.BANK_IBAN || '',
        reference: `Seller OS · ${order.id}`
      };
    } else if (order.payment_method === 'paypal' && process.env.PAYPAL_PAYMENT_URL) {
      payload.paypal = {
        mode: 'link',
        paymentUrl: buildPayPalPaymentUrl(process.env.PAYPAL_PAYMENT_URL, order.amount_cents, order.currency),
        reference: `Seller OS · ${order.id}`
      };
    }
    json(res, 200, payload);
  } catch (error) {
    console.error('order-status', error);
    json(res, 500, { error: 'STATUS_FAILED' });
  }
}
