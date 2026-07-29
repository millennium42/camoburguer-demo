import pg from "pg";
import { toMoney } from "@camoburguer/shared-types";
import { CATALOG, CATALOG_CAPTURED_AT } from "@camoburguer/domain";

const { Pool, types } = pg;

types.setTypeParser(1700, (value) => Number(value));

const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'kitchen')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credential_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
`;

export function createDb(connectionString) {
  const pool = new Pool({ connectionString });
  return {
    async init() {
      // Check for duplicate channel mappings (M-03)
      const { rows: tableCheck } = await pool.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_mappings'"
      );
      if (tableCheck.length > 0) {
        const { rows: duplicates } = await pool.query(
          "SELECT order_id FROM channel_mappings GROUP BY order_id HAVING COUNT(*) > 1 LIMIT 1"
        );
        if (duplicates.length > 0) {
          throw new Error(`Invariante quebrado: Existem multiplos mapeamentos para o mesmo pedido em channel_mappings (ex: order_id=${duplicates[0].order_id}). Remova a duplicata manualmente antes de migrar.`);
        }
      }

      // Check for multiple open cash shifts (M-05)
      try {
        const { rows } = await pool.query("SELECT id, opened_at FROM cash_shifts WHERE status = 'open'");
        if (rows.length > 1) {
          const ids = rows.map(r => r.id).join(', ');
          const times = rows.map(r => new Date(r.opened_at).toISOString()).join(', ');
          console.error(`[FATAL] Detectados múltiplos caixas abertos: IDs (${ids}) abertos em (${times}). Falha de segurança. Reconciliação manual obrigatória. Consulte o runbook em docs/operacao/runbook-duplicatas.md`);
          process.exit(1);
        }
      } catch (e) {
        // Table might not exist yet during fresh setup, ignore.
      }
      await pool.query(schemaSql);
      await pool.query(
        `INSERT INTO catalog_items (
          sku, name, category, price, description, stock_category, allows_addons,
          preparation_mode, available, origin, source_version
        )
        SELECT sku, name, category, price, description, stock_category, allows_addons,
               preparation_mode, available, 'olaclick_snapshot', $2
        FROM jsonb_to_recordset($1::jsonb) AS item(
          sku text, name text, category text, price numeric, description text,
          stock_category text, allows_addons boolean, preparation_mode text, available boolean
        )
        ON CONFLICT (sku) DO NOTHING`,
        [JSON.stringify(CATALOG.map((item) => ({
          sku: item.sku,
          name: item.name,
          category: item.category,
          price: item.price,
          description: item.description,
          stock_category: item.stockCategory,
          allows_addons: item.allowsAddons,
          preparation_mode: item.preparationMode,
          available: item.available
        }))), CATALOG_CAPTURED_AT]
      );
    },
    async query(text, values = []) {
      return pool.query(text, values);
    },
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await work(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async anonymizeCustomerData(searchTerm, { requestId, idempotencyKey, requestFingerprint }) {
      const term = String(searchTerm || "").trim();
      const anonymizedText = "[DADO ANONIMIZADO LGPD]";
      const redactJson = (value) => {
        if (Array.isArray(value)) return value.map(redactJson);
        if (value && typeof value === "object") {
          return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, redactJson(nested)]));
        }
        return typeof value === "string" ? anonymizedText : value;
      };
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`privacy:${idempotencyKey}`]);
        const existing = await client.query(
          "SELECT * FROM privacy_requests WHERE idempotency_key = $1 FOR UPDATE",
          [idempotencyKey]
        );
        if (existing.rows[0]) {
          if (existing.rows[0].fingerprint !== requestFingerprint) {
            const error = new Error("Idempotency-Key já usada para outra anonimização");
            error.statusCode = 409;
            error.code = "idempotency_payload_mismatch";
            throw error;
          }
          await client.query("COMMIT");
          return {
            requestId: existing.rows[0].id,
            status: existing.rows[0].status,
            ...existing.rows[0].result,
            repeated: true
          };
        }
        await client.query(
          `INSERT INTO privacy_requests (id, idempotency_key, fingerprint, status)
           VALUES ($1,$2,$3,'processing')`,
          [requestId, idempotencyKey, requestFingerprint]
        );

        const { rows: orders } = await client.query(
          `SELECT * FROM orders
           WHERE POSITION(LOWER($1) IN LOWER(
             customer_name || ' ' || COALESCE(delivery_address, '') || ' ' || notes || ' '
             || items::text || ' ' || metadata::text
           )) > 0
           FOR UPDATE`,
          [term]
        );
        const orderIds = orders.map((row) => row.id);
        const tabIds = [...new Set(orders.map((row) => row.tab_id).filter(Boolean))];
        for (const row of orders) {
          await client.query(
            `UPDATE orders
             SET customer_name = $2,
                 delivery_address = CASE WHEN fulfillment_mode = 'delivery' THEN $2 ELSE NULL END,
                 notes = $2, items = $3::jsonb, metadata = $4::jsonb, updated_at = NOW()
             WHERE id = $1`,
            [row.id, anonymizedText, JSON.stringify(redactJson(row.items)), JSON.stringify(redactJson(row.metadata))]
          );
        }

        const { rows: tabs } = await client.query(
          `SELECT * FROM service_tabs
           WHERE id = ANY($2::text[])
              OR POSITION(LOWER($1) IN LOWER(COALESCE(customer_name, ''))) > 0
           FOR UPDATE`,
          [term, tabIds]
        );
        for (const row of tabs) {
          await client.query("UPDATE service_tabs SET customer_name = $2 WHERE id = $1", [row.id, anonymizedText]);
        }
        const allTabIds = [...new Set([...tabIds, ...tabs.map((row) => row.id)])];

        const { rows: finance } = await client.query(
          `SELECT * FROM finance_entries
           WHERE order_id = ANY($2::text[])
              OR POSITION(LOWER($1) IN LOWER(metadata::text || ' ' || label)) > 0
           FOR UPDATE`,
          [term, orderIds]
        );
        for (const row of finance) {
          await client.query(
            "UPDATE finance_entries SET label = $2, metadata = $3::jsonb WHERE id = $1",
            [row.id, anonymizedText, JSON.stringify(redactJson(row.metadata))]
          );
        }

        const { rows: mappings } = await client.query(
          `SELECT * FROM channel_mappings
           WHERE order_id = ANY($2::text[])
              OR POSITION(
                   LOWER($1)
                   IN LOWER(metadata::text || ' ' || merchant_id || ' ' || external_id)
                 ) > 0
           FOR UPDATE`,
          [term, orderIds]
        );
        const externalIds = mappings.map((row) => row.external_id);
        for (const row of mappings) {
          await client.query(
            `UPDATE channel_mappings
             SET merchant_id = $2, external_id = $3, metadata = $4::jsonb,
                 sync_error = NULL, updated_at = NOW()
             WHERE id = $1`,
            [
              row.id,
              `anon-merchant:${row.id}`,
              `anon-order:${row.id}`,
              JSON.stringify(redactJson(row.metadata))
            ]
          );
        }

        const { rows: events } = await client.query(
          `SELECT * FROM channel_events
           WHERE external_order_id = ANY($2::text[])
              OR POSITION(
                   LOWER($1)
                   IN LOWER(
                     payload::text || ' ' ||
                     external_event_id || ' ' ||
                     COALESCE(merchant_id, '') || ' ' ||
                     COALESCE(error, '')
                   )
                 ) > 0
           FOR UPDATE`,
          [term, externalIds]
        );
        for (const row of events) {
          await client.query(
            `UPDATE channel_events
             SET external_event_id = $2,
                 merchant_id = CASE WHEN merchant_id IS NULL THEN NULL ELSE $3 END,
                 external_order_id = CASE WHEN external_order_id IS NULL THEN NULL ELSE $4 END,
                 payload = $5::jsonb, error = NULL
             WHERE id = $1`,
            [
              row.id,
              `anon-event:${row.id}`,
              `anon-merchant:${row.id}`,
              `anon-order:${row.id}`,
              JSON.stringify(redactJson(row.payload))
            ]
          );
        }

        const jsonTables = [
          ["channel_commands", "payload", "order_id", orderIds],
          ["order_tab_assignments", "normalized_payload", "order_id", orderIds],
          ["tab_payments", "metadata", "tab_id", allTabIds],
          ["stock_movements", "metadata", "order_id", orderIds]
        ];
        const jsonCounts = {};
        for (const [table, column, relation, ids] of jsonTables) {
          const { rows } = await client.query(
            `SELECT id, ${column} AS payload FROM ${table}
             WHERE ${relation} = ANY($2::text[])
                OR POSITION(LOWER($1) IN LOWER(${column}::text)) > 0
             FOR UPDATE`,
            [term, ids]
          );
          for (const row of rows) {
            await client.query(
              `UPDATE ${table}
               SET ${column} = $2::jsonb
                   ${table === "channel_commands" ? ", error = NULL" : ""}
                   ${table === "stock_movements" ? ", reason = $3" : ""}
               WHERE id = $1`,
              table === "stock_movements"
                ? [row.id, JSON.stringify(redactJson(row.payload)), anonymizedText]
                : [row.id, JSON.stringify(redactJson(row.payload))]
            );
          }
          jsonCounts[table] = rows.length;
        }
        const { rows: shifts } = await client.query(
          `UPDATE cash_shifts SET notes = $2
           WHERE POSITION(LOWER($1) IN LOWER(notes)) > 0
           RETURNING id`,
          [term, anonymizedText]
        );
        const { rows: printJobs } = await client.query(
          `UPDATE print_jobs
           SET content = '[TICKET ANONIMIZADO]', error = NULL,
               metadata = jsonb_build_object('privacyRequestId', $2::text)
           WHERE order_id = ANY($3::text[])
              OR POSITION(LOWER($1) IN LOWER(content)) > 0
           RETURNING id, order_id`,
          [term, requestId, orderIds]
        );

        const result = {
          anonymizedOrders: orders.length,
          anonymizedTabs: tabs.length,
          anonymizedFinanceEntries: finance.length,
          anonymizedMappings: mappings.length,
          anonymizedEvents: events.length,
          anonymizedPrintJobs: printJobs.length,
          anonymizedCashShifts: shifts.length,
          anonymizedJsonRecords: jsonCounts,
          printArtifacts: printJobs.map((row) => ({ jobId: row.id, orderId: row.order_id })),
          backupPolicy: "provider_retention_not_modified"
        };
        await client.query(
          `UPDATE privacy_requests
           SET status = 'db_completed', result = $2::jsonb, updated_at = NOW()
           WHERE id = $1`,
          [requestId, JSON.stringify(result)]
        );
        await client.query("COMMIT");
        return {
          requestId,
          status: "db_completed",
          ...result,
          repeated: false
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async completePrivacyRequest(requestId, status, result) {
      const { rows } = await pool.query(
        `UPDATE privacy_requests
         SET status = $2, result = $3::jsonb, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [requestId, status, JSON.stringify(result)]
      );
      return rows[0];
    },
    async close() {
      await pool.end();
    }
  };
}

