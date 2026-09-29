import { getOrderByCustomerToken, markWithdrawalReceipt, requestWithdrawal } from '../lib/db.js';
import { hashToken } from '../lib/core.js';
import { emailConfigured, sendEmail, withdrawalReceiptEmailHtml } from '../lib/email.js';
import { assertAllowedOrigin, clientIp, json, query, readJson } from '../lib/http.js';
import { buildPayPalPaymentUrl } from '../lib/payment-links.js';
import { allowRequest } from '../lib/rate-limit.js';

function withdrawalInfo(order) {
  const createdAt = new Date(order.created_at);
  const endsAt = new Date(createdAt.getTime() + 14 * 86400_000);
  const unavailableState = ['CONSEGNATO','ANNULLATO','RIMBORSATO'].includes(order.order_status);
  const canWithdraw = !order.withdrawal_requested_at
    && !order.delivered_at
    && !order.download_token_hash
    && !unavailableState
    && order.delivery_status !== 'PROCESSING'
    && Date.now() < endsAt.getTime();

  return {
    canWithdraw,
    withdrawalRequestedAt: order.withdrawal_requested_at || null,
    withdrawalPeriodEndsAt: endsAt.toISOString()
  };
}

function publicPayload(order) {
  const withdrawal = withdrawalInfo(order);
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
    canDownload: Boolean(order.download_token_hash)
      && ['PAGATO','CONSEGNATO'].includes(order.order_status)
      && order.download_expires_at
      && new Date(order.download_expires_at).getTime() > Date.now()
      && Number(order.download_count || 0) < Number(order.max_downloads || 0),
    downloadExpiresAt: order.download_expires_at,
    downloadCount: Number(order.download_count || 0),
    maxDownloads: Number(order.max_downloads || 0),
    legalVersion: order.legal_version || null,
    ...withdrawal
  };

  if (order.payment_method === 'bank') {
    payload.bank = {
      accountName: process.env.BANK_ACCOUNT_NAME || '',
      iban: process.env.BANK_IBAN || '',
      reference: `SELLER OS · ${order.id}`
    };
  } else if (order.payment_method === 'paypal' && process.env.PAYPAL_PAYMENT_URL) {
    payload.paypal = {
      mode: 'link',
      paymentUrl: buildPayPalPaymentUrl(process.env.PAYPAL_PAYMENT_URL, order.amount_cents, order.currency),
      reference: `SELLER OS · ${order.id}`
    };
  }
  return payload;
}

async function handleGet(req, res) {
  const q = query(req);
  const id = q.get('id') || '';
  const token = q.get('token') || '';
  if (!id || !token) return json(res, 400, { error: 'MISSING_ORDER_AUTH' });

  const order = await getOrderByCustomerToken(id, hashToken(token));
  if (!order) return json(res, 404, { error: 'ORDER_NOT_FOUND' });
  return json(res, 200, publicPayload(order));
}

async function handleWithdrawal(req, res) {
  if (!assertAllowedOrigin(req)) return json(res, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  if (!allowRequest(`withdrawal:${clientIp(req)}`, { limit: 6, windowMs: 60_000 })) {
    return json(res, 429, { error: 'TOO_MANY_REQUESTS' });
  }

  const body = await readJson(req);
  if (String(body.action || '') !== 'withdraw') return json(res, 400, { error: 'UNKNOWN_ACTION' });

  const id = String(body.id || '');
  const token = String(body.token || '');
  if (!id || !token || token.length < 20) return json(res, 400, { error: 'MISSING_ORDER_AUTH' });

  const tokenHash = hashToken(token);
  const existing = await getOrderByCustomerToken(id, tokenHash);
  if (!existing) return json(res, 404, { error: 'ORDER_NOT_FOUND' });

  if (existing.withdrawal_requested_at) {
    return json(res, 200, { ok: true, alreadySubmitted: true, ...publicPayload(existing) });
  }

  const info = withdrawalInfo(existing);
  if (existing.delivery_status === 'PROCESSING') {
    return json(res, 409, { error: 'DELIVERY_IN_PROGRESS' });
  }
  if (!info.canWithdraw) {
    if (Date.now() >= new Date(info.withdrawalPeriodEndsAt).getTime()) {
      return json(res, 409, { error: 'WITHDRAWAL_PERIOD_EXPIRED' });
    }
    return json(res, 409, { error: 'WITHDRAWAL_NO_LONGER_AVAILABLE' });
  }

  const updated = await requestWithdrawal(id, tokenHash);
  if (!updated) return json(res, 409, { error: 'WITHDRAWAL_NOT_ACCEPTED' });

  let receiptEmailSent = false;
  let receiptEmailError = null;

  if (emailConfigured()) {
    try {
      await sendEmail({
        to: updated.email,
        subject: `Conferma recesso SELLER OS · ${updated.id}`,
        html: withdrawalReceiptEmailHtml({
          customerName: updated.customer_name,
          orderId: updated.id,
          receivedAt: updated.withdrawal_requested_at
        })
      });
      receiptEmailSent = true;
      await markWithdrawalReceipt(updated.id, { sent: true });
    } catch (error) {
      receiptEmailError = error.message;
      await markWithdrawalReceipt(updated.id, { sent: false, error: error.message });
      console.error('withdrawal receipt email', error);
    }
  }

  return json(res, 200, {
    ok: true,
    receiptEmailSent,
    receiptEmailError,
    ...publicPayload(updated)
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST') return await handleWithdrawal(req, res);
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' }, { Allow: 'GET, POST' });
  } catch (error) {
    console.error('order-status', error);
    return json(res, 500, { error: 'STATUS_FAILED' });
  }
}
