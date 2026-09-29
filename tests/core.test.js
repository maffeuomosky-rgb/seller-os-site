import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanString,
  normalizeEmail,
  isValidEmail,
  generateOrderId,
  verifyPaymentAmount,
  validateCompletedCapture,
  downloadEligibility,
  createAdminSession,
  verifyAdminSession,
  maskEmail
} from '../lib/core.js';
import { buildPayPalPaymentUrl } from '../lib/payment-links.js';

test('normalizes user input safely', () => {
  assert.equal(cleanString('  Mario   Rossi  '), 'Mario Rossi');
  assert.equal(normalizeEmail('  TEST@Example.COM '), 'test@example.com');
  assert.equal(isValidEmail('buyer@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(maskEmail('matteo@example.com'), 'ma***@example.com');
});

test('generates deterministic Seller OS order ids with injected randomness', () => {
  const now = new Date('2026-09-29T06:00:00Z');
  const randomBytes = () => Buffer.from('deadbeef', 'hex');
  assert.equal(generateOrderId(now, randomBytes), 'SEL-260929-DEADBEEF');
});

test('validates exact payment amount and currency', () => {
  assert.equal(verifyPaymentAmount({ value: '49.00', currency_code: 'EUR' }, 4900, 'EUR'), true);
  assert.equal(verifyPaymentAmount({ value: '48.99', currency_code: 'EUR' }, 4900, 'EUR'), false);
  assert.equal(verifyPaymentAmount({ value: '49.00', currency_code: 'USD' }, 4900, 'EUR'), false);
});

test('accepts only completed PayPal captures with the expected amount', () => {
  const payload = {
    status: 'COMPLETED',
    purchase_units: [{
      payments: {
        captures: [{
          id: 'CAPTURE-1',
          status: 'COMPLETED',
          amount: { value: '49.00', currency_code: 'EUR' }
        }]
      }
    }]
  };
  const result = validateCompletedCapture(payload, 4900, 'EUR');
  assert.equal(result.ok, true);
  assert.equal(result.capture.id, 'CAPTURE-1');

  const wrong = structuredClone(payload);
  wrong.purchase_units[0].payments.captures[0].amount.value = '50.00';
  assert.equal(validateCompletedCapture(wrong, 4900, 'EUR').ok, false);
});

test('enforces protected download eligibility', () => {
  const now = new Date('2026-09-29T08:00:00Z');
  const eligible = {
    order_status: 'PAGATO',
    download_expires_at: '2026-10-05T08:00:00Z',
    download_count: 0,
    max_downloads: 5
  };
  assert.deepEqual(downloadEligibility(eligible, now), { ok: true });
  assert.equal(downloadEligibility({ ...eligible, order_status: 'ANNULLATO' }, now).reason, 'NOT_PAID');
  assert.equal(downloadEligibility({ ...eligible, download_expires_at: '2026-09-28T08:00:00Z' }, now).reason, 'EXPIRED');
  assert.equal(downloadEligibility({ ...eligible, download_count: 5 }, now).reason, 'LIMIT_REACHED');
});

test('creates and verifies admin sessions and rejects expired sessions', () => {
  const secret = 'test-session-secret';
  const start = Date.UTC(2026, 8, 29, 8, 0, 0);
  const token = createAdminSession(secret, 8, start);
  assert.ok(verifyAdminSession(token, secret, start + 60_000));
  assert.equal(verifyAdminSession(token, 'wrong-secret', start + 60_000), null);
  assert.equal(verifyAdminSession(token, secret, start + 9 * 3600_000), null);
});

test('builds fixed-amount PayPal.me links without changing unrelated URLs', () => {
  assert.equal(
    buildPayPalPaymentUrl('https://paypal.me/UomoSKY', 4900, 'EUR'),
    'https://paypal.me/UomoSKY/49EUR'
  );
  assert.equal(
    buildPayPalPaymentUrl('https://example.com/pay', 4900, 'EUR'),
    'https://example.com/pay'
  );
});
