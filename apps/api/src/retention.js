export const RETENTION_POLICY = "retention-30d-v1";
export const RETENTION_ELIGIBLE_SQL = `o.status IN ('completed','cancelled')
  AND o.completed_at < CURRENT_TIMESTAMP - INTERVAL '30 days'`;

const marker = "'[DADO ANONIMIZADO LGPD]'";
const rootSpecs = [
  {
    table: "orders",
    predicate: "t.id = ANY($1::text[])",
    fields: {
      customer_name: marker,
      delivery_address: `CASE WHEN t.delivery_address IS NULL THEN NULL ELSE ${marker} END`,
      notes: marker,
      items: "retention_redact_json(t.items, 'item')",
      metadata: "retention_redact_json(t.metadata)",
      privacy_anonymized_at: "COALESCE(t.privacy_anonymized_at, CURRENT_TIMESTAMP)",
    },
  },
  {
    table: "service_tabs",
    predicate: "t.id = ANY($2::text[])",
    fields: { customer_name: marker, label: marker },
  },
];

async function selectScope(client) {
  const { rows: eligible } = await client.query(
    `SELECT o.id FROM orders o WHERE ${RETENTION_ELIGIBLE_SQL} ORDER BY o.id`,
  );
  const eligibleIds = eligible.map(({ id }) => id);
  const { rows: selected } = await client.query(
    `SELECT o.id FROM orders o
    WHERE o.id = ANY($1::text[])
      AND NOT EXISTS (SELECT 1 FROM print_jobs p WHERE p.order_id=o.id AND p.status='sending')
      AND NOT EXISTS (SELECT 1 FROM channel_commands c WHERE c.order_id=o.id AND c.status='processing')
    ORDER BY o.id`,
    [eligibleIds],
  );
  const orderIds = selected.map(({ id }) => id);
  const { rows: tabs } = await client.query(
    `SELECT t.id FROM service_tabs t
    WHERE t.status='closed'
      AND EXISTS (SELECT 1 FROM orders o WHERE o.tab_id=t.id AND o.id=ANY($1::text[]))
      AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.tab_id=t.id
        AND ((${RETENTION_ELIGIBLE_SQL}) IS NOT TRUE OR NOT (o.id=ANY($1::text[]))))
    ORDER BY t.id`,
    [orderIds],
  );
  return { eligibleCount: eligible.length, orderIds, tabIds: tabs.map(({ id }) => id) };
}

async function planRows(client, scope, specs = rootSpecs) {
  const plans = [];
  for (const spec of specs) {
    const current = Object.keys(spec.fields)
      .map((name) => `'${name}',t.${name}`)
      .join(",");
    const desired = Object.entries(spec.fields)
      .map(([name, sql]) => `'${name}',${sql}`)
      .join(",");
    const { rows } = await client.query(
      `WITH scope AS (SELECT $1::text[], $2::text[])
      SELECT t.id, jsonb_build_object(${desired})::text AS desired
      FROM public.${spec.table} t WHERE ${spec.predicate}
        AND jsonb_build_object(${current}) IS DISTINCT FROM jsonb_build_object(${desired})
      ORDER BY t.id`,
      [scope.orderIds, scope.tabIds],
    );
    // JSON stays in PostgreSQL text form; never round financial/large numeric values in JS.
    plans.push({ ...spec, rows });
  }
  return plans;
}

function summarize(scope, plans, dryRun) {
  return {
    policy: RETENTION_POLICY,
    dryRun,
    eligibleOrders: scope.eligibleCount,
    selectedOrders: scope.orderIds.length,
    deferredOrders: scope.eligibleCount - scope.orderIds.length,
    changes: Object.fromEntries(plans.map(({ table, rows }) => [table, rows.length])),
    changedRows: plans.reduce((total, { rows }) => total + rows.length, 0),
  };
}

export function previewRetention(db) {
  return db.transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const scope = await selectScope(client);
    return summarize(scope, await planRows(client, scope), true);
  });
}
