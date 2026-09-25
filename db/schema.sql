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
