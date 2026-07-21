import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import { toMoney } from "@camoburguer/shared-types";
import {
  ADD_ONS,
  CATALOG,
  CATALOG_CAPTURED_AT,
  CATALOG_SOURCE_URL,
  buildKitchenTicket,
  calculateOrderTotal,
  calculateStockRequirements,
  closeCashShift,
  createCashShift,
  createCancellationOrder,
  createOrder,
  transitionOrder
} from "@camoburguer/domain";
import {
  buildEntriesFromOrder,
  buildEntryFromAdjustment,
  buildEntryFromTabPayment,
  buildOpeningEntry,
  filterEntries,
  summarizeFinance
} from "@camoburguer/finance-core";
import { config } from "./config.js";
import { createDb, mapFinanceEntry, mapOrder, mapShift, mapTab, mapTabPayment } from "./db.js";
import { createSseHub } from "./sse.js";
import integrationRoutes from "./integrations/integration-routes.js";
import { startIntegrationPolling } from "./integrations/polling-runner.js";

const app = Fastify({ logger: true });
const db = createDb(config.databaseUrl);
const sse = createSseHub();
const TAB_PAYMENT_METHODS = ["cash", "pix", "credit_card", "debit_card", "app_paid"];

await app.register(cors, { origin: true });

app.setErrorHandler((error, request, reply) => {
  const clientError = Boolean(error.validation) || (!error.code && /inválid|obrigatóri|deve ter|transição|item|preço|valor/i.test(error.message));
  const publicError = clientError || Number(error.statusCode) < 500;
  if (!publicError) request.log.error(error);
  return reply
    .code(clientError ? 400 : (error.statusCode || 500))
    .send({ message: publicError ? error.message : "Erro interno do servidor" });
});

async function insertOrder(order, executor = db) {
  const { rows } = await executor.query(
    `INSERT INTO orders (
      id, idempotency_key, tab_id, round_number, round_kind, reverses_order_id, source, status, customer_name, fulfillment_mode, delivery_address,
      promised_at, notes, payment_method, total, discount_percent, items, metadata, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19,$20
    ) RETURNING *`,
    [
      order.id,
      order.idempotencyKey,
      order.tabId,
      order.roundNumber,
      order.roundKind,
      order.reversesOrderId,
      order.source,
      order.status,
      order.customerName,
      order.fulfillmentMode,
      order.deliveryAddress,
      order.promisedAt,
      order.notes,
      order.paymentMethod || (order.tabId ? null : (["ifood", "deliverymuch"].includes(order.source) ? "app_paid" : "cash")),
      order.total,
      order.discountPercent,
      JSON.stringify(order.items),
      JSON.stringify(order.metadata),
      order.createdAt,
      order.updatedAt
    ]
  );
  return mapOrder(rows[0]);
}

