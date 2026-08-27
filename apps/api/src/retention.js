import { createHash, randomUUID } from "node:crypto";

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

const artifactSpecs = [
  {
    table: "finance_entries",
    predicate: "t.order_id = ANY($1::text[]) OR t.tab_id = ANY($2::text[])",
    fields: {
      label: "retention_redact_json(to_jsonb(t.label)) #>> '{}'::text[]",
      metadata: "retention_redact_json(t.metadata)",
    },
  },
  {
    table: "tab_payments",
    predicate: "t.tab_id = ANY($2::text[])",
    fields: { metadata: "retention_redact_json(t.metadata)" },
  },
  {
    table: "stock_movements",
    predicate: "t.order_id = ANY($1::text[])",
    fields: {
      metadata: "retention_redact_json(t.metadata)",
      reason: `CASE WHEN t.reason IN ('sale','cancellation','cancellation_loss','restock')
        THEN t.reason ELSE '[DADO ANONIMIZADO LGPD]' END`,
    },
  },
  {
    table: "order_tab_assignments",
    predicate: "t.order_id = ANY($1::text[])",
    fields: { normalized_payload: "retention_redact_json(t.normalized_payload)" },
  },
  {
    table: "channel_mappings",
    predicate: "t.order_id = ANY($1::text[])",
    fields: {
      metadata: "retention_redact_json(t.metadata)",
      sync_error:
        "CASE WHEN t.sync_error IS NULL THEN NULL ELSE retention_redact_json(to_jsonb(t.sync_error)) #>> '{}'::text[] END",
    },
  },
  {
    table: "channel_events",
    predicate: `EXISTS (SELECT 1 FROM channel_mappings m
      WHERE m.order_id = ANY($1::text[])
        AND m.channel = t.channel AND m.merchant_id = t.merchant_id
        AND m.external_id = t.external_order_id)`,
    fields: {
      payload: "retention_redact_json(t.payload)",
      error:
        "CASE WHEN t.error IS NULL THEN NULL ELSE retention_redact_json(to_jsonb(t.error)) #>> '{}'::text[] END",
    },
  },
  {
    table: "channel_commands",
    predicate: "t.order_id = ANY($1::text[])",
    fields: {
      payload: "retention_redact_json(t.payload)",
      response_payload: "retention_redact_json(t.response_payload)",
      error:
        "CASE WHEN t.error IS NULL THEN NULL ELSE retention_redact_json(to_jsonb(t.error)) #>> '{}'::text[] END",
    },
  },
  {
    table: "print_jobs",
    predicate: "t.order_id = ANY($1::text[])",
    fields: {
      content: "'[TICKET ANONIMIZADO]'",
      error: "NULL",
      metadata: "retention_redact_json(t.metadata)",
      history: `COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'at', e->'at',
        'event', CASE WHEN e->>'event' IN ('spooled','reconciled','retry_wait','dead_letter')
          THEN e->'event' ELSE to_jsonb('[DADO ANONIMIZADO LGPD]'::text) END,
        'attempt', e->'attempt', 'class', retention_redact_json(e->'class'),
        'code', retention_redact_json(e->'code')) ORDER BY position)
        FROM jsonb_array_elements(COALESCE(t.history, '[]'::jsonb)) WITH ORDINALITY AS h(e,position)), '[]'::jsonb)`,
    },
  },
  {
    table: "audit_logs",
    predicate: `(t.entity_id = ANY($1::text[]) OR t.entity_id = ANY($2::text[]))
      AND t.entity IN ('orders','service_tabs','tab_payments','finance_entries','print_jobs')`,
    fields: { payload_snapshot: "retention_redact_json(t.payload_snapshot)" },
  },
  {
    table: "audit_events",
    predicate: `EXISTS (SELECT 1 FROM unnest($1::text[]) AS x(id)
        WHERE t.resource_path = '/orders/' || x.id
          OR t.resource_path LIKE '/orders/' || x.id || '/%'
          OR t.resource_path = '/tabs/' || x.id
          OR t.resource_path LIKE '/tabs/' || x.id || '/%')
      OR EXISTS (SELECT 1 FROM print_jobs p
        WHERE p.order_id = ANY($1::text[])
          AND t.resource_path = '/print-jobs/' || p.order_id || '/' || p.id)`,
    fields: {
      state_before: "retention_redact_json(t.state_before)",
      state_after: "retention_redact_json(t.state_after)",
    },
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

async function planRows(client, scope, specs = [...rootSpecs, ...artifactSpecs]) {
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
    deferredOrders: scope.deferredCount ?? scope.eligibleCount - scope.orderIds.length,
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

async function lockChildRows(client, table, orderIds) {
  if (!orderIds.length) return new Set();
  const { rows: expected } = await client.query(
    `SELECT order_id, COUNT(*)::integer AS count FROM ${table}
     WHERE order_id = ANY($1::text[]) GROUP BY order_id`,
    [orderIds],
  );
  const { rows: locked } = await client.query(
    `SELECT id, order_id, status FROM ${table}
     WHERE order_id = ANY($1::text[]) FOR UPDATE SKIP LOCKED`,
    [orderIds],
  );
  const actual = new Map();
  for (const { order_id: orderId } of locked) actual.set(orderId, (actual.get(orderId) || 0) + 1);
  const deferred = new Set(
    expected
      .filter(({ order_id: orderId, count }) => actual.get(orderId) !== count)
      .map(({ order_id: orderId }) => orderId),
  );
  for (const row of locked)
    if (["sending", "processing"].includes(row.status)) deferred.add(row.order_id);
  return deferred;
}

async function lockApplyScope(client) {
  const { rows: eligible } = await client.query(
    `SELECT o.id FROM orders o WHERE ${RETENTION_ELIGIBLE_SQL}
     ORDER BY o.id FOR UPDATE SKIP LOCKED`,
  );
  const eligibleIds = eligible.map(({ id }) => id);
  const deferred = new Set([
    ...(await lockChildRows(client, "print_jobs", eligibleIds)),
    ...(await lockChildRows(client, "channel_commands", eligibleIds)),
  ]);
  const orderIds = eligibleIds.filter((id) => !deferred.has(id));
  const { rows: tabs } = await client.query(
    `SELECT t.id FROM service_tabs t
     WHERE t.status='closed'
       AND EXISTS (SELECT 1 FROM orders o WHERE o.tab_id=t.id AND o.id=ANY($1::text[]))
       AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.tab_id=t.id
         AND ((${RETENTION_ELIGIBLE_SQL}) IS NOT TRUE OR NOT (o.id=ANY($1::text[]))))
     ORDER BY t.id FOR UPDATE SKIP LOCKED`,
    [orderIds],
  );
  return {
    eligibleCount: eligible.length,
    orderIds,
    tabIds: tabs.map(({ id }) => id),
    deferredCount: deferred.size,
  };
}

async function applyRows(client, plans) {
  for (const plan of plans) {
    const columns = Object.keys(plan.fields);
    const definitions = columns
      .map((name) => {
        const jsonb = [
          "items",
          "metadata",
          "normalized_payload",
          "payload",
          "response_payload",
          "history",
          "payload_snapshot",
          "state_before",
          "state_after",
        ].includes(name);
        return `${name} ${name.endsWith("_at") ? "timestamptz" : jsonb ? "jsonb" : "text"}`;
      })
      .join(", ");
    const assignments = columns.map((name) => `"${name}" = v."${name}"`).join(", ");
    for (const row of plan.rows) {
      await client.query(
        `UPDATE public.${plan.table} AS t SET ${assignments}
         FROM jsonb_to_record($2::jsonb) AS v(${definitions}) WHERE t.id=$1`,
        [row.id, row.desired],
      );
    }
  }
}

export function applyRetention(db) {
  return db.transaction(async (client) => {
    await client.query("SET LOCAL lock_timeout = '2s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      "camoburguer:privacy_retention",
    ]);
    const scope = await lockApplyScope(client);
    const plans = await planRows(client, scope);
    const summary = summarize(scope, plans, false);
    if (!summary.changedRows) return { ...summary, status: "no_op", requestId: null };

    const requestId = randomUUID();
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          policy: RETENTION_POLICY,
          orderIds: scope.orderIds,
          tabIds: scope.tabIds,
        }),
      )
      .digest("hex");
    await applyRows(client, plans);
    const printArtifacts =
      plans.find(({ table }) => table === "print_jobs")?.rows.map(({ id }) => ({ jobId: id })) ||
      [];
    const result = {
      ...summary,
      requestId,
      printArtifacts,
    };
    await client.query(
      `INSERT INTO privacy_requests (id,idempotency_key,fingerprint,status,result)
       VALUES ($1,$2,$3,'db_completed',$4::jsonb)`,
      [requestId, `retention:${requestId}`, fingerprint, JSON.stringify(result)],
    );
    return { ...summary, status: "db_completed", requestId };
  });
}

