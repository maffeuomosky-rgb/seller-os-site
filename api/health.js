import { json, requireGet } from '../lib/http.js';
import { ensureSchema } from '../lib/db.js';

export default async function handler(req, res) {
  if (!requireGet(req, res)) return;

  let database = false;
  if (process.env.DATABASE_URL) {
    try {
      await ensureSchema();
      database = true;
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
    }
  });
}