export function mapOrder(row) {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    tabId: row.tab_id,
    roundNumber: row.round_number,
    roundKind: row.round_kind || "production",
    reversesOrderId: row.reverses_order_id,
    source: row.source,
    status: row.status,
    customerName: row.customer_name,
    fulfillmentMode: row.fulfillment_mode,
    deliveryAddress: row.delivery_address,
    promisedAt: row.promised_at ? new Date(row.promised_at).toISOString() : null,
    notes: row.notes,
    paymentMethod: row.payment_method,
    total: toMoney(row.total),
    discountPercent: Number(row.discount_percent || 0),
    items: row.items || [],
    metadata: row.metadata || {},
    hasChannelMapping: Boolean(row.has_channel_mapping),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export function mapTab(row) {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    customerName: row.customer_name,
    status: row.status,
    finalTotal: row.final_total == null ? null : toMoney(row.final_total),
    openedAt: new Date(row.opened_at).toISOString(),
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null
  };
}

export function mapTabPayment(row) {
  return {
    id: row.id,
    tabId: row.tab_id,
    shiftId: row.shift_id,
    kind: row.kind,
    reversesPaymentId: row.reverses_payment_id,
    paymentMethod: row.payment_method,
    amountCents: Number(row.amount_cents),
    amount: toMoney(Number(row.amount_cents) / 100),
    idempotencyKey: row.idempotency_key,
    metadata: row.metadata || {},
    createdAt: new Date(row.created_at).toISOString()
  };
}