function batchesForArtifacts(artifacts) {
  const batches = [];
  let batch = [];
  for (const artifact of artifacts) {
    const candidate = [...batch, artifact];
    if (candidate.length > 100 || JSON.stringify({ artifacts: candidate }).length > 128 * 1024) {
      if (!batch.length) throw new Error("privacy artifact exceeds bridge body limit");
      batches.push(batch);
      batch = [artifact];
    } else batch = candidate;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

async function updateCleanupStatus(db, row, status, cleanupError = null) {
  const result = {
    ...(row.result && typeof row.result === "object" ? row.result : {}),
    externalCleanup: status === "completed" ? "completed" : "pending",
    cleanupError,
  };
  await db.query(
    "UPDATE privacy_requests SET status=$2, result=$3::jsonb, updated_at=NOW() WHERE id=$1",
    [row.id, status, JSON.stringify(result)],
  );
}

export async function reconcilePendingRetention(
  db,
  { bridgeUrl = "", bridgeToken = "", fetchImpl = globalThis.fetch } = {},
) {
  const { rows } = await db.query(
    `SELECT id, status, result FROM privacy_requests
     WHERE idempotency_key LIKE 'retention:%'
       AND status IN ('db_completed','pending_external_cleanup')
     ORDER BY created_at, id`,
  );
  let completed = 0;
  let pending = 0;
  for (const row of rows) {
    const artifacts = Array.isArray(row.result?.printArtifacts) ? row.result.printArtifacts : [];
    if (!artifacts.length) {
      await updateCleanupStatus(db, row, "completed");
      completed += 1;
      continue;
    }
    if (typeof fetchImpl !== "function" || !String(bridgeUrl).trim()) {
      await updateCleanupStatus(db, row, "pending_external_cleanup", "print_bridge_unconfigured");
      pending += 1;
      continue;
    }
    try {
      for (const artifactsBatch of batchesForArtifacts(artifacts)) {
        const response = await fetchImpl(
          `${String(bridgeUrl).replace(/\/$/, "")}/privacy/anonymize`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(bridgeToken ? { authorization: `Bearer ${bridgeToken}` } : {}),
            },
            body: JSON.stringify({ artifacts: artifactsBatch }),
            signal: AbortSignal.timeout(10_000),
          },
        );
        if (!response.ok) throw new Error("bridge_http_failure");
        const payload = await response.json();
        const sanitized = new Set(Array.isArray(payload?.sanitized) ? payload.sanitized : []);
        if (payload?.ok !== true || !artifactsBatch.every(({ jobId }) => sanitized.has(jobId)))
          throw new Error("bridge_invalid_response");
      }
      await updateCleanupStatus(db, row, "completed");
      completed += 1;
    } catch {
      await updateCleanupStatus(db, row, "pending_external_cleanup", "print_bridge_unavailable");
      pending += 1;
    }
  }
  return { completed, pending };
}