async function getOrder(orderId, executor = db, forUpdate = false) {
  const { rows } = await executor.query(
    `SELECT * FROM orders WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`,
    [orderId]
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}

async function getOrderByIdempotencyKey(idempotencyKey, executor = db) {
  const { rows } = await executor.query(
    "SELECT * FROM orders WHERE idempotency_key = $1",
    [idempotencyKey]
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}

async function listOrders() {
  const { rows } = await db.query(`
    SELECT o.*, cm.sync_status, cm.external_id, cm.channel
    FROM orders o
    LEFT JOIN channel_mappings cm ON o.id = cm.order_id
    ORDER BY o.created_at DESC
  `);
  return rows.map(row => {
    const order = mapOrder(row);
    if (row.channel) {
      order.syncStatus = row.sync_status;
      order.externalId = row.external_id;
    }
    return order;
  });
}

async function getTab(tabId, executor = db, forUpdate = false) {
  const { rows } = await executor.query(
    `SELECT * FROM service_tabs WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`,
    [tabId]
  );
  return rows[0] ? mapTab(rows[0]) : null;
}

async function tabView(tab, executor = db) {
  const [ordersResult, paymentsResult] = await Promise.all([
    executor.query("SELECT * FROM orders WHERE tab_id = $1 ORDER BY round_number, created_at", [tab.id]),
    executor.query("SELECT * FROM tab_payments WHERE tab_id = $1 ORDER BY created_at, id", [tab.id])
  ]);
  const rounds = ordersResult.rows.map(mapOrder);
  const payments = paymentsResult.rows.map(mapTabPayment);
  const total = toMoney(tab.finalTotal ?? rounds.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + Number(order.total), 0));
  const totalCents = Math.round(total * 100);
  const paidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const methodBalances = payments.reduce((balances, payment) => {
    balances[payment.paymentMethod] = (balances[payment.paymentMethod] || 0) + payment.amountCents;
    return balances;
  }, {});
  const activeMethods = Object.entries(methodBalances).filter(([, amount]) => amount > 0).map(([method]) => method);
  return {
    ...tab,
    rounds,
    payments,
    total,
    totalCents,
    paid: toMoney(paidCents / 100),
    paidCents,
    balance: toMoney((totalCents - paidCents) / 100),
    balanceCents: totalCents - paidCents,
    paymentMethod: activeMethods.length > 1 ? "mixed" : activeMethods[0] || null
  };
}

async function listTabs(status = null) {
  const values = status ? [status] : [];
  const { rows } = await db.query(
    `SELECT * FROM service_tabs${status ? " WHERE status = $1" : ""} ORDER BY opened_at DESC`,
    values
  );
  return Promise.all(rows.map((row) => tabView(mapTab(row))));
}

async function getTabPayment(paymentId, executor = db, forUpdate = false) {
  const { rows } = await executor.query(
    `SELECT * FROM tab_payments WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`,
    [paymentId]
  );
  return rows[0] ? mapTabPayment(rows[0]) : null;
}

async function getTabPaymentByIdempotencyKey(idempotencyKey, executor = db) {
  const { rows } = await executor.query(
    "SELECT * FROM tab_payments WHERE idempotency_key = $1",
    [idempotencyKey]
  );
  return rows[0] ? mapTabPayment(rows[0]) : null;
}

async function insertTabPayment(payment, executor = db) {
  const { rows } = await executor.query(
    `INSERT INTO tab_payments (
      id, tab_id, shift_id, kind, reverses_payment_id, payment_method,
      amount_cents, idempotency_key, metadata, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10) RETURNING *`,
    [
      payment.id,
      payment.tabId,
      payment.shiftId,
      payment.kind,
      payment.reversesPaymentId,
      payment.paymentMethod,
      payment.amountCents,
      payment.idempotencyKey,
      JSON.stringify(payment.metadata || {}),
      payment.createdAt
    ]
  );
  return mapTabPayment(rows[0]);
}

function sameTabPayment(payment, expected) {
  return payment.tabId === expected.tabId
    && payment.kind === expected.kind
    && payment.paymentMethod === expected.paymentMethod
    && payment.amountCents === expected.amountCents
    && payment.reversesPaymentId === (expected.reversesPaymentId || null);
}

async function changeStock(order, multiplier, reason, executor, sourceOrderId = order.id) {
  const requirements = calculateStockRequirements(order.items);
  const movements = [];
  for (const category of Object.keys(requirements).sort()) {
    const delta = Number(requirements[category]) * multiplier;
    if (reason === "cancellation") {
      const sale = await executor.query(
        "SELECT 1 FROM stock_movements WHERE order_id = $1 AND category = $2 AND reason = 'sale'",
        [sourceOrderId, category]
      );
      if (!sale.rows[0]) continue;
    }
    const { rows } = await executor.query(
      "SELECT * FROM stock_balances WHERE category = $1 FOR UPDATE",
      [category]
    );
    const inserted = await executor.query(
      `INSERT INTO stock_movements (id, category, delta, reason, order_id, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) ON CONFLICT DO NOTHING RETURNING *`,
      [randomUUID(), category, delta, reason, order.id, JSON.stringify({ roundKind: order.roundKind }), new Date().toISOString()]
    );
    if (!inserted.rows[0]) continue;
    const nextQuantity = Number(rows[0].quantity) + delta;
    if (nextQuantity < 0) {
      const error = new Error(`Estoque insuficiente para ${category}`);
      error.statusCode = 409;
      throw error;
    }
    await executor.query(
      "UPDATE stock_balances SET quantity = $2, updated_at = NOW() WHERE category = $1",
      [category, nextQuantity]
    );
    movements.push(inserted.rows[0]);
  }
  return movements;
}

async function inventoryView() {
  const [balances, movements] = await Promise.all([
    db.query("SELECT * FROM stock_balances ORDER BY category"),
    db.query("SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 100")
  ]);
  return {
    balances: balances.rows.map((row) => ({ category: row.category, quantity: Number(row.quantity), updatedAt: new Date(row.updated_at).toISOString() })),
    movements: movements.rows.map((row) => ({
      id: row.id,
      category: row.category,
      delta: Number(row.delta),
      reason: row.reason,
      orderId: row.order_id,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at).toISOString()
    }))
  };
}

