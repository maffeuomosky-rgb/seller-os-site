import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPayPalPaymentUrl } from '../lib/payment-links.js';

test('PayPal.Me link gets product amount and currency', () => {
  assert.equal(buildPayPalPaymentUrl('https://paypal.me/UomoSKY', 4900, 'EUR'), 'https://paypal.me/UomoSKY/49EUR');
});

test('PayPal.Me link with existing amount is preserved', () => {
  assert.equal(buildPayPalPaymentUrl('https://paypal.me/UomoSKY/49EUR', 4900, 'EUR'), 'https://paypal.me/UomoSKY/49EUR');
});

test('non PayPal.Me payment URL is preserved', () => {
  assert.equal(buildPayPalPaymentUrl('https://example.com/pay', 4900, 'EUR'), 'https://example.com/pay');
});
