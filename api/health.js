import { json, requireGet } from '../lib/http.js';
import { ensureSchema, getOrder } from '../lib/db.js';

const E2E_ORDER_ID = 'SEL-260928-28B20780';

export default async function handler(req, res) {
  if (!requireGet(req, res)) return;

  let database = false;
  let e2eTest = null;
  if (process.env.DATABASE_URL) {
    try {
      await ensureSchema();
      database = true;
      const order = await getOrder(E2E_ORDER_ID);
      if (order) {
        e2eTest = {
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
        };
      }
    } catch {
      database = false;
    }
  }

  json(res, 200, {
    ok: true,
    checkout: {
      database,
      paypal: Boolean(process.env.PAYPAL_PAYMENT_URL || (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_WEBHOOK_ID)),
      bank: Boolean(process.env.BANK_ACCOUNT_NAME && process.env.BANK_IBAN),
      email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      product: Boolean((process.env.PRODUCT_BLOB_PATHNAME && process.env.BLOB_READ_WRITE_TOKEN) || process.env.PRODUCT_FILE_PATH),
      admin: Boolean(process.env.ADMIN_SECRET && (process.env.SESSION_SECRET || process.env.ADMIN_SECRET))
    },
    e2eTest
  });
}
