import crypto from 'node:crypto';

export const DEFAULT_PRICE_CENTS = 4900;
export const DEFAULT_CURRENCY = 'EUR';
export const ORDER_STATES = Object.freeze({
  CREATED: 'CREATO',
  WAITING: 'IN_ATTESA_PAGAMENTO',
  BANK_REVIEW: 'PAGAMENTO_DA_VERIFICARE',
  PAID: 'PAGATO',
  DELIVERED: 'CONSEGNATO',
  CANCELLED: 'ANNULLATO',
  REFUNDED: 'RIMBORSATO'
});

export function cleanString(value, max = 500) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

export function normalizeEmail(value) {
  return cleanString(value, 254).toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateOrderId(now = new Date(), randomBytes = crypto.randomBytes) {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const suffix = randomBytes(4).toString('hex').slice(0, 8).toUpperCase();
  return `SEL-${yy}${mm}${dd}-${suffix}`;
}

export function generateOpaqueToken(size = 32) {
  return crypto.randomBytes(size).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function timingSafeEqualText(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function verifyPaymentAmount(amount, expectedCents = DEFAULT_PRICE_CENTS, expectedCurrency = DEFAULT_CURRENCY) {
  if (!amount || typeof amount !== 'object') return false;
  const currency = String(amount.currency_code || amount.currency || '').toUpperCase();
  const value = Number.parseFloat(amount.value);
  if (!Number.isFinite(value)) return false;
  return currency === String(expectedCurrency).toUpperCase() && Math.round(value * 100) === Number(expectedCents);
}

export function extractPayPalCapture(orderPayload) {
  const units = Array.isArray(orderPayload?.purchase_units) ? orderPayload.purchase_units : [];
  for (const unit of units) {
    const captures = unit?.payments?.captures;
    if (Array.isArray(captures) && captures.length) {
      const completed = captures.find(x => x?.status === 'COMPLETED') || captures[0];
      return completed || null;
    }
  }
  return null;
}

export function validateCompletedCapture(orderPayload, expectedCents, expectedCurrency) {
  if (!orderPayload || orderPayload.status !== 'COMPLETED') return { ok: false, reason: 'ORDER_NOT_COMPLETED' };
  const capture = extractPayPalCapture(orderPayload);
  if (!capture || capture.status !== 'COMPLETED') return { ok: false, reason: 'CAPTURE_NOT_COMPLETED' };
  if (!verifyPaymentAmount(capture.amount, expectedCents, expectedCurrency)) return { ok: false, reason: 'AMOUNT_OR_CURRENCY_MISMATCH' };
  return { ok: true, capture };
}

export function validateWebhookCapture(resource, expectedCents, expectedCurrency) {
  if (!resource || resource.status !== 'COMPLETED') return { ok: false, reason: 'CAPTURE_NOT_COMPLETED' };
  if (!verifyPaymentAmount(resource.amount, expectedCents, expectedCurrency)) return { ok: false, reason: 'AMOUNT_OR_CURRENCY_MISMATCH' };
  return { ok: true, capture: resource };
}

export function downloadEligibility(order, now = new Date()) {
  if (!order) return { ok: false, reason: 'NOT_FOUND' };
  if (!['PAGATO', 'CONSEGNATO'].includes(order.order_status)) return { ok: false, reason: 'NOT_PAID' };
  if (!order.download_expires_at) return { ok: false, reason: 'NO_TOKEN' };
  if (new Date(order.download_expires_at).getTime() <= now.getTime()) return { ok: false, reason: 'EXPIRED' };
  const count = Number(order.download_count || 0);
  const max = Number(order.max_downloads || 0);
  if (max > 0 && count >= max) return { ok: false, reason: 'LIMIT_REACHED' };
  return { ok: true };
}

export function createAdminSession(secret, hours = 8, now = Date.now()) {
  if (!secret) throw new Error('SESSION_SECRET mancante');
  const payload = Buffer.from(JSON.stringify({
    exp: now + Number(hours || 8) * 3600_000,
    nonce: crypto.randomBytes(16).toString('hex')
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAdminSession(token, secret, now = Date.now()) {
  if (!token || !secret) return null;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!timingSafeEqualText(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Number(data.exp) <= now) return null;
    return data;
  } catch {
    return null;
  }
}

export function adminCsrfForSession(token, secret) {
  return crypto.createHmac('sha256', secret).update(`csrf:${token}`).digest('base64url');
}

export function maskEmail(email) {
  const [local, domain] = normalizeEmail(email).split('@');
  if (!domain) return '';
  const shown = local.length <= 2 ? local[0] || '*' : `${local.slice(0, 2)}***`;
  return `${shown}@${domain}`;
}
