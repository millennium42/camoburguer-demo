-- Destructive test-only rollback. The runner must validate identity and emptiness first.
-- No CASCADE: unlisted dependent objects must prevent rollback.
DROP TABLE
  channel_commands,
  channel_events,
  channel_mappings,
  finance_entries,
  tab_payments,
  stock_movements,
  print_jobs,
  order_tab_assignments,
  idempotency_records,
  orders,
  service_tabs,
  stock_balances,
  catalog_items,
  privacy_requests,
  auth_sessions,
  audit_logs,
  audit_events,
  users;
