import { getOrder } from '../lib/db.js';
import { json, requireGet } from '../lib/http.js';

const TEST_ORDER_ID = 'SEL-260928-28B20780';

export default async function handler(req, res) {
  if (!requireGet(req, res)) return;
  try {
    const order = await getOrder(TEST_ORDER_ID);
    if (!order) return json(res, 404, { ok: false, error: 'TEST_ORDER_NOT_FOUND' });
    return json(res, 200, {
      ok: true,
      orderId: order.id,
      orderStatus: order.order_status,
      paymentStatus: order.payment_status,
      deliveryStatus: order.delivery_status,
      deliveryError: order.delivery_error || null,
      hasDownloadToken: Boolean(order.download_token_hash),
      downloadExpiresAt: order.download_expires_at || null,
      downloadCount: Number(order.download_count || 0),
      maxDownloads: Number(order.max_downloads || 0),
      paidAt: order.paid_at || null,
      deliveredAt: order.delivered_at || null,
      lastEmailAt: order.last_email_at || null
    });
  } catch (error) {
    return json(res, 500, { ok: false, error: 'E2E_STATE_CHECK_FAILED' });
  }
}
