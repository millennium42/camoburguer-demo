DROP TRIGGER IF EXISTS orders_record_completion ON orders;
DROP FUNCTION IF EXISTS record_order_completion();
DROP INDEX IF EXISTS orders_retention_due;
ALTER TABLE orders DROP COLUMN IF EXISTS privacy_anonymized_at;
ALTER TABLE orders DROP COLUMN IF EXISTS completed_at;
