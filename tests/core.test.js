import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOrderId, verifyPaymentAmount, validateCompletedCapture,
  hashToken, downloadEligibility, createAdminSession, verifyAdminSession,
  adminCsrfForSession, ORDER_STATES
} from '../lib/core.js';

test('genera order ID nel formato Seller OS', () => {
  const fixed = () => Buffer.from('a1b2c3d4', 'hex');
  const id = generateOrderId(new Date('2026-09-19T12:00:00Z'), fixed);
  assert.equal(id, 'SEL-260919-A1B2C3D4');
});

test('verifica importo e valuta esatti', () => {
  assert.equal(verifyPaymentAmount({ currency_code:'EUR', value:'49.00' }, 4900, 'EUR'), true);
  assert.equal(verifyPaymentAmount({ currency_code:'USD', value:'49.00' }, 4900, 'EUR'), false);
  assert.equal(verifyPaymentAmount({ currency_code:'EUR', value:'48.99' }, 4900, 'EUR'), false);
});

test('valida capture PayPal completata', () => {
  const payload={status:'COMPLETED',purchase_units:[{payments:{captures:[{id:'CAP-1',status:'COMPLETED',amount:{currency_code:'EUR',value:'49.00'}}]}}]};
  const result=validateCompletedCapture(payload,4900,'EUR');
  assert.equal(result.ok,true);assert.equal(result.capture.id,'CAP-1');
});

test('hash token è deterministico e non espone token', () => {
  const a=hashToken('secret-token');const b=hashToken('secret-token');assert.equal(a,b);assert.notEqual(a,'secret-token');assert.equal(a.length,64);
});

test('download: valido, scaduto e limite raggiunto', () => {
  const now=new Date('2026-09-19T12:00:00Z');
  const base={order_status:ORDER_STATES.PAID,download_expires_at:'2026-09-20T12:00:00Z',download_count:0,max_downloads:5};
  assert.equal(downloadEligibility(base,now).ok,true);
  assert.equal(downloadEligibility({...base,download_expires_at:'2026-09-18T12:00:00Z'},now).reason,'EXPIRED');
  assert.equal(downloadEligibility({...base,download_count:5},now).reason,'LIMIT_REACHED');
});

test('sessione admin firmata e CSRF derivato', () => {
  const token=createAdminSession('super-secret-session',8,Date.parse('2026-09-19T12:00:00Z'));
  assert.ok(verifyAdminSession(token,'super-secret-session',Date.parse('2026-09-19T13:00:00Z')));
  assert.equal(verifyAdminSession(token,'wrong',Date.parse('2026-09-19T13:00:00Z')),null);
  assert.ok(adminCsrfForSession(token,'super-secret-session').length>20);
});
