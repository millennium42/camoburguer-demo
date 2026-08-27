DROP TRIGGER IF EXISTS print_jobs_retained_privacy ON print_jobs;
DROP TRIGGER IF EXISTS orders_retained_privacy ON orders;
DROP FUNCTION IF EXISTS guard_retained_print_job();
DROP FUNCTION IF EXISTS guard_retained_order();
DROP FUNCTION IF EXISTS retention_redact_json(JSONB, TEXT);
