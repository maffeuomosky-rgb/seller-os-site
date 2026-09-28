import pg from 'pg';
import { ORDER_STATES } from './core.js';

const { Pool } = pg;
let pool;
let schemaReady;

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL non configurato');
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 4,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000
    });
  }
  return pool;
}

export async function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS seller_orders (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        email TEXT NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('paypal','bank')),
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        order_status TEXT NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'PENDING',
        delivery_status TEXT NOT NULL DEFAULT 'NOT_READY',
        paypal_order_id TEXT UNIQUE,
        paypal_capture_id TEXT,
        customer_token_hash TEXT NOT NULL,
        download_token_hash TEXT,
        download_expires_at TIMESTAMPTZ,
        download_count INTEGER NOT NULL DEFAULT 0,
        max_downloads INTEGER NOT NULL DEFAULT 5,
        consent_terms BOOLEAN NOT NULL,
        consent_immediate_delivery BOOLEAN NOT NULL,
        marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
        delivery_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        paid_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        last_email_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS seller_orders_email_idx ON seller_orders(email);
      CREATE INDEX IF NOT EXISTS seller_orders_status_idx ON seller_orders(order_status);
      CREATE INDEX IF NOT EXISTS seller_orders_created_idx ON seller_orders(created_at DESC);
      CREATE TABLE IF NOT EXISTS seller_webhook_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  })();
  return schemaReady;
}

export async function createOrder(row) {
  await ensureSchema();
  const q = await getPool().query(`
    INSERT INTO seller_orders (
      id, customer_name, email, payment_method, amount_cents, currency,
      order_status, payment_status, delivery_status, customer_token_hash,
      max_downloads, consent_terms, consent_immediate_delivery, marketing_consent
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING','NOT_READY',$8,$9,$10,$11,$12)
    RETURNING *
  `, [
    row.id, row.customer_name, row.email, row.payment_method, row.amount_cents, row.currency,
    row.order_status || ORDER_STATES.WAITING, row.customer_token_hash, row.max_downloads,
    row.consent_terms, row.consent_immediate_delivery, row.marketing_consent
  ]);
  return q.rows[0];
}

export async function getOrder(id) {
  await ensureSchema();
  const q = await getPool().query('SELECT * FROM seller_orders WHERE id=$1 LIMIT 1', [id]);
  return q.rows[0] || null;
}

export async function getOrderByCustomerToken(id, tokenHash) {
  await ensureSchema();
  const q = await getPool().query('SELECT * FROM seller_orders WHERE id=$1 AND customer_token_hash=$2 LIMIT 1', [id, tokenHash]);
  return q.rows[0] || null;
}

export async function getOrderByPayPalId(paypalOrderId) {
  await ensureSchema();
  const q = await getPool().query('SELECT * FROM seller_orders WHERE paypal_order_id=$1 LIMIT 1', [paypalOrderId]);
  return q.rows[0] || null;
}

export async function setPayPalOrder(id, paypalOrderId) {
  await ensureSchema();
  const q = await getPool().query(`UPDATE seller_orders SET paypal_order_id=$2, updated_at=NOW() WHERE id=$1 RETURNING *`, [id, paypalOrderId]);
  return q.rows[0] || null;
}

export async function markPaymentNotified(id, method) {
  await ensureSchema();
  const q = await getPool().query(`
    UPDATE seller_orders
    SET order_status=$3, updated_at=NOW()
    WHERE id=$1 AND payment_method=$2 AND order_status IN ($4,$5)
    RETURNING *
  `, [id, method, ORDER_STATES.BANK_REVIEW, ORDER_STATES.WAITING, ORDER_STATES.CREATED]);
  return q.rows[0] || null;
}

export async function markBankNotified(id) {
  return markPaymentNotified(id, 'bank');
}

export async function markPaid(id, captureId = null) {
  await ensureSchema();
  const q = await getPool().query(`
    UPDATE seller_orders
    SET order_status=CASE WHEN order_status=$6 THEN order_status ELSE $2 END,
        payment_status='PAID', paypal_capture_id=COALESCE($3,paypal_capture_id),
        paid_at=COALESCE(paid_at,NOW()), updated_at=NOW()
    WHERE id=$1 AND order_status NOT IN ($4,$5)
    RETURNING *
  `, [id, ORDER_STATES.PAID, captureId, ORDER_STATES.CANCELLED, ORDER_STATES.REFUNDED, ORDER_STATES.DELIVERED]);
  return q.rows[0] || null;
}

