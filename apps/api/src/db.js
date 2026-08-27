import { CATALOG, CATALOG_CAPTURED_AT } from "@camoburguer/domain";
import { toMoney } from "@camoburguer/shared-types";
import pg from "pg";
import { runMigrations } from "./migrations.js";

const { Pool, types } = pg;

types.setTypeParser(1700, (value) => Number(value));

export function createDb(connectionString) {
  const pool = new Pool({ connectionString });
  return {
    async init() {
      // Check for duplicate channel mappings (M-03)
      const { rows: tableCheck } = await pool.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_mappings'",
      );
      if (tableCheck.length > 0) {
        const { rows: duplicates } = await pool.query(
          "SELECT order_id FROM channel_mappings GROUP BY order_id HAVING COUNT(*) > 1 LIMIT 1",
        );
        if (duplicates.length > 0) {
          throw new Error(
            `Invariante quebrado: Existem multiplos mapeamentos para o mesmo pedido em channel_mappings (ex: order_id=${duplicates[0].order_id}). Remova a duplicata manualmente antes de migrar.`,
          );
        }
      }

      // Check for multiple open cash shifts (M-05)
      try {
        const { rows } = await pool.query(
          "SELECT id, opened_at FROM cash_shifts WHERE status = 'open'",
        );
        if (rows.length > 1) {
          const ids = rows.map((r) => r.id).join(", ");
          const times = rows.map((r) => new Date(r.opened_at).toISOString()).join(", ");
          console.error(
            `[FATAL] Detectados múltiplos caixas abertos: IDs (${ids}) abertos em (${times}). Falha de segurança. Reconciliação manual obrigatória. Consulte o runbook em docs/operacao/runbook-duplicatas.md`,
          );
          process.exit(1);
        }
      } catch (_e) {
        // Table might not exist yet during fresh setup, ignore.
      }
      await runMigrations(pool);
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
        [
          JSON.stringify(
            CATALOG.map((item) => ({
              sku: item.sku,
              name: item.name,
              category: item.category,
              price: item.price,
              description: item.description,
              stock_category: item.stockCategory,
              allows_addons: item.allowsAddons,
              preparation_mode: item.preparationMode,
              available: item.available,
            })),
          ),
          CATALOG_CAPTURED_AT,
        ],
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
          return Object.fromEntries(
            Object.entries(value).map(([key, nested]) => [key, redactJson(nested)]),
          );
        }
        return typeof value === "string" ? anonymizedText : value;
      };
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
          `privacy:${idempotencyKey}`,
        ]);
        const existing = await client.query(
          "SELECT * FROM privacy_requests WHERE idempotency_key = $1 FOR UPDATE",
          [idempotencyKey],
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
            repeated: true,
          };
        }
        await client.query(
          `INSERT INTO privacy_requests (id, idempotency_key, fingerprint, status)
           VALUES ($1,$2,$3,'processing')`,
          [requestId, idempotencyKey, requestFingerprint],
        );

        const { rows: orders } = await client.query(
          `SELECT * FROM orders
           WHERE POSITION(LOWER($1) IN LOWER(
             customer_name || ' ' || COALESCE(delivery_address, '') || ' ' || notes || ' '
             || items::text || ' ' || metadata::text
           )) > 0
           FOR UPDATE`,
          [term],
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
            [
              row.id,
              anonymizedText,
              JSON.stringify(redactJson(row.items)),
              JSON.stringify(redactJson(row.metadata)),
            ],
          );
        }

        const { rows: tabs } = await client.query(
          `SELECT * FROM service_tabs
           WHERE id = ANY($2::text[])
              OR POSITION(LOWER($1) IN LOWER(COALESCE(customer_name, ''))) > 0
           FOR UPDATE`,
          [term, tabIds],
        );
        for (const row of tabs) {
          await client.query("UPDATE service_tabs SET customer_name = $2 WHERE id = $1", [
            row.id,
            anonymizedText,
          ]);
        }
        const allTabIds = [...new Set([...tabIds, ...tabs.map((row) => row.id)])];

        const { rows: finance } = await client.query(
          `SELECT * FROM finance_entries
           WHERE order_id = ANY($2::text[])
              OR POSITION(LOWER($1) IN LOWER(metadata::text || ' ' || label)) > 0
           FOR UPDATE`,
          [term, orderIds],
        );
        for (const row of finance) {
          await client.query(
            "UPDATE finance_entries SET label = $2, metadata = $3::jsonb WHERE id = $1",
            [row.id, anonymizedText, JSON.stringify(redactJson(row.metadata))],
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
          [term, orderIds],
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
              JSON.stringify(redactJson(row.metadata)),
            ],
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
          [term, externalIds],
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
              JSON.stringify(redactJson(row.payload)),
            ],
          );
        }

        const jsonTables = [
          ["channel_commands", "payload", "order_id", orderIds],
          ["order_tab_assignments", "normalized_payload", "order_id", orderIds],
          ["tab_payments", "metadata", "tab_id", allTabIds],
          ["stock_movements", "metadata", "order_id", orderIds],
        ];
        const jsonCounts = {};
        for (const [table, column, relation, ids] of jsonTables) {
          const { rows } = await client.query(
            `SELECT id, ${column} AS payload FROM ${table}
             WHERE ${relation} = ANY($2::text[])
                OR POSITION(LOWER($1) IN LOWER(${column}::text)) > 0
             FOR UPDATE`,
            [term, ids],
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
                : [row.id, JSON.stringify(redactJson(row.payload))],
            );
          }
          jsonCounts[table] = rows.length;
        }
        const { rows: shifts } = await client.query(
          `UPDATE cash_shifts SET notes = $2
           WHERE POSITION(LOWER($1) IN LOWER(notes)) > 0
           RETURNING id`,
          [term, anonymizedText],
        );
        const { rows: printJobs } = await client.query(
          `UPDATE print_jobs
           SET content = '[TICKET ANONIMIZADO]', error = NULL,
               metadata = jsonb_build_object('privacyRequestId', $2::text)
           WHERE order_id = ANY($3::text[])
              OR POSITION(LOWER($1) IN LOWER(content)) > 0
           RETURNING id, order_id`,
          [term, requestId, orderIds],
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
          backupPolicy: "provider_retention_not_modified",
        };
        await client.query(
          `UPDATE privacy_requests
           SET status = 'db_completed', result = $2::jsonb, updated_at = NOW()
           WHERE id = $1`,
          [requestId, JSON.stringify(result)],
        );
        await client.query("COMMIT");
        return {
          requestId,
          status: "db_completed",
          ...result,
          repeated: false,
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
        [requestId, status, JSON.stringify(result)],
      );
      return rows[0];
    },
    async close() {
      await pool.end();
    },
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
    updatedAt: new Date(row.updated_at).toISOString(),
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
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
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
    createdAt: new Date(row.created_at).toISOString(),
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
    occurredAt: new Date(row.occurred_at).toISOString(),
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
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
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
    updatedAt: new Date(row.updated_at).toISOString(),
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
    processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null,
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
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  };
}