export function mapFinanceEntry(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    tabId: row.tab_id,
    paymentId: row.payment_id,
    shiftId: row.shift_id,
    type: row.type,
    amount: toMoney(row.amount),
    paymentMethod: row.payment_method,
    source: row.source,
    label: row.label,
    metadata: row.metadata || {},
    occurredAt: new Date(row.occurred_at).toISOString()
  };
}

export function mapShift(row) {
  return {
    id: row.id,
    status: row.status,
    openingAmount: toMoney(row.opening_amount),
    expectedAmount: toMoney(row.expected_amount),
    declaredAmount: row.declared_amount == null ? null : toMoney(row.declared_amount),
    differenceAmount: row.difference_amount == null ? null : toMoney(row.difference_amount),
    notes: row.notes,
    openedAt: new Date(row.opened_at).toISOString(),
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null
  };
}

export function mapChannelMapping(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    channel: row.channel,
    merchantId: row.merchant_id,
    externalId: row.external_id,
    externalStatus: row.external_status,
    syncStatus: row.sync_status,
    syncError: row.sync_error,
    metadata: row.metadata || {},
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export function mapChannelEvent(row) {
  return {
    id: row.id,
    channel: row.channel,
    externalEventId: row.external_event_id,
    merchantId: row.merchant_id,
    externalOrderId: row.external_order_id,
    eventType: row.event_type,
    payload: row.payload || {},
    status: row.status,
    error: row.error,
    occurredAt: row.occurred_at ? new Date(row.occurred_at).toISOString() : null,
    receivedAt: new Date(row.received_at).toISOString(),
    processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null
  };
}

export function mapChannelCommand(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    channel: row.channel,
    action: row.action,
    idempotencyKey: row.idempotency_key,
    payload: row.payload || {},
    status: row.status,
    attempts: row.attempts,
    nextAttemptAt: new Date(row.next_attempt_at).toISOString(),
    responsePayload: row.response_payload,
    error: row.error,
    correlationId: row.correlation_id || row.id,
    leaseOwner: row.lease_owner,
    leaseExpiresAt: row.lease_expires_at ? new Date(row.lease_expires_at).toISOString() : null,
    lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at).toISOString() : null,
    sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
    reconciledAt: row.reconciled_at ? new Date(row.reconciled_at).toISOString() : null,
    lastHttpStatus: row.last_http_status == null ? null : Number(row.last_http_status),
    eventDeadlineAt: row.event_deadline_at ? new Date(row.event_deadline_at).toISOString() : null,
    deadLetteredAt: row.dead_lettered_at ? new Date(row.dead_lettered_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null
  };
}