async function updateOrder(order, expectedStatus, executor = db) {
  const { rows } = await executor.query(
    `UPDATE orders SET
      source = $2,
      status = $3,
      customer_name = $4,
      fulfillment_mode = $5,
      delivery_address = $6,
      promised_at = $7,
      notes = $8,
      payment_method = $9,
      total = $10,
      discount_percent = $11,
      items = $12::jsonb,
      metadata = $13::jsonb,
      updated_at = $14
    WHERE id = $1 AND status = $15
    RETURNING *`,
    [
      order.id,
      order.source,
      order.status,
      order.customerName,
      order.fulfillmentMode,
      order.deliveryAddress,
      order.promisedAt,
      order.notes,
      order.paymentMethod,
      order.total,
      order.discountPercent,
      JSON.stringify(order.items),
      JSON.stringify(order.metadata),
      order.updatedAt,
      expectedStatus
    ]
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}

async function listEntries() {
  const { rows } = await db.query("SELECT * FROM finance_entries ORDER BY occurred_at DESC");
  return rows.map(mapFinanceEntry);
}

async function insertEntries(entries, executor = db) {
  const inserted = [];
  for (const entry of entries) {
    const { rows } = await executor.query(
      `INSERT INTO finance_entries (
        id, order_id, tab_id, payment_id, shift_id, type, amount, payment_method,
        source, label, metadata, occurred_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12
      ) ON CONFLICT DO NOTHING
      RETURNING *`,
      [
        entry.id,
        entry.orderId || null,
        entry.tabId || null,
        entry.paymentId || null,
        entry.shiftId || null,
        entry.type,
        entry.amount,
        entry.paymentMethod,
        entry.source,
        entry.label,
        JSON.stringify(entry.metadata || {}),
        entry.occurredAt
      ]
    );
    if (rows[0]) inserted.push(mapFinanceEntry(rows[0]));
  }
  return inserted;
}

async function listShifts() {
  const { rows } = await db.query("SELECT * FROM cash_shifts ORDER BY opened_at DESC");
  return rows.map(mapShift);
}

async function getShift(shiftId, executor = db, forUpdate = false) {
  const { rows } = await executor.query(
    `SELECT * FROM cash_shifts WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`,
    [shiftId]
  );
  return rows[0] ? mapShift(rows[0]) : null;
}

async function insertShift(shift, executor = db) {
  const { rows } = await executor.query(
    `INSERT INTO cash_shifts (
      id, status, opening_amount, expected_amount,
      declared_amount, difference_amount, notes, opened_at, closed_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9
    ) RETURNING *`,
    [
      shift.id,
      shift.status,
      shift.openingAmount,
      shift.expectedAmount,
      shift.declaredAmount,
      shift.differenceAmount,
      shift.notes,
      shift.openedAt,
      shift.closedAt
    ]
  );
  return mapShift(rows[0]);
}

async function updateShift(shift, expectedStatus, executor = db) {
  const { rows } = await executor.query(
    `UPDATE cash_shifts SET
      status = $2,
      opening_amount = $3,
      expected_amount = $4,
      declared_amount = $5,
      difference_amount = $6,
      notes = $7,
      opened_at = $8,
      closed_at = $9
    WHERE id = $1 AND status = $10
    RETURNING *`,
    [
      shift.id,
      shift.status,
      shift.openingAmount,
      shift.expectedAmount,
      shift.declaredAmount,
      shift.differenceAmount,
      shift.notes,
      shift.openedAt,
      shift.closedAt,
      expectedStatus
    ]
  );
  return rows[0] ? mapShift(rows[0]) : null;
}

function mapPrintJob(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    reason: row.reason,
    status: row.status,
    printerName: row.printer_name,
    content: row.content,
    attempts: row.attempts,
    error: row.error,
    metadata: row.metadata || {}
  };
}

async function reservePrintJob(order, reason = "confirmed", executor = db) {
  const { rows } = await executor.query(
    `INSERT INTO print_jobs (
      id, order_id, reason, status, printer_name, content, attempts, error, metadata
    ) VALUES ($1,$2,$3,'pending',$4,$5,0,NULL,$6::jsonb)
    ON CONFLICT DO NOTHING
    RETURNING *`,
    [
      randomUUID(),
      order.id,
      reason,
      config.defaultPrinter,
      buildKitchenTicket(order),
      JSON.stringify({ reason })
    ]
  );
  return rows[0] ? mapPrintJob(rows[0]) : null;
}

async function getPrimaryPrintJob(orderId) {
  const { rows } = await db.query(
    "SELECT * FROM print_jobs WHERE order_id = $1 AND reason IN ('confirmed', 'cancellation') ORDER BY created_at LIMIT 1",
    [orderId]
  );
  return rows[0] ? mapPrintJob(rows[0]) : null;
}

async function dispatchPrintJob(job) {
  const { rows } = await db.query(
    `UPDATE print_jobs
     SET status = 'sending', attempts = attempts + 1, error = NULL
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [job.id]
  );
  if (!rows[0]) return job;

  try {
    const response = await fetch(`${config.printBridgeUrl}/print-jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        jobId: job.id,
        orderId: job.orderId,
        printerName: job.printerName,
        content: job.content,
        reason: job.reason
      })
    });
    if (!response.ok) throw new Error(`Print bridge respondeu ${response.status}`);
    const payload = await response.json();
    const updated = await db.query(
      `UPDATE print_jobs
       SET status = $2, printer_name = $3, error = $4, metadata = $5::jsonb
       WHERE id = $1
       RETURNING *`,
      [
        job.id,
        payload.status || "printed",
        payload.printerName || job.printerName,
        payload.error || null,
        JSON.stringify({ ...(payload.metadata || {}), bridgeJobId: payload.id, reason: job.reason })
      ]
    );
    return mapPrintJob(updated.rows[0]);
  } catch (error) {
    const failed = await db.query(
      `UPDATE print_jobs SET status = 'failed', error = $2 WHERE id = $1 RETURNING *`,
      [job.id, error.message]
    );
    return mapPrintJob(failed.rows[0]);
  }
}

let printRecoveryInFlight = false;
async function recoverPrintJobs(includeInterrupted = false) {
  if (printRecoveryInFlight) return;
  printRecoveryInFlight = true;
  try {
    await db.query(
      `UPDATE print_jobs SET status = 'pending'
       WHERE status = 'failed'${includeInterrupted ? " OR status = 'sending'" : ""}`
    );
    const { rows } = await db.query(
      "SELECT * FROM print_jobs WHERE status = 'pending' ORDER BY created_at LIMIT 20"
    );
    for (const row of rows) await dispatchPrintJob(mapPrintJob(row));
  } finally {
    printRecoveryInFlight = false;
  }
}

async function getOpenShift(executor = db) {
  const { rows } = await executor.query(
    "SELECT * FROM cash_shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1 FOR UPDATE"
  );
  return rows[0] ? mapShift(rows[0]) : null;
}

function emitOrderEvent(type, payload) {
  sse.publish("orders", { type, payload, at: new Date().toISOString() });
}

function emitFinanceEvent(type, payload) {
  sse.publish("finance", { type, payload, at: new Date().toISOString() });
}

