import { requireAdmin, verifyAdminCsrf } from '../lib/admin-auth.js';
import { getOrder, markPaid, setOrderState } from '../lib/db.js';
import { ORDER_STATES } from '../lib/core.js';
import { createDownloadLink, deliverOrder } from '../lib/delivery.js';
import { json, publicBaseUrl, readJson, requirePost } from '../lib/http.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  const auth = requireAdmin(req);
  if (!auth) return json(res, 401, { error: 'UNAUTHORIZED' });
  if (!verifyAdminCsrf(req, auth)) return json(res, 403, { error: 'CSRF_FAILED' });

  try {
    const body = await readJson(req);
    const order = await getOrder(body.orderId || '');
    if (!order) return json(res, 404, { error: 'ORDER_NOT_FOUND' });
    const action = String(body.action || '');

    if (action === 'confirm_manual' || action === 'confirm_bank') {
      if (!['bank','paypal'].includes(order.payment_method)) return json(res, 409, { error: 'NOT_MANUAL_PAYMENT_ORDER' });
      if (!['IN_ATTESA_PAGAMENTO','PAGAMENTO_DA_VERIFICARE'].includes(order.order_status)) return json(res, 409, { error: 'ORDER_NOT_WAITING_FOR_PAYMENT' });
      const paid = await markPaid(order.id, null);
      const delivery = await deliverOrder(paid, publicBaseUrl(req));
      return json(res, 200, { ok: true, deliveryOk: delivery.ok, deliveryError: delivery.error || null });
    }
    if (action === 'resend_delivery') {
      if (!['PAGATO','CONSEGNATO'].includes(order.order_status)) return json(res, 409, { error: 'ORDER_NOT_PAID' });
      const delivery = await deliverOrder(order, publicBaseUrl(req), { force: true });
      return json(res, 200, { ok: true, deliveryOk: delivery.ok, deliveryError: delivery.error || null, downloadUrl: delivery.downloadUrl || null });
    }
    if (action === 'regenerate_download') {
      if (!['PAGATO','CONSEGNATO'].includes(order.order_status)) return json(res, 409, { error: 'ORDER_NOT_PAID' });
      const download = await createDownloadLink(order, publicBaseUrl(req));
      return json(res, 200, { ok: true, downloadUrl: download.downloadUrl, expiresAt: download.expiresAt, maxDownloads: download.maxDownloads });
    }
    if (action === 'cancel') {
      const updated = await setOrderState(order.id, ORDER_STATES.CANCELLED);
      return json(res, 200, { ok: true, status: updated?.order_status });
    }
    if (action === 'mark_refunded') {
      const updated = await setOrderState(order.id, ORDER_STATES.REFUNDED);
      return json(res, 200, { ok: true, status: updated?.order_status });
    }
    return json(res, 400, { error: 'UNKNOWN_ACTION' });
  } catch (error) {
    console.error('admin-action', error);
    json(res, 500, { error: 'ADMIN_ACTION_FAILED', message: error.message });
  }
}
