CREATE OR REPLACE FUNCTION retention_redact_json(value JSONB, kind TEXT DEFAULT '')
RETURNS JSONB LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  result JSONB;
  field RECORD;
  normalized TEXT;
  child_kind TEXT;
BEGIN
  IF value IS NULL OR value = 'null'::jsonb THEN RETURN value; END IF;
  IF jsonb_typeof(value) = 'array' THEN
    SELECT COALESCE(jsonb_agg(retention_redact_json(item, kind) ORDER BY position), '[]'::jsonb)
      INTO result FROM jsonb_array_elements(value) WITH ORDINALITY AS a(item, position);
    RETURN result;
  END IF;
  IF jsonb_typeof(value) = 'object' THEN
    result := '{}'::jsonb;
    FOR field IN SELECT key, val FROM jsonb_each(value) AS e(key, val) LOOP
      normalized := lower(regexp_replace(field.key, '[^a-zA-Z0-9]', '', 'g'));
      IF jsonb_typeof(field.val) NOT IN ('object', 'array') AND (
        normalized ~ '(hash|fingerprint)$' OR normalized IN (
          'id', 'orderid', 'tabid', 'shiftid', 'paymentid', 'userid', 'actorid', 'customerid',
          'merchantid', 'externalid', 'externalorderid', 'externaleventid', 'reversesorderid',
          'reversesitemid', 'reversespaymentid', 'resultid', 'jobid', 'printjobid', 'privacyrequestid',
          'sourcejobid', 'bridgejobid', 'externalmerchantid',
          'sku', 'idempotencykey', 'correlationid', 'receipt', 'canonicalversion', 'version',
          'source', 'channel', 'status', 'fulfillmentmode', 'paymentmethod', 'method', 'type',
          'kind', 'roundkind', 'preparationmode', 'category', 'stockcategory', 'paymentkind', 'priority',
          'action', 'createdat', 'updatedat', 'completedat', 'occurredat', 'openedat', 'closedat',
          'promisedat', 'sentat', 'receivedat', 'processedat'
        ) OR (normalized = 'name' AND kind = 'item') OR (
          normalized IN ('amount', 'amountcents', 'total', 'totalcents', 'subtotal', 'price', 'unitprice',
            'quantity', 'discount', 'discountpercent', 'fee', 'deliveryfee', 'change', 'changefor')
          AND (jsonb_typeof(field.val) = 'number' OR (field.val #>> '{}') ~ '^[+-]?[0-9]+([.][0-9]+)?$')
        )
      ) THEN
        result := result || jsonb_build_object(field.key, field.val);
      ELSE
        child_kind := CASE
          WHEN kind = 'private' OR normalized ~ '(customer|consumer|buyer|contact|address|endereco|phone|telephone|telefone|email|notes|comment|observac|instruction|name|coordinate|latitude|longitude|geolocation)'
            OR normalized IN ('lat', 'lng', 'lon', 'gps')
            THEN 'private'
          WHEN normalized IN ('items', 'addons') THEN 'item'
          ELSE '' END;
        result := result || jsonb_build_object(field.key, retention_redact_json(field.val, child_kind));
      END IF;
    END LOOP;
    RETURN result;
  END IF;
  IF kind = 'private' OR jsonb_typeof(value) = 'string' THEN
    RETURN to_jsonb('[DADO ANONIMIZADO LGPD]'::text);
  END IF;
  RETURN value;
END;
$$;

CREATE OR REPLACE FUNCTION guard_retained_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.privacy_anonymized_at IS NOT NULL THEN
    NEW.customer_name := '[DADO ANONIMIZADO LGPD]';
    NEW.delivery_address := CASE WHEN NEW.delivery_address IS NULL THEN NULL ELSE '[DADO ANONIMIZADO LGPD]' END;
    NEW.notes := '[DADO ANONIMIZADO LGPD]';
    NEW.items := retention_redact_json(NEW.items, 'item');
    NEW.metadata := retention_redact_json(NEW.metadata);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_retained_privacy ON orders;
-- Alphabetically after orders_record_completion, which restores the immutable marker.
CREATE TRIGGER orders_retained_privacy BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION guard_retained_order();

CREATE OR REPLACE FUNCTION guard_retained_print_job() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE retained_at TIMESTAMPTZ;
BEGIN
  -- Wait for a concurrent order anonymization before accepting stale ticket content.
  SELECT privacy_anonymized_at INTO retained_at FROM orders WHERE id = NEW.order_id FOR SHARE;
  IF retained_at IS NOT NULL THEN
    NEW.content := '[TICKET ANONIMIZADO]';
    NEW.metadata := retention_redact_json(NEW.metadata);
    NEW.error := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS print_jobs_retained_privacy ON print_jobs;
CREATE TRIGGER print_jobs_retained_privacy BEFORE INSERT OR UPDATE OF content, metadata, order_id ON print_jobs
FOR EACH ROW EXECUTE FUNCTION guard_retained_print_job();
