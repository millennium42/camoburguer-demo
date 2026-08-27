CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'kitchen')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credential_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT NULL;
UPDATE users SET name = username WHERE name IS NULL;
UPDATE users SET email = username || '@camoburguer.local' WHERE email IS NULL;
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique') THEN
    ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
  END IF;
END $migration$;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_hash TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  idle_expires_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL
);

ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS csrf_hash TEXT NULL;
CREATE INDEX IF NOT EXISTS auth_sessions_active_token ON auth_sessions (token_hash) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload_snapshot JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  resource_path TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS idempotency_key TEXT NULL;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS correlation_id TEXT NULL;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS state_before JSONB NULL;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS state_after JSONB NULL;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS result TEXT NULL;

CREATE TABLE IF NOT EXISTS privacy_requests (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  status TEXT NOT NULL CHECK (status IN ('processing', 'db_completed', 'completed', 'pending_external_cleanup')),
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_actor_time ON audit_events (actor_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS service_tabs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  customer_name TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  final_total NUMERIC(12,2) NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ NULL,
  CONSTRAINT service_tabs_kind_check CHECK (kind IN ('tab', 'table')),
  CONSTRAINT service_tabs_status_check CHECK (status IN ('open', 'closed', 'cancelled')),
  CONSTRAINT service_tabs_label_check CHECK (NULLIF(BTRIM(label), '') IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS catalog_items (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (NULLIF(BTRIM(name), '') IS NOT NULL),
  category TEXT NOT NULL CHECK (NULLIF(BTRIM(category), '') IS NOT NULL),
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  description TEXT NOT NULL DEFAULT '',
  stock_category TEXT NULL CHECK (stock_category IN ('xis', 'dog', 'hamburguer')),
  allows_addons BOOLEAN NOT NULL DEFAULT FALSE,
  preparation_mode TEXT NOT NULL DEFAULT 'kitchen' CHECK (preparation_mode IN ('kitchen', 'direct_handoff')),
  available BOOLEAN NOT NULL DEFAULT TRUE,
  origin TEXT NOT NULL DEFAULT 'operator' CHECK (origin IN ('olaclick_snapshot', 'operator')),
  source_version TEXT NULL,
  archived_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT catalog_direct_stock_check CHECK (preparation_mode <> 'direct_handoff' OR stock_category IS NULL)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NULL UNIQUE,
  tab_id TEXT NULL REFERENCES service_tabs(id) ON DELETE SET NULL,
  round_number INTEGER NULL,
  round_kind TEXT NOT NULL DEFAULT 'production',
  reverses_order_id TEXT NULL REFERENCES orders(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  fulfillment_mode TEXT NOT NULL,
  delivery_address TEXT NULL,
  promised_at TIMESTAMPTZ NULL,
  notes TEXT NOT NULL DEFAULT '',
  payment_method TEXT NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_fulfillment_mode_check CHECK (fulfillment_mode IN ('delivery', 'pickup', 'local')),
  CONSTRAINT orders_discount_percent_check CHECK (discount_percent BETWEEN 0 AND 100),
  CONSTRAINT orders_tab_round_check CHECK (
    (tab_id IS NULL AND round_number IS NULL) OR (tab_id IS NOT NULL AND round_number > 0)
  ),
  CONSTRAINT orders_round_kind_check CHECK (round_kind IN ('production', 'cancellation')),
  CONSTRAINT orders_reversal_check CHECK (
    (round_kind = 'production' AND reverses_order_id IS NULL) OR
    (round_kind = 'cancellation' AND tab_id IS NOT NULL AND reverses_order_id IS NOT NULL)
  ),
  CONSTRAINT orders_delivery_address_check CHECK (
    fulfillment_mode <> 'delivery' OR NULLIF(BTRIM(delivery_address), '') IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS order_tab_assignments (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  tab_id TEXT NOT NULL REFERENCES service_tabs(id) ON DELETE RESTRICT,
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  normalized_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id)
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  idempotency_key TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  resource TEXT NOT NULL,
  fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  canonical_version TEXT NOT NULL,
  result_type TEXT NULL,
  result_id TEXT NULL,
  response_status INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  CONSTRAINT idempotency_result_complete CHECK (
    (result_id IS NULL AND result_type IS NULL AND response_status IS NULL AND completed_at IS NULL)
    OR
    (result_id IS NOT NULL AND result_type IS NOT NULL AND response_status BETWEEN 200 AND 299 AND completed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idempotency_records_resource
  ON idempotency_records (operation, resource);

CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'confirmed',
  status TEXT NOT NULL,
  printer_name TEXT NOT NULL,
  content TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_balances (
  category TEXT PRIMARY KEY,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_balances_category_check CHECK (category IN ('xis', 'dog', 'hamburguer'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL REFERENCES stock_balances(category),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id TEXT NULL REFERENCES orders(id) ON DELETE SET NULL,
  idempotency_key TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO stock_balances (category, quantity) VALUES ('xis', 0), ('dog', 0), ('hamburguer', 0)
ON CONFLICT (category) DO NOTHING;

CREATE TABLE IF NOT EXISTS cash_shifts (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  declared_amount NUMERIC(12,2) NULL,
  difference_amount NUMERIC(12,2) NULL,
  notes TEXT NOT NULL DEFAULT '',
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ NULL,
  CONSTRAINT cash_shifts_status_check CHECK (status IN ('open', 'closed'))
);

CREATE TABLE IF NOT EXISTS tab_payments (
  id TEXT PRIMARY KEY,
  tab_id TEXT NOT NULL REFERENCES service_tabs(id) ON DELETE RESTRICT,
  shift_id TEXT NOT NULL REFERENCES cash_shifts(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL DEFAULT 'payment',
  reverses_payment_id TEXT NULL REFERENCES tab_payments(id) ON DELETE RESTRICT,
  payment_method TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tab_payments_kind_check CHECK (kind IN ('payment', 'reversal')),
  CONSTRAINT tab_payments_method_check CHECK (payment_method IN ('cash', 'pix', 'credit_card', 'debit_card', 'app_paid')),
  CONSTRAINT tab_payments_amount_check CHECK (
    (kind = 'payment' AND amount_cents > 0) OR (kind = 'reversal' AND amount_cents < 0)
  ),
  CONSTRAINT tab_payments_reversal_check CHECK (
    (kind = 'payment' AND reverses_payment_id IS NULL) OR
    (kind = 'reversal' AND reverses_payment_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS finance_entries (
  id TEXT PRIMARY KEY,
  order_id TEXT NULL REFERENCES orders(id) ON DELETE SET NULL,
  tab_id TEXT NULL REFERENCES service_tabs(id) ON DELETE SET NULL,
  payment_id TEXT NULL REFERENCES tab_payments(id) ON DELETE SET NULL,
  shift_id TEXT NULL REFERENCES cash_shifts(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  source TEXT NOT NULL,
  label TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS channel_mappings (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  external_status TEXT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synchronized',
  sync_error TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel, merchant_id, external_id),
  UNIQUE (order_id)
);

CREATE TABLE IF NOT EXISTS channel_events (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  merchant_id TEXT NULL,
  external_order_id TEXT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT NULL,
  occurred_at TIMESTAMPTZ NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NULL,
  UNIQUE (channel, external_event_id)
);

CREATE TABLE IF NOT EXISTS channel_commands (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  action TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_payload JSONB NULL,
  error TEXT NULL,
  correlation_id TEXT NULL,
  lease_owner TEXT NULL,
  lease_expires_at TIMESTAMPTZ NULL,
  last_attempt_at TIMESTAMPTZ NULL,
  sent_at TIMESTAMPTZ NULL,
  reconciled_at TIMESTAMPTZ NULL,
  last_http_status INTEGER NULL,
  event_deadline_at TIMESTAMPTZ NULL,
  dead_lettered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  UNIQUE (channel, idempotency_key)
);

ALTER TABLE channel_commands ADD COLUMN IF NOT EXISTS correlation_id TEXT NULL;
ALTER TABLE channel_commands ADD COLUMN IF NOT EXISTS lease_owner TEXT NULL;
ALTER TABLE channel_commands ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ NULL;
ALTER TABLE channel_commands ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ NULL;
ALTER TABLE channel_commands ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ NULL;
ALTER TABLE channel_commands ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ NULL;
ALTER TABLE channel_commands ADD COLUMN IF NOT EXISTS last_http_status INTEGER NULL;
ALTER TABLE channel_commands ADD COLUMN IF NOT EXISTS event_deadline_at TIMESTAMPTZ NULL;
ALTER TABLE channel_commands ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMPTZ NULL;
UPDATE channel_commands SET correlation_id = id WHERE correlation_id IS NULL;
UPDATE channel_commands
SET event_deadline_at = NOW()
WHERE status = 'awaiting_event' AND event_deadline_at IS NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tab_id TEXT NULL REFERENCES service_tabs(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS round_number INTEGER NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS round_kind TEXT NOT NULL DEFAULT 'production';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reverses_order_id TEXT NULL REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE orders ALTER COLUMN payment_method DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT 'confirmed';
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS lease_owner TEXT NULL;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ NULL;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS error_class TEXT NULL;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS last_error_code TEXT NULL;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ NULL;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ NULL;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMPTZ NULL;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE print_jobs SET status = 'retry_wait', next_attempt_at = NOW()
WHERE status = 'failed'
   OR (
     status = 'sending'
     AND (lease_expires_at IS NULL OR lease_expires_at <= NOW())
   );
DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'print_jobs_status_check') THEN
    ALTER TABLE print_jobs ADD CONSTRAINT print_jobs_status_check
      CHECK (status IN ('pending', 'sending', 'retry_wait', 'printed', 'dead_letter')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_mappings_order_id_key') THEN
    ALTER TABLE channel_mappings ADD CONSTRAINT channel_mappings_order_id_key
      UNIQUE (order_id);
  END IF;
END $migration$;
ALTER TABLE print_jobs VALIDATE CONSTRAINT print_jobs_status_check;
UPDATE print_jobs
SET reason = COALESCE(NULLIF(metadata->>'reason', ''), reason);
UPDATE orders SET fulfillment_mode = 'local' WHERE fulfillment_mode IN ('counter', 'dine_in');
UPDATE orders
SET delivery_address = 'Endereço pendente (pedido legado)'
WHERE fulfillment_mode = 'delivery' AND NULLIF(BTRIM(delivery_address), '') IS NULL;
ALTER TABLE orders DROP COLUMN IF EXISTS operator_name;
ALTER TABLE cash_shifts DROP COLUMN IF EXISTS operator_name;
ALTER TABLE finance_entries DROP COLUMN IF EXISTS operator_name;
ALTER TABLE tab_payments ALTER COLUMN shift_id SET NOT NULL;
ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS tab_id TEXT NULL REFERENCES service_tabs(id) ON DELETE SET NULL;
ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS payment_id TEXT NULL REFERENCES tab_payments(id) ON DELETE SET NULL;

UPDATE cash_shifts
SET status = 'closed', closed_at = COALESCE(closed_at, NOW())
WHERE status = 'closing';


CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique
  ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS service_tabs_one_open_label
  ON service_tabs (LOWER(BTRIM(label))) WHERE status = 'open';
CREATE UNIQUE INDEX IF NOT EXISTS orders_one_round_number_per_tab
  ON orders (tab_id, round_number) WHERE tab_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_idempotency_unique
  ON stock_movements (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_one_order_effect
  ON stock_movements (order_id, category, reason) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tab_payments_one_reversal
  ON tab_payments (reverses_payment_id) WHERE kind = 'reversal';
CREATE UNIQUE INDEX IF NOT EXISTS cash_shifts_one_open
  ON cash_shifts ((status)) WHERE status = 'open';
CREATE UNIQUE INDEX IF NOT EXISTS print_jobs_one_confirmation_per_order
  ON print_jobs (order_id) WHERE reason = 'confirmed';
CREATE UNIQUE INDEX IF NOT EXISTS finance_entries_one_order_effect
  ON finance_entries (order_id, type) WHERE type IN ('sale', 'cancellation');
CREATE UNIQUE INDEX IF NOT EXISTS finance_entries_one_payment_effect
  ON finance_entries (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS channel_mappings_order_id ON channel_mappings (order_id);
CREATE INDEX IF NOT EXISTS order_tab_assignments_tab_id ON order_tab_assignments (tab_id);
CREATE INDEX IF NOT EXISTS channel_events_status ON channel_events (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS channel_commands_pending ON channel_commands (channel, status, next_attempt_at) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS channel_commands_recovery ON channel_commands (channel, status, lease_expires_at, next_attempt_at)
  WHERE status IN ('pending', 'processing', 'ambiguous', 'awaiting_event');

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_delta_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_delta_check
  CHECK (delta <> 0 OR reason = 'cancellation_loss') NOT VALID;
ALTER TABLE stock_movements VALIDATE CONSTRAINT stock_movements_delta_check;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_fulfillment_mode_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_mode_check
      CHECK (fulfillment_mode IN ('delivery', 'pickup', 'local')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_address_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_delivery_address_check
      CHECK (fulfillment_mode <> 'delivery' OR NULLIF(BTRIM(delivery_address), '') IS NOT NULL) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_percent_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_discount_percent_check
      CHECK (discount_percent BETWEEN 0 AND 100) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_tab_round_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_tab_round_check
      CHECK ((tab_id IS NULL AND round_number IS NULL) OR (tab_id IS NOT NULL AND round_number > 0)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_round_kind_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_round_kind_check
      CHECK (round_kind IN ('production', 'cancellation')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_reversal_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_reversal_check
      CHECK ((round_kind = 'production' AND reverses_order_id IS NULL) OR (round_kind = 'cancellation' AND tab_id IS NOT NULL AND reverses_order_id IS NOT NULL)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_shifts_status_check') THEN
    ALTER TABLE cash_shifts ADD CONSTRAINT cash_shifts_status_check
      CHECK (status IN ('open', 'closed')) NOT VALID;
  END IF;
END $migration$;

ALTER TABLE orders VALIDATE CONSTRAINT orders_fulfillment_mode_check;
ALTER TABLE orders VALIDATE CONSTRAINT orders_delivery_address_check;
ALTER TABLE orders VALIDATE CONSTRAINT orders_discount_percent_check;
ALTER TABLE orders VALIDATE CONSTRAINT orders_tab_round_check;
ALTER TABLE orders VALIDATE CONSTRAINT orders_round_kind_check;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_fulfillment_mode_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_mode_check
      CHECK (fulfillment_mode IN ('delivery', 'pickup', 'local')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_address_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_delivery_address_check
      CHECK (fulfillment_mode <> 'delivery' OR NULLIF(BTRIM(delivery_address), '') IS NOT NULL) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_percent_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_discount_percent_check
      CHECK (discount_percent BETWEEN 0 AND 100) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_tab_round_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_tab_round_check
      CHECK ((tab_id IS NULL AND round_number IS NULL) OR (tab_id IS NOT NULL AND round_number > 0)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_round_kind_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_round_kind_check
      CHECK (round_kind IN ('production', 'cancellation')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_reversal_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_reversal_check
      CHECK ((round_kind = 'production' AND reverses_order_id IS NULL) OR (round_kind = 'cancellation' AND tab_id IS NOT NULL AND reverses_order_id IS NOT NULL)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_shifts_status_check') THEN
    ALTER TABLE cash_shifts ADD CONSTRAINT cash_shifts_status_check
      CHECK (status IN ('open', 'closed')) NOT VALID;
  END IF;
END $migration$;

ALTER TABLE orders VALIDATE CONSTRAINT orders_fulfillment_mode_check;
ALTER TABLE orders VALIDATE CONSTRAINT orders_delivery_address_check;
ALTER TABLE orders VALIDATE CONSTRAINT orders_discount_percent_check;
ALTER TABLE orders VALIDATE CONSTRAINT orders_tab_round_check;
ALTER TABLE orders VALIDATE CONSTRAINT orders_round_kind_check;
ALTER TABLE orders VALIDATE CONSTRAINT orders_reversal_check;
ALTER TABLE cash_shifts VALIDATE CONSTRAINT cash_shifts_status_check;
