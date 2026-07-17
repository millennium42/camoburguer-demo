import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import {
  ADD_ONS,
  CATALOG,
  CATALOG_CAPTURED_AT,
  CATALOG_SOURCE_URL,
  buildKitchenTicket,
  closeCashShift,
  createCashShift,
  createOrder,
  transitionOrder
} from "@camoburguer/domain";
import {
  buildEntriesFromOrder,
  buildEntryFromAdjustment,
  buildOpeningEntry,
  filterEntries,
  summarizeFinance
} from "@camoburguer/finance-core";
import { config } from "./config.js";
import { createDb, mapFinanceEntry, mapOrder, mapShift } from "./db.js";
import { createSseHub } from "./sse.js";

const app = Fastify({ logger: true });
const db = createDb(config.databaseUrl);
const sse = createSseHub();

await app.register(cors, { origin: true });

app.setErrorHandler((error, request, reply) => {
  const clientError = Boolean(error.validation) || (!error.code && /inválid|obrigatóri|deve ter|transição|item|preço|valor/i.test(error.message));
  if (!clientError) request.log.error(error);
  return reply
    .code(clientError ? 400 : (error.statusCode || 500))
    .send({ message: clientError ? error.message : "Erro interno do servidor" });
});

async function insertOrder(order, executor = db) {
  const { rows } = await executor.query(
    `INSERT INTO orders (
      id, idempotency_key, source, status, customer_name, fulfillment_mode, delivery_address,
      promised_at, notes, payment_method, total, discount_percent, items, metadata, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16
    ) RETURNING *`,
    [
      order.id,
      order.idempotencyKey,
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
  const { rows } = await db.query("SELECT * FROM orders ORDER BY created_at DESC");
  return rows.map(mapOrder);
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
        id, order_id, shift_id, type, amount, payment_method, source,
        label, metadata, occurred_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10
      ) ON CONFLICT DO NOTHING
      RETURNING *`,
      [
        entry.id,
        entry.orderId,
        entry.shiftId,
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

async function getConfirmationPrintJob(orderId) {
  const { rows } = await db.query(
    "SELECT * FROM print_jobs WHERE order_id = $1 AND reason = 'confirmed' LIMIT 1",
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
    const pendingPrintJob = await getConfirmationPrintJob(existing.id);
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
    if (order.status === nextStatus) {
      return { saved: order, previousStatus: order.status, entries: [], printJob: null, repeated: true };
    }

    const previousStatus = order.status;
    const updated = transitionOrder(order, nextStatus);
    const saved = await updateOrder(updated, previousStatus, client);
    if (!saved) return { conflict: true };

    const printJob = nextStatus === "confirmed"
      ? await reservePrintJob(saved, "confirmed", client)
      : null;
    const shift = await getOpenShift(client);
    const entries = await insertEntries(buildEntriesFromOrder({
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

await db.init();
await recoverPrintJobs(true);
// ponytail: retry fixo atende a demo single-instance; adotar backoff/fila quando houver volume real.
setInterval(() => recoverPrintJobs().catch((error) => app.log.error(error)), 15_000).unref();

app.listen({ host: "0.0.0.0", port: config.port });