app.get("/health", async () => ({ ok: true, service: "api" }));
app.get("/catalog", async () => ({
  sourceUrl: CATALOG_SOURCE_URL,
  capturedAt: CATALOG_CAPTURED_AT,
  addOns: ADD_ONS,
  items: CATALOG
}));
app.get("/scenario-rules", async () => ({
  items: [
    {
      id: "ticket-destaque-retirada",
      name: "Retirada destacada",
      event: "order.confirmed",
      active: true,
      condition: { fulfillmentMode: "pickup" },
      action: { priority: "high", label: "RETIRADA" }
    },
    {
      id: "ticket-whatsapp",
      name: "Origem WhatsApp no ticket",
      event: "order.confirmed",
      active: true,
      condition: { source: "whatsapp" },
      action: { emphasizeSource: true }
    }
  ]
}));

app.get("/inventory", async () => inventoryView());

app.post("/inventory/:category/adjustments", async (request, reply) => {
  const category = request.params.category;
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  const delta = Number(request.body?.delta);
  const note = String(request.body?.reason || "").trim();
  if (!["xis", "dog", "hamburguer"].includes(category)) return reply.code(400).send({ message: "Categoria de estoque inválida" });
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });
  if (!Number.isInteger(delta) || delta === 0) return reply.code(400).send({ message: "Ajuste deve ser um inteiro diferente de zero" });
  if (!note) return reply.code(400).send({ message: "Motivo do ajuste é obrigatório" });

  const result = await db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [idempotencyKey]);
    const { rows: repeatedRows } = await client.query(
      "SELECT * FROM stock_movements WHERE idempotency_key = $1",
      [idempotencyKey]
    );
    if (repeatedRows[0]) {
      const original = repeatedRows[0];
      const samePayload = original.category === category
        && Number(original.delta) === delta
        && String(original.metadata?.note || "") === note;
      if (!samePayload) {
        const error = new Error("Idempotency-Key já usada com outro ajuste de estoque");
        error.statusCode = 409;
        throw error;
      }
      return { movement: original, repeated: true };
    }
    const { rows: balanceRows } = await client.query(
      "SELECT * FROM stock_balances WHERE category = $1 FOR UPDATE",
      [category]
    );
    const nextQuantity = Number(balanceRows[0].quantity) + delta;
    if (nextQuantity < 0) {
      const error = new Error("Ajuste deixaria o estoque negativo");
      error.statusCode = 409;
      throw error;
    }
    await client.query(
      "UPDATE stock_balances SET quantity = $2, updated_at = NOW() WHERE category = $1",
      [category, nextQuantity]
    );
    const { rows } = await client.query(
      `INSERT INTO stock_movements (id, category, delta, reason, idempotency_key, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,
      [
        randomUUID(),
        category,
        delta,
        delta > 0 ? "manual_entry" : "manual_withdrawal",
        idempotencyKey,
        JSON.stringify({ note }),
        new Date().toISOString()
      ]
    );
    return { movement: rows[0], repeated: false };
  });
  return reply.code(result.repeated ? 200 : 201).send({
    ...(await inventoryView()),
    repeated: result.repeated
  });
});

app.get("/tabs", async (request, reply) => {
  const status = request.query?.status || null;
  if (status && !["open", "closed", "cancelled"].includes(status)) {
    return reply.code(400).send({ message: "Status de comanda inválido" });
  }
  return { items: await listTabs(status) };
});

app.post("/tabs", async (request, reply) => {
  const kind = request.body?.kind || "tab";
  const label = String(request.body?.label || "").trim();
  if (!['tab', 'table'].includes(kind)) return reply.code(400).send({ message: "Tipo de comanda inválido" });
  if (!label) return reply.code(400).send({ message: "Identificador da comanda é obrigatório" });
  try {
    const { rows } = await db.query(
      `INSERT INTO service_tabs (id, kind, label, customer_name, status, opened_at)
       VALUES ($1,$2,$3,$4,'open',$5) RETURNING *`,
      [randomUUID(), kind, label, String(request.body?.customerName || "").trim() || null, new Date().toISOString()]
    );
    return reply.code(201).send(await tabView(mapTab(rows[0])));
  } catch (error) {
    if (error.code === "23505") return reply.code(409).send({ message: "Já existe uma comanda aberta com este identificador" });
    throw error;
  }
});

app.get("/tabs/:tabId", async (request, reply) => {
  const tab = await getTab(request.params.tabId);
  return tab ? tabView(tab) : reply.code(404).send({ message: "Comanda não encontrada" });
});

app.post("/tabs/:tabId/rounds", async (request, reply) => {
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });
  const existing = await getOrderByIdempotencyKey(idempotencyKey);
  if (existing) return existing.tabId === request.params.tabId
    ? existing
    : reply.code(409).send({ message: "Chave idempotente já usada em outra operação" });

  let result;
  try {
    result = await db.transaction(async (client) => {
      const tab = await getTab(request.params.tabId, client, true);
      if (!tab) return { notFound: true };
      if (tab.status !== "open") return { conflict: true };
      const { rows } = await client.query(
        "SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round FROM orders WHERE tab_id = $1",
        [tab.id]
      );
      const order = transitionOrder(createOrder({
        ...(request.body || {}),
        idempotencyKey,
        tabId: tab.id,
        roundNumber: Number(rows[0].next_round),
        source: "counter",
        fulfillmentMode: "local",
        paymentMethod: null,
        customerName: request.body?.customerName || tab.customerName || tab.label,
        metadata: { ...(request.body?.metadata || {}), tabLabel: tab.label }
      }), "confirmed");
      const saved = await insertOrder(order, client);
      await changeStock(saved, -1, "sale", client);
      return { saved, printJob: await reservePrintJob(saved, "confirmed", client) };
    });
  } catch (error) {
    if (error.code === "23505") {
      const duplicate = await getOrderByIdempotencyKey(idempotencyKey);
      if (duplicate) return duplicate.tabId === request.params.tabId
        ? duplicate
        : reply.code(409).send({ message: "Chave idempotente já usada em outra operação" });
    }
    throw error;
  }
  if (result.notFound) return reply.code(404).send({ message: "Comanda não encontrada" });
  if (result.conflict) return reply.code(409).send({ message: "Comanda não está aberta" });
  emitOrderEvent("tab.round.created", result.saved);
  if (result.printJob) await dispatchPrintJob(result.printJob);
  return reply.code(201).send(result.saved);
});

app.post("/tabs/:tabId/rounds/:orderId/cancellations", async (request, reply) => {
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });
  const existing = await getOrderByIdempotencyKey(idempotencyKey);
  if (existing) return existing.tabId === request.params.tabId && existing.reversesOrderId === request.params.orderId
    ? existing
    : reply.code(409).send({ message: "Chave idempotente já usada em outra operação" });

  let result;
  try {
    result = await db.transaction(async (client) => {
      const tab = await getTab(request.params.tabId, client, true);
      if (!tab) return { notFound: true };
      if (tab.status !== "open") return { conflict: "Comanda não está aberta" };
      const original = await getOrder(request.params.orderId, client, true);
      if (!original || original.tabId !== tab.id || original.roundKind !== "production") {
        return { conflict: "Rodada original inválida" };
      }
      const { rows: cancellationRows } = await client.query(
        "SELECT items FROM orders WHERE reverses_order_id = $1 AND round_kind = 'cancellation'",
        [original.id]
      );
      const previouslyCancelled = cancellationRows.flatMap((row) => row.items || []);
      const requested = request.body?.items;
      if (!Array.isArray(requested) || !requested.length) return { invalid: "Informe ao menos um item para cancelar" };
      if (new Set(requested.map((item) => item.itemId)).size !== requested.length) {
        return { invalid: "Item de cancelamento duplicado" };
      }
      const items = [];
      for (const requestedItem of requested) {
        const originalItem = original.items.find((item) => item.id === requestedItem.itemId);
        const quantity = Number(requestedItem.quantity);
        const cancelledQuantity = previouslyCancelled
          .filter((item) => item.reversesItemId === requestedItem.itemId)
          .reduce((sum, item) => sum + Number(item.quantity), 0);
        if (!originalItem || !Number.isInteger(quantity) || quantity <= 0 || quantity > originalItem.quantity - cancelledQuantity) {
          return { invalid: "Quantidade de cancelamento inválida" };
        }
        items.push({
          ...originalItem,
          id: undefined,
          quantity,
          reversesItemId: originalItem.id
        });
      }
      const { rows } = await client.query(
        "SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round FROM orders WHERE tab_id = $1",
        [tab.id]
      );
      const cancellation = transitionOrder(createCancellationOrder({
        idempotencyKey,
        tabId: tab.id,
        roundNumber: Number(rows[0].next_round),
        reversesOrderId: original.id,
        source: "counter",
        fulfillmentMode: "local",
        paymentMethod: null,
        customerName: original.customerName,
        discountPercent: original.discountPercent,
        items,
        notes: String(request.body?.reason || "").trim(),
        metadata: {
          tabLabel: tab.label,
          originalStatusAtCancellation: original.status
        }
      }), "confirmed");
      const saved = await insertOrder(cancellation, client);
      if (original.status === "confirmed") await changeStock(saved, 1, "cancellation", client, original.id);
      return { saved, printJob: await reservePrintJob(saved, "cancellation", client) };
    });
  } catch (error) {
    if (error.code === "23505") {
      const duplicate = await getOrderByIdempotencyKey(idempotencyKey);
      if (duplicate && duplicate.tabId === request.params.tabId && duplicate.reversesOrderId === request.params.orderId) return duplicate;
    }
    throw error;
  }
  if (result.notFound) return reply.code(404).send({ message: "Comanda não encontrada" });
  if (result.conflict) return reply.code(409).send({ message: result.conflict });
  if (result.invalid) return reply.code(400).send({ message: result.invalid });
  emitOrderEvent("tab.round.cancelled", result.saved);
  if (result.printJob) await dispatchPrintJob(result.printJob);
  return reply.code(201).send(result.saved);
});

app.post("/tabs/:tabId/payments", async (request, reply) => {
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  const paymentMethod = String(request.body?.paymentMethod || "").trim();
  const amountCents = Number(request.body?.amountCents);
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });
  if (!TAB_PAYMENT_METHODS.includes(paymentMethod)) return reply.code(400).send({ message: "Forma de pagamento inválida" });
  if (!Number.isInteger(amountCents) || amountCents <= 0) return reply.code(400).send({ message: "Valor em centavos deve ser um inteiro positivo" });

  const result = await db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [idempotencyKey]);
    const existing = await getTabPaymentByIdempotencyKey(idempotencyKey, client);
    const expected = { tabId: request.params.tabId, kind: "payment", paymentMethod, amountCents, reversesPaymentId: null };
    if (existing) return sameTabPayment(existing, expected)
      ? { saved: existing, repeated: true, tab: await tabView(await getTab(request.params.tabId, client), client) }
      : { idempotencyConflict: true };

    const tab = await getTab(request.params.tabId, client, true);
    if (!tab) return { notFound: true };
    if (tab.status !== "open") return { closed: true };
    const view = await tabView(tab, client);
    if (amountCents > view.balanceCents) return { overpayment: true, balanceCents: view.balanceCents };
    const shift = await getOpenShift(client);
    if (!shift) return { noOpenShift: true };
    const saved = await insertTabPayment({
      id: randomUUID(),
      tabId: tab.id,
      shiftId: shift?.id || null,
      kind: "payment",
      reversesPaymentId: null,
      paymentMethod,
      amountCents,
      idempotencyKey,
      metadata: {},
      createdAt: new Date().toISOString()
    }, client);
    await insertEntries([buildEntryFromTabPayment({ payment: saved, tab })], client);
    if (shift && paymentMethod === "cash") {
      await updateShift({ ...shift, expectedAmount: toMoney(shift.expectedAmount + amountCents / 100) }, "open", client);
    }
    return { saved, repeated: false, tab: await tabView(tab, client) };
  });
  if (result.notFound) return reply.code(404).send({ message: "Comanda não encontrada" });
  if (result.closed) return reply.code(409).send({ message: "Comanda não está aberta" });
  if (result.noOpenShift) return reply.code(409).send({ message: "Abra o turno de caixa antes de registrar pagamentos" });
  if (result.idempotencyConflict) return reply.code(409).send({ message: "Idempotency-Key já usada com outro pagamento" });
  if (result.overpayment) return reply.code(409).send({
    code: "TAB_PAYMENT_EXCEEDS_BALANCE",
    message: "Pagamento ultrapassa o saldo restante",
    balanceCents: result.balanceCents
  });
  emitFinanceEvent("tab.payment.recorded", result.saved);
  return reply.code(result.repeated ? 200 : 201).send(result);
});

app.post("/tabs/:tabId/payments/:paymentId/reversals", async (request, reply) => {
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });

  const result = await db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [idempotencyKey]);
    const existing = await getTabPaymentByIdempotencyKey(idempotencyKey, client);
    if (existing) return existing.tabId === request.params.tabId
      && existing.kind === "reversal"
      && existing.reversesPaymentId === request.params.paymentId
      ? { saved: existing, repeated: true, tab: await tabView(await getTab(request.params.tabId, client), client) }
      : { idempotencyConflict: true };

    const tab = await getTab(request.params.tabId, client, true);
    if (!tab) return { notFound: true };
    if (tab.status !== "open") return { closed: true };
    const original = await getTabPayment(request.params.paymentId, client, true);
    if (!original || original.tabId !== tab.id || original.kind !== "payment") return { paymentNotFound: true };
    const reversed = await client.query(
      "SELECT 1 FROM tab_payments WHERE reverses_payment_id = $1",
      [original.id]
    );
    if (reversed.rows[0]) return { alreadyReversed: true };
    const shift = await getOpenShift(client);
    if (!shift) return { noOpenShift: true };
    const saved = await insertTabPayment({
      id: randomUUID(),
      tabId: tab.id,
      shiftId: shift?.id || null,
      kind: "reversal",
      reversesPaymentId: original.id,
      paymentMethod: original.paymentMethod,
      amountCents: -original.amountCents,
      idempotencyKey,
      metadata: { originalShiftId: original.shiftId },
      createdAt: new Date().toISOString()
    }, client);
    await insertEntries([buildEntryFromTabPayment({ payment: saved, tab })], client);
    if (original.paymentMethod === "cash" && shift) {
      await updateShift({ ...shift, expectedAmount: toMoney(shift.expectedAmount - original.amountCents / 100) }, "open", client);
    }
    return { saved, repeated: false, tab: await tabView(tab, client) };
  });
  if (result.notFound) return reply.code(404).send({ message: "Comanda não encontrada" });
  if (result.paymentNotFound) return reply.code(404).send({ message: "Pagamento não encontrado" });
  if (result.closed) return reply.code(409).send({ message: "Comanda não está aberta" });
  if (result.noOpenShift) return reply.code(409).send({ message: "Abra o turno de caixa antes de estornar pagamentos" });
  if (result.alreadyReversed) return reply.code(409).send({ message: "Pagamento já estornado" });
  if (result.idempotencyConflict) return reply.code(409).send({ message: "Idempotency-Key já usada com outro estorno" });
  emitFinanceEvent("tab.payment.reversed", result.saved);
  return reply.code(result.repeated ? 200 : 201).send(result);
});

app.post("/tabs/:tabId/close", async (request, reply) => {
  const result = await db.transaction(async (client) => {
    const tab = await getTab(request.params.tabId, client, true);
    if (!tab) return { notFound: true };
    if (tab.status !== "open") return { conflict: true };
    const view = await tabView(tab, client);
    if (view.balanceCents !== 0) return { balance: view.balance, balanceCents: view.balanceCents };
    const { rows } = await client.query(
      `UPDATE service_tabs SET status = 'closed', final_total = $2, closed_at = $3
       WHERE id = $1 AND status = 'open' RETURNING *`,
      [tab.id, view.total, new Date().toISOString()]
    );
    await client.query(
      `UPDATE orders SET status = 'completed', updated_at = $2
       WHERE tab_id = $1 AND status IN ('confirmed', 'in_preparation', 'ready')`,
      [tab.id, new Date().toISOString()]
    );
    return { saved: await tabView(mapTab(rows[0]), client) };
  });
  if (result.notFound) return reply.code(404).send({ message: "Comanda não encontrada" });
  if (result.conflict) return reply.code(409).send({ message: "Comanda já encerrada" });
  if (result.balance != null) return reply.code(409).send({
    code: "TAB_BALANCE_PENDING",
    message: "Registre os pagamentos antes de encerrar a comanda",
    balance: result.balance,
    balanceCents: result.balanceCents
  });
  return result.saved;
});

app.get("/orders", async () => ({ items: await listOrders() }));

app.post("/orders", async (request, reply) => {
  const idempotencyKey = String(
    request.headers["idempotency-key"] || request.body?.idempotencyKey || ""
  ).trim() || null;
  if (!idempotencyKey) {
    return reply.code(400).send({ message: "Idempotency-Key e obrigatorio" });
  }
  const existing = await getOrderByIdempotencyKey(idempotencyKey);
  if (existing) {
    const pendingPrintJob = await getPrimaryPrintJob(existing.id);
    if (pendingPrintJob?.status === "pending") await dispatchPrintJob(pendingPrintJob);
    return existing;
  }

  const order = transitionOrder(
    createOrder({ ...(request.body || {}), idempotencyKey }),
    "confirmed"
  );
  let result;
  try {
    result = await db.transaction(async (client) => {
      const saved = await insertOrder(order, client);
      await changeStock(saved, -1, "sale", client);
      const printJob = await reservePrintJob(saved, "confirmed", client);
      return { saved, printJob };
    });
  } catch (error) {
    if (error.code === "23505") {
      const duplicated = await getOrderByIdempotencyKey(idempotencyKey);
      if (duplicated) return duplicated;
    }
    throw error;
  }
  emitOrderEvent("order.created", result.saved);
  emitOrderEvent("order.confirmed", result.saved);

  if (result.printJob) {
    const printJob = await dispatchPrintJob(result.printJob);
    emitOrderEvent(printJob.status === "printed" ? "ticket.printed" : "ticket.print.failed", {
      orderId: result.saved.id,
      printJob
    });
  }

  return reply.code(201).send(result.saved);
});

app.patch("/orders/:orderId/status", async (request, reply) => {
  const nextStatus = request.body?.status;
  const result = await db.transaction(async (client) => {
    const order = await getOrder(request.params.orderId, client, true);
    if (!order) return { notFound: true };
    if (order.tabId && nextStatus === "cancelled") return { tabCancellationForbidden: true };
    if (order.status === nextStatus) {
      return { saved: order, previousStatus: order.status, entries: [], printJob: null, repeated: true };
    }

    const previousStatus = order.status;
    const updated = transitionOrder(order, nextStatus);
    const saved = await updateOrder(updated, previousStatus, client);
    if (!saved) return { conflict: true };
    if (!saved.tabId && previousStatus === "confirmed" && nextStatus === "cancelled") {
      await changeStock(saved, 1, "cancellation", client, saved.id);
    }

    const printJob = nextStatus === "confirmed"
      ? await reservePrintJob(saved, "confirmed", client)
      : null;
    const shift = await getOpenShift(client);
    const entries = saved.tabId ? [] : await insertEntries(buildEntriesFromOrder({
      order: saved,
      previousStatus,
      nextStatus,
      shiftId: shift?.id || null
    }), client);
    const cashDelta = entries
      .filter((entry) => entry.paymentMethod === "cash")
      .reduce((total, entry) => total + Number(entry.amount), 0);
    if (shift && cashDelta) {
      await updateShift({
        ...shift,
        expectedAmount: shift.expectedAmount + cashDelta
      }, "open", client);
    }
    return { saved, previousStatus, entries, printJob, repeated: false };
  });

  if (result.notFound) return reply.code(404).send({ message: "Pedido não encontrado" });
  if (result.tabCancellationForbidden) return reply.code(409).send({ message: "Use um ticket corretivo para cancelar itens da comanda" });
  if (result.conflict) return reply.code(409).send({ message: "Pedido foi alterado; atualize a tela" });
  if (result.repeated) return result.saved;

  if (result.printJob) {
    const printJob = await dispatchPrintJob(result.printJob);
    emitOrderEvent(printJob.status === "printed" ? "ticket.printed" : "ticket.print.failed", {
      orderId: result.saved.id,
      printJob
    });
  }
  if (result.entries.length) emitFinanceEvent("finance.entry.created", result.entries);

  emitOrderEvent("order.status.changed", {
    orderId: result.saved.id,
    previousStatus: result.previousStatus,
    nextStatus,
    order: result.saved
  });

  return result.saved;
});

app.patch("/orders/:orderId/discount", async (request, reply) => {
  const discountPercent = Number(request.body?.discountPercent ?? 0);
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return reply.code(400).send({ message: "Desconto inválido: informe um valor entre 0 e 100" });
  }

  const result = await db.transaction(async (client) => {
    const order = await getOrder(request.params.orderId, client, true);
    if (!order) return { notFound: true };
    if (["ifood", "deliverymuch", "olaclick"].includes(order.source)) {
      return { forbiddenApp: true };
    }
    const updated = {
      ...order,
      discountPercent,
      total: calculateOrderTotal(order.items, discountPercent),
      updatedAt: new Date().toISOString()
    };
    const saved = await updateOrder(updated, order.status, client);
    return { saved };
  });

  if (result.notFound) return reply.code(404).send({ message: "Pedido não encontrado" });
  if (result.forbiddenApp) return reply.code(400).send({ message: "Desconto não pode ser alterado em pedidos de aplicativos externos" });

  emitOrderEvent("order.updated", result.saved);
  return result.saved;
});

app.post("/orders/:orderId/reprint", async (request, reply) => {
  const order = await getOrder(request.params.orderId);
  if (!order) return reply.code(404).send({ message: "Pedido não encontrado" });
  const printJob = await dispatchPrintJob(await reservePrintJob(order, "reprint"));
  emitOrderEvent(printJob.status === "printed" ? "ticket.printed" : "ticket.print.failed", {
    orderId: order.id,
    printJob
  });
  return { ok: true, printJob };
});

app.get("/kitchen/queue", async () => {
  const items = (await listOrders()).filter((order) =>
    ["confirmed", "in_preparation", "ready"].includes(order.status)
  );
  return { items };
});

app.get("/finance/entries", async (request) => {
  const entries = await listEntries();
  return { items: filterEntries(entries, request.query || {}) };
});

app.get("/finance/summary", async (request) => {
  const entries = filterEntries(await listEntries(), request.query || {});
  return summarizeFinance(entries);
});

app.get("/cash-shifts", async () => ({ items: await listShifts() }));

app.post("/cash-shifts/open", async (request, reply) => {
  const shift = createCashShift(request.body || {});
  let result;
  try {
    result = await db.transaction(async (client) => {
      const saved = await insertShift(shift, client);
      const [openingEntry] = await insertEntries([buildOpeningEntry(saved)], client);
      return { saved, openingEntry };
    });
  } catch (error) {
    if (error.code === "23505") return reply.code(409).send({ message: "O caixa já está aberto" });
    throw error;
  }
  emitFinanceEvent("cash.shift.opened", result.saved);
  return reply.code(201).send(result.saved);
});

app.post("/cash-shifts/:shiftId/adjustments", async (request, reply) => {
  const result = await db.transaction(async (client) => {
    const shift = await getShift(request.params.shiftId, client, true);
    if (!shift) return { notFound: true };
    if (shift.status !== "open") return { conflict: true };

    const entry = buildEntryFromAdjustment({
      shift,
      kind: request.body?.kind || "reinforcement",
      amount: request.body?.amount || 0,
      reason: request.body?.reason || ""
    });
    const updatedShift = await updateShift({
      ...shift,
      expectedAmount: shift.expectedAmount + entry.amount
    }, "open", client);
    if (!updatedShift) return { conflict: true };
    const [savedEntry] = await insertEntries([entry], client);
    return { shift: updatedShift, entry: savedEntry };
  });

  if (result.notFound) return reply.code(404).send({ message: "Caixa não encontrado" });
  if (result.conflict) return reply.code(409).send({ message: "O caixa está fechado" });
  emitFinanceEvent("cash.adjustment.created", result);
  return result;
});

app.post("/cash-shifts/:shiftId/close", async (request, reply) => {
  const result = await db.transaction(async (client) => {
    const shift = await getShift(request.params.shiftId, client, true);
    if (!shift) return { notFound: true };
    if (shift.status !== "open") return { conflict: true };

    const { rows } = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS expected_amount
       FROM finance_entries
       WHERE shift_id = $1 AND payment_method = 'cash' AND type <> 'closing_adjustment'`,
      [shift.id]
    );
    const closed = closeCashShift(
      { ...shift, expectedAmount: Number(rows[0].expected_amount) },
      request.body?.declaredAmount || 0
    );
    const saved = await updateShift(closed, "open", client);
    if (!saved) return { conflict: true };

    if (saved.differenceAmount) {
      await insertEntries([{
        id: randomUUID(),
        orderId: null,
        shiftId: saved.id,
        type: "closing_adjustment",
        amount: saved.differenceAmount,
        paymentMethod: "cash",
        source: "counter",
        label: "Diferença de fechamento",
        occurredAt: new Date().toISOString(),
        metadata: {}
      }], client);
    }
    return { saved };
  });

  if (result.notFound) return reply.code(404).send({ message: "Caixa não encontrado" });
  if (result.conflict) return reply.code(409).send({ message: "O caixa já está fechado" });
  emitFinanceEvent("cash.shift.closed", result.saved);
  return result.saved;
});

app.get("/events/orders", async (_, reply) => {
  reply.raw.setHeader("content-type", "text/event-stream");
  reply.raw.setHeader("cache-control", "no-cache");
  reply.raw.setHeader("connection", "keep-alive");
  reply.raw.write("\n");
  sse.subscribe("orders", reply);
  return reply;
});

app.get("/events/finance", async (_, reply) => {
  reply.raw.setHeader("content-type", "text/event-stream");
  reply.raw.setHeader("cache-control", "no-cache");
  reply.raw.setHeader("connection", "keep-alive");
  reply.raw.write("\n");
  sse.subscribe("finance", reply);
  return reply;
});

await app.register(integrationRoutes);

await db.init();
await recoverPrintJobs(true);
// ponytail: retry fixo atende a demo single-instance; adotar backoff/fila quando houver volume real.
setInterval(() => recoverPrintJobs().catch((error) => app.log.error(error)), 15_000).unref();

db.updateOrder = updateOrder;
db.changeStock = changeStock;
db.reservePrintJob = reservePrintJob;
db.insertOrder = insertOrder;

startIntegrationPolling({ config, db });

app.listen({ host: "0.0.0.0", port: config.port });
