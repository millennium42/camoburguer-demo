import pg from "pg";
import { toMoney } from "@camoburguer/shared-types";

const { Pool, types } = pg;

types.setTypeParser(1700, (value) => Number(value));

const schemaSql = `
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NULL UNIQUE,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  fulfillment_mode TEXT NOT NULL,
  delivery_address TEXT NULL,
  promised_at TIMESTAMPTZ NULL,
  notes TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_fulfillment_mode_check CHECK (fulfillment_mode IN ('delivery', 'pickup', 'local')),
  CONSTRAINT orders_discount_percent_check CHECK (discount_percent BETWEEN 0 AND 100),
  CONSTRAINT orders_delivery_address_check CHECK (
    fulfillment_mode <> 'delivery' OR NULLIF(BTRIM(delivery_address), '') IS NOT NULL
  )
);

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

CREATE TABLE IF NOT EXISTS finance_entries (
  id TEXT PRIMARY KEY,
  order_id TEXT NULL REFERENCES orders(id) ON DELETE SET NULL,
  shift_id TEXT NULL REFERENCES cash_shifts(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  source TEXT NOT NULL,
  label TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT 'confirmed';
UPDATE print_jobs
SET reason = COALESCE(NULLIF(metadata->>'reason', ''), reason);
UPDATE orders SET fulfillment_mode = 'local' WHERE fulfillment_mode IN ('counter', 'dine_in');
UPDATE orders
SET delivery_address = 'Endereço pendente (pedido legado)'
WHERE fulfillment_mode = 'delivery' AND NULLIF(BTRIM(delivery_address), '') IS NULL;
ALTER TABLE orders DROP COLUMN IF EXISTS operator_name;
ALTER TABLE cash_shifts DROP COLUMN IF EXISTS operator_name;
ALTER TABLE finance_entries DROP COLUMN IF EXISTS operator_name;

UPDATE cash_shifts
SET status = 'closed', closed_at = COALESCE(closed_at, NOW())
WHERE status = 'closing';

WITH duplicate_open_shifts AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY opened_at DESC, id DESC) AS position
  FROM cash_shifts
  WHERE status = 'open'
)
UPDATE cash_shifts
SET status = 'closed',
    declared_amount = COALESCE(declared_amount, expected_amount),
    difference_amount = COALESCE(difference_amount, 0),
    closed_at = COALESCE(closed_at, NOW())
WHERE id IN (SELECT id FROM duplicate_open_shifts WHERE position > 1);

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique
  ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cash_shifts_one_open
  ON cash_shifts ((status)) WHERE status = 'open';
CREATE UNIQUE INDEX IF NOT EXISTS print_jobs_one_confirmation_per_order
  ON print_jobs (order_id) WHERE reason = 'confirmed';
CREATE UNIQUE INDEX IF NOT EXISTS finance_entries_one_order_effect
  ON finance_entries (order_id, type) WHERE type IN ('sale', 'cancellation');

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
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_shifts_status_check') THEN
    ALTER TABLE cash_shifts ADD CONSTRAINT cash_shifts_status_check
      CHECK (status IN ('open', 'closed')) NOT VALID;
  END IF;
END $migration$;

ALTER TABLE orders VALIDATE CONSTRAINT orders_fulfillment_mode_check;
ALTER TABLE orders VALIDATE CONSTRAINT orders_delivery_address_check;
ALTER TABLE orders VALIDATE CONSTRAINT orders_discount_percent_check;
ALTER TABLE cash_shifts VALIDATE CONSTRAINT cash_shifts_status_check;
`;

export function createDb(connectionString) {
  const pool = new Pool({ connectionString });
  return {
    async init() {
      await pool.query(schemaSql);
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
    async close() {
      await pool.end();
    }
  };
}

export function mapOrder(row) {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
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
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export function mapFinanceEntry(row) {
  return {
    id: row.id,
    orderId: row.order_id,
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
