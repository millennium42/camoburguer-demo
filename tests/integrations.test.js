import createIFoodAdapter from "../apps/api/src/integrations/providers/ifood.js";
import createDeliveryMuchAdapter from "../apps/api/src/integrations/providers/deliverymuch.js";
import assert from "node:assert/strict";
import test from "node:test";
import {
  applyIntegratedTransition,
  createOrderAction
} from "../apps/api/src/integrations/order-actions.js";
import { ingestExternalOrder } from "../apps/api/src/integrations/order-ingestion.js";
import { classifyCommandError } from "../apps/api/src/integrations/command-outbox.js";
import {
  mapIFoodOrderItem,
  normalizeIFoodEventType
} from "../apps/api/src/integrations/providers/ifood.js";
import {
  deliveryMuchPayloadFingerprint,
  mapDeliveryMuchOrderItem,
  normalizeDeliveryMuchStatus
} from "../apps/api/src/integrations/providers/deliverymuch.js";

const now = "2026-07-21T12:00:00.000Z";

function mappingRow(overrides = {}) {
  return {
    id: "mapping-1",
    order_id: "order-1",
    channel: "ifood",
    merchant_id: "merchant-1",
    external_id: "external-1",
    external_status: "PLACED",
    sync_status: "synchronized",
    sync_error: null,
    metadata: {},
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function orderRow(mapping = mappingRow()) {
  return {
    id: "order-1",
    idempotency_key: "ifood:merchant-1:external-1",
    tab_id: null,
    round_number: null,
    round_kind: "production",
    reverses_order_id: null,
    source: mapping.channel,
    status: "received",
    customer_name: "Cliente Demo",
    fulfillment_mode: "pickup",
    delivery_address: null,
    promised_at: null,
    notes: "",
    payment_method: "app_paid",
    total: 25,
    discount_percent: 0,
    items: [{ id: "line-1", name: "Item externo", quantity: 2, price: 12.5, addons: [] }],
    metadata: {},
    created_at: now,
    updated_at: now,
    mapping
  };
}

test("ingestão externa cria um pedido completo e mapeamento estável", async () => {
  let insertedOrder;
  const executor = {
    async query(sql, values) {
      if (sql.startsWith("SELECT * FROM channel_mappings")) return { rows: [] };
      if (sql.startsWith("INSERT INTO channel_mappings")) {
        return { rows: [mappingRow({
          id: values[0],
          order_id: values[1],
          channel: values[2],
          merchant_id: values[3],
          external_id: values[4],
          external_status: values[5],
          sync_status: values[6]
        })] };
      }
      throw new Error(`SQL inesperado: ${sql}`);
    }
  };
  const db = {
    async insertOrder(order) {
      insertedOrder = order;
      return order;
    }
  };

  const result = await ingestExternalOrder({
    source: "ifood",
    externalMerchantId: " merchant-1 ",
    externalOrderId: " external-1 ",
    externalStatus: "PLACED",
    customerName: "Cliente Demo",
    fulfillmentMode: "pickup",
    items: [{ id: "line-1", name: "Item externo", quantity: 2, price: 12.5 }]
  }, executor, db);

  assert.equal(result.repeated, false);
  assert.equal(insertedOrder.idempotencyKey, "ifood:merchant-1:external-1");
  assert.equal(insertedOrder.paymentMethod, "payment_reconciliation_required");
  assert.equal(insertedOrder.roundKind, "production");
  assert.equal(insertedOrder.total, 25);
  assert.equal(insertedOrder.metadata.externalOrderId, "external-1");
});

test("ingestão externa usa classificação operacional sem sobrescrever a venda do parceiro", async () => {
  let insertedOrder;
  const executor = {
    async query(sql, values) {
      if (sql.startsWith("SELECT * FROM channel_mappings")) return { rows: [] };
      if (sql.includes("FROM catalog_items")) {
        assert.deepEqual(values[0], ["bala-parceiro"]);
        assert.equal(sql.includes("archived_at IS NULL"), false);
        return { rows: [{
          sku: "bala-parceiro",
          name: "Bala do catálogo",
          category: "Bomboniere",
          price: 2,
          description: "",
          stock_category: null,
          allows_addons: false,
          preparation_mode: "direct_handoff",
          available: false,
          origin: "operator",
          source_version: null,
          archived_at: now,
          created_at: now,
          updated_at: now
        }] };
      }
      if (sql.startsWith("INSERT INTO channel_mappings")) {
        return { rows: [mappingRow({ order_id: values[1] })] };
      }
      throw new Error(`SQL inesperado: ${sql}`);
    }
  };
  const db = {
    async insertOrder(order) {
      insertedOrder = order;
      return order;
    }
  };

  await ingestExternalOrder({
    source: "ifood",
    externalMerchantId: "merchant-1",
    externalOrderId: "external-direct",
    externalStatus: "PLACED",
    customerName: "Cliente parceiro",
    fulfillmentMode: "pickup",
    items: [{
      id: "line-direct",
      sku: "bala-parceiro",
      name: "Bala vendida no parceiro",
      quantity: 1,
      price: 3.5
    }]
  }, executor, db);

  assert.equal(insertedOrder.items[0].name, "Bala vendida no parceiro");
  assert.equal(insertedOrder.items[0].price, 3.5);
  assert.equal(insertedOrder.items[0].category, "Bomboniere");
  assert.equal(insertedOrder.items[0].preparationMode, "direct_handoff");
  assert.equal(insertedOrder.items[0].stockCategory, null);
});

test("adapters propagam SKU confiável quando o parceiro o fornece", () => {
  assert.equal(mapIFoodOrderItem({
    uniqueId: "line-1",
    externalCode: " refrigerante-lata ",
    name: "Refrigerante parceiro",
    unitPrice: 6,
    quantity: 1
  }).sku, "refrigerante-lata");
  assert.equal(mapDeliveryMuchOrderItem({
    id: "line-2",
    sku: " bala-parceiro ",
    name: "Bala",
    price: 3,
    quantity: 1
  }).sku, "bala-parceiro");
});

test("ação integrada conserva a chave do cliente e o id externo", async () => {
  let insertedValues;
  const client = {
    async query(sql, values) {
      if (sql.includes("row_to_json(cm.*)")) return { rows: [orderRow()] };
      if (sql.startsWith("SELECT pg_advisory_xact_lock")) return { rows: [] };
      if (sql.startsWith("SELECT * FROM idempotency_records")) return { rows: [] };
      if (sql.includes("SELECT 'orders' AS source")) return { rows: [] };
      if (sql.startsWith("INSERT INTO idempotency_records")) return { rows: [] };
      if (sql.startsWith("UPDATE idempotency_records")) return { rows: [] };
      if (sql.startsWith("SELECT * FROM channel_commands")) return { rows: [] };
      if (sql.startsWith("INSERT INTO channel_commands")) {
        insertedValues = values;
        return { rows: [{
          id: values[0],
          order_id: values[1],
          channel: values[2],
          action: values[3],
          idempotency_key: values[4],
          payload: JSON.parse(values[5]),
          status: values[6],
          correlation_id: values[7],
          attempts: 0,
          next_attempt_at: values[8],
          response_payload: null,
          error: null,
          created_at: values[9],
          completed_at: null
        }] };
      }
      if (sql.startsWith("UPDATE channel_mappings")) {
        return { rows: [mappingRow({ sync_status: values[0], updated_at: values[1] })] };
      }
      throw new Error(`SQL inesperado: ${sql}`);
    }
  };
  const db = { transaction: (work) => work(client) };

  const result = await createOrderAction("order-1", "accept", {}, "attempt-123", db);

  assert.equal(result.syncStatus, "accept_pending");
  assert.equal(insertedValues[4], "attempt-123");
  assert.equal(JSON.parse(insertedValues[5]).externalOrderId, "external-1");
});

test("ação não suportada pelo canal é rejeitada antes de criar comando", async () => {
  const dmMapping = mappingRow({ channel: "deliverymuch" });
  const client = {
    async query(sql) {
      if (sql.includes("row_to_json(cm.*)")) return { rows: [orderRow(dmMapping)] };
      throw new Error("não deveria criar comando");
    }
  };
  const db = { transaction: (work) => work(client) };
  await assert.rejects(
    createOrderAction("order-1", "startPreparation", {}, "attempt-456", db),
    (error) => error.statusCode === 422
  );
});

test("eventos iFood legados e atuais convergem para estados canônicos", () => {
  assert.equal(normalizeIFoodEventType({ fullCode: "PLACED", code: "PLC" }), "PLACED");
  assert.equal(normalizeIFoodEventType({ fullCode: "ORDER_CONFIRMED", code: "CONFIRMED" }), "CONFIRMED");
  assert.equal(normalizeIFoodEventType({ fullCode: "ORDER_CANCELLED", code: "CANCELLED" }), "CANCELLED");
  assert.equal(normalizeIFoodEventType({ fullCode: "PREPARATION_ENDED", code: "SEPARATION_ENDED" }), "READY_TO_PICKUP");
});

test("eventos de preparo preservam pedido externo somente de entrega direta como pronto", async () => {
  const directReadyRow = {
    ...orderRow(),
    status: "ready",
    items: [{
      id: "line-direct",
      sku: "bala-parceiro",
      name: "Bala",
      quantity: 1,
      price: 3,
      addons: [],
      stockCategory: null,
      preparationMode: "direct_handoff"
    }]
  };
  const executor = {
    async query(sql) {
      if (sql.includes("row_to_json(cm.*)")) return { rows: [directReadyRow] };
      throw new Error(`SQL inesperado: ${sql}`);
    }
  };
  const db = {
    async updateOrder() {
      throw new Error("evento de preparo direto não deve alterar o pedido");
    }
  };

  const preparation = await applyIntegratedTransition("order-1", "in_preparation", db, executor);
  const ready = await applyIntegratedTransition("order-1", "ready", db, executor);

  assert.equal(preparation.repeated, true);
  assert.equal(preparation.saved.status, "ready");
  assert.equal(ready.repeated, true);
  assert.equal(ready.saved.status, "ready");
});

test("Delivery Much normaliza somente estados conhecidos", () => {
  assert.equal(normalizeDeliveryMuchStatus("pending"), "received");
  assert.equal(normalizeDeliveryMuchStatus("CONFIRMED"), "confirmed");
  assert.equal(normalizeDeliveryMuchStatus("preparing"), "in_preparation");
  assert.equal(normalizeDeliveryMuchStatus("canceled"), "cancelled");
  assert.equal(normalizeDeliveryMuchStatus("estado-novo"), null);
});

test("fingerprint Delivery Much ignora status mas detecta divergência comercial", () => {
  const base = {
    id: "dm-1",
    status: "pending",
    total: 25,
    deliveryAddress: "Rua A",
    items: [
      { id: "line-2", name: "B", quantity: 1, price: 10 },
      { id: "line-1", name: "A", quantity: 1, price: 15 }
    ]
  };
  assert.equal(
    deliveryMuchPayloadFingerprint(base),
    deliveryMuchPayloadFingerprint({
      ...base,
      status: "ready",
      items: [...base.items].reverse()
    })
  );
  assert.notEqual(
    deliveryMuchPayloadFingerprint(base),
    deliveryMuchPayloadFingerprint({ ...base, total: 26 })
  );
});

test("outbox trata qualquer resposta HTTP como ambígua antes de permitir reenvio", () => {
  assert.equal(classifyCommandError({ statusCode: 401 }), "ambiguous");
  assert.equal(classifyCommandError({ statusCode: 503 }), "ambiguous");
});


test("H-03 iFood: classificação reconcilia 'CANCELLED' durante 'accept' para localEffect 'cancel'", async () => {
  const adapter = createIFoodAdapter({ ifood: { merchantId: "123" } }, {});
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const data = url.includes("/token") ? { accessToken: "token" } : { status: "CANCELLED" };
    return { ok: true, text: async () => JSON.stringify(data), json: async () => data };
  };
  try {
    const res = await adapter.reconcileCommand({ action: "accept", payload: { externalOrderId: "abc" } });
    assert.equal(res.state, "applied");
    assert.equal(res.externalStatus, "CANCELLED");
    assert.equal(res.localEffect, "cancel");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("H-03 Delivery Much: classificação reconcilia 'cancelled' durante 'accept' para localEffect 'cancel'", async () => {
  const adapter = createDeliveryMuchAdapter({ deliveryMuch: { merchantId: "123", username: "a", password: "b", pollIntervalMs: 1000 } }, {});
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const data = String(url).includes("/login") ? { access_token: "token" } : { status: "cancelled" };
    return { ok: true, text: async () => JSON.stringify(data), json: async () => data };
  };
  try {
    const res = await adapter.reconcileCommand({ action: "accept", payload: { externalOrderId: "abc" } });
    assert.equal(res.state, "applied");
    assert.equal(res.externalStatus, "cancelled");
    assert.equal(res.localEffect, "cancel");
  } finally {
    globalThis.fetch = originalFetch;
  }
});


// --- H-04: TESTES DE MEIOS DE PAGAMENTO EXTERNOS ---

import { summarizeFinance, buildEntriesFromOrder } from "../packages/finance-core/index.js";

test("H-04 Ingestion: aceita e salva externalPayments com paymentMethod mixed na metadata de orders", async () => {
  let insertedOrder;
  const executor = {
    async query(sql, params) {
      if (sql.includes("SELECT 1 FROM channel_mappings")) return { rows: [] };
      if (sql.includes("INSERT INTO channel_mappings")) {
        const now = new Date().toISOString();
        return { rows: [{ id: "mock-1", created_at: now, updated_at: now }] };
      }
      return { rows: [] };
    }
  };
  const db = {
    async insertOrder(order) {
      insertedOrder = order;
      return order;
    }
  };
  
  await ingestExternalOrder({
    source: "ifood",
    externalMerchantId: "merchant-mixed",
    externalOrderId: "external-mixed",
    externalStatus: "PLACED",
    customerName: "Cliente Misto",
    fulfillmentMode: "pickup",
    items: [{ id: "line-2", name: "Item", quantity: 1, price: 50 }],
    paymentMethod: "mixed",
    externalPayments: [
      { method: "cash", type: "offline", amount: 20 },
      { method: "credit_card", type: "offline", amount: 30 }
    ]
  }, executor, db);
  
  assert.equal(insertedOrder.paymentMethod, "mixed");
  assert.equal(insertedOrder.metadata.externalPayments.length, 2);
  assert.equal(insertedOrder.metadata.externalPayments[0].method, "cash");
});

test("H-04 Finance Core: buildEntriesFromOrder embute externalPayments e summarizeFinance não duplica pagamentos online no Caixa", () => {
  const order = {
    id: "ord-1",
    total: 50,
    source: "ifood",
    paymentMethod: "mixed",
    metadata: {
      externalPayments: [
        { method: "cash", type: "offline", amount: 20 },
        { method: "app_paid", type: "online", amount: 30 }
      ]
    }
  };
  
  const entries = buildEntriesFromOrder({ order, previousStatus: "received", nextStatus: "completed", shiftId: "shift-1" });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, "sale");
  assert.equal(entries[0].amount, 50);
  assert.equal(entries[0].paymentMethod, "mixed");
  assert.deepEqual(entries[0].metadata.externalPayments, order.metadata.externalPayments);
  
  const summary = summarizeFinance(entries);
  assert.equal(summary.grossSales, 50);
  assert.equal(summary.paymentsByMethod["cash"], 20);
  assert.equal(summary.paymentsByMethod["app_paid"], 30);
  // Reconciliacao deve bater
  assert.equal(summary.reconciliation.balanced, true);
  assert.equal(summary.reconciliation.difference, 0);
  assert.equal(summary.reconciliation.methodTotal, 50);
});

test("H-04 Finance Core: cancelamento com externalPayments reduz corretamente do summary", () => {
  const order = {
    id: "ord-2",
    total: 50,
    source: "ifood",
    paymentMethod: "mixed",
    metadata: {
      externalPayments: [
        { method: "cash", type: "offline", amount: 20 },
        { method: "app_paid", type: "online", amount: 30 }
      ]
    }
  };
  
  const sales = buildEntriesFromOrder({ order, previousStatus: "received", nextStatus: "completed", shiftId: "shift-1" });
  const cancellations = buildEntriesFromOrder({ order, previousStatus: "completed", nextStatus: "cancelled", shiftId: "shift-1" });
  
  const summary = summarizeFinance([...sales, ...cancellations]);
  assert.equal(summary.grossSales, 50);
  assert.equal(summary.cancellations, 50);
  assert.equal(summary.netSales, 0);
  assert.equal(summary.paymentsByMethod["cash"] || 0, 0);
  assert.equal(summary.paymentsByMethod["app_paid"] || 0, 0);
  assert.equal(summary.reconciliation.balanced, true);
});
