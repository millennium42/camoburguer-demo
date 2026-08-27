ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS privacy_anonymized_at TIMESTAMPTZ NULL;

-- Historical approximation only; cancelled rows do not prove a past delivery.
UPDATE orders SET completed_at = GREATEST(created_at, updated_at)
WHERE status = 'completed' AND completed_at IS NULL;

CREATE OR REPLACE FUNCTION record_order_completion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.completed_at := CASE WHEN NEW.status = 'completed' THEN statement_timestamp() ELSE NULL END;
  ELSIF OLD.completed_at IS NOT NULL THEN
    NEW.completed_at := OLD.completed_at;
  ELSIF NEW.status = 'completed' THEN
    NEW.completed_at := statement_timestamp();
  ELSE
    NEW.completed_at := NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.privacy_anonymized_at IS NOT NULL THEN
    NEW.privacy_anonymized_at := OLD.privacy_anonymized_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_record_completion ON orders;
CREATE TRIGGER orders_record_completion BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION record_order_completion();

CREATE INDEX IF NOT EXISTS orders_retention_due ON orders (completed_at, id)
WHERE completed_at IS NOT NULL AND privacy_anonymized_at IS NULL;