export async function claimDelivery(id, force = false) {
  await ensureSchema();
  const q = await getPool().query(`
    UPDATE seller_orders SET delivery_status='PROCESSING', delivery_error=NULL, updated_at=NOW()
    WHERE id=$1 AND (delivery_status IN ('NOT_READY','EMAIL_FAILED') OR ($2::boolean=TRUE AND delivery_status='SENT'))
    RETURNING *
  `, [id, Boolean(force)]);
  return q.rows[0] || null;
}

export async function issueDownload(id, tokenHash, expiresAt, maxDownloads) {
  await ensureSchema();
  const q = await getPool().query(`
    UPDATE seller_orders
    SET download_token_hash=$2, download_expires_at=$3, download_count=0,
        max_downloads=$4, delivery_error=NULL, updated_at=NOW()
    WHERE id=$1 RETURNING *
  `, [id, tokenHash, expiresAt, maxDownloads]);
  return q.rows[0] || null;
}

export async function markDelivered(id) {
  await ensureSchema();
  const q = await getPool().query(`
    UPDATE seller_orders
    SET order_status=$2, delivery_status='SENT', delivered_at=COALESCE(delivered_at,NOW()),
        last_email_at=NOW(), delivery_error=NULL, updated_at=NOW()
    WHERE id=$1 RETURNING *
  `, [id, ORDER_STATES.DELIVERED]);
  return q.rows[0] || null;
}

export async function markDeliveryError(id, message) {
  await ensureSchema();
  const q = await getPool().query(`
    UPDATE seller_orders SET delivery_status='EMAIL_FAILED', delivery_error=$2, updated_at=NOW()
    WHERE id=$1 RETURNING *
  `, [id, String(message).slice(0, 1000)]);
  return q.rows[0] || null;
}

export async function getOrderByDownloadToken(tokenHash) {
  await ensureSchema();
  const q = await getPool().query(`SELECT * FROM seller_orders WHERE download_token_hash=$1 LIMIT 1`, [tokenHash]);
  return q.rows[0] || null;
}

export async function consumeDownload(id) {
  await ensureSchema();
  const q = await getPool().query(`
    UPDATE seller_orders SET download_count=download_count+1, updated_at=NOW()
    WHERE id=$1 AND download_count < max_downloads
    RETURNING *
  `, [id]);
  return q.rows[0] || null;
}

export async function recordWebhookEvent(eventId, eventType) {
  await ensureSchema();
  const q = await getPool().query(`
    INSERT INTO seller_webhook_events(event_id,event_type) VALUES($1,$2)
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `, [eventId, eventType]);
  return q.rowCount === 1;
}

export async function listOrders({ status = '', method = '', limit = 100 } = {}) {
  await ensureSchema();
  const clauses = [];
  const values = [];
  if (status) { values.push(status); clauses.push(`order_status=$${values.length}`); }
  if (method) { values.push(method); clauses.push(`payment_method=$${values.length}`); }
  values.push(Math.min(Math.max(Number(limit) || 100, 1), 250));
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const q = await getPool().query(`SELECT * FROM seller_orders ${where} ORDER BY created_at DESC LIMIT $${values.length}`, values);
  return q.rows;
}

export async function setOrderState(id, state) {
  await ensureSchema();
  const delivery = [ORDER_STATES.REFUNDED, ORDER_STATES.CANCELLED].includes(state) ? 'REVOKED' : undefined;
  const q = await getPool().query(`
    UPDATE seller_orders SET order_status=$2,
      payment_status=CASE WHEN $2=$3 THEN 'REFUNDED' ELSE payment_status END,
      delivery_status=CASE WHEN $4::text IS NULL THEN delivery_status ELSE $4 END,
      download_token_hash=CASE WHEN $2 IN ($3,$5) THEN NULL ELSE download_token_hash END,
      updated_at=NOW()
    WHERE id=$1 RETURNING *
  `, [id, state, ORDER_STATES.REFUNDED, delivery || null, ORDER_STATES.CANCELLED]);
  return q.rows[0] || null;
}
