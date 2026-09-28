import { requireAdmin } from '../lib/admin-auth.js';
import { listOrders } from '../lib/db.js';
import { json, query, requireGet } from '../lib/http.js';

export default async function handler(req, res) {
  if (!requireGet(req, res)) return;
  if (!requireAdmin(req)) return json(res, 401, { error: 'UNAUTHORIZED' });
  try {
    const q = query(req);
    const rows = await listOrders({ status: q.get('status') || '', method: q.get('method') || '', limit: 150 });
    json(res, 200, { orders: rows.map(o => ({
      id:o.id, customerName:o.customer_name, email:o.email, paymentMethod:o.payment_method,
      amountCents:o.amount_cents, currency:o.currency, orderStatus:o.order_status,
      paymentStatus:o.payment_status, deliveryStatus:o.delivery_status, paypalOrderId:o.paypal_order_id,
      downloadCount:o.download_count, maxDownloads:o.max_downloads, deliveryError:o.delivery_error,
      createdAt:o.created_at, paidAt:o.paid_at, deliveredAt:o.delivered_at
    })) });
  } catch (error) {
    console.error('admin-orders', error);
    json(res, 500, { error: 'ADMIN_ORDERS_FAILED' });
  }
}
