import assert from "node:assert/strict";
import test from "node:test";
import { createOrderAction } from "../apps/api/src/integrations/order-actions.js";
import { ingestExternalOrder } from "../apps/api/src/integrations/order-ingestion.js";
import { normalizeIFoodEventType } from "../apps/api/src/integrations/providers/ifood.js";

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
  assert.equal(insertedOrder.paymentMethod, "app_paid");
  assert.equal(insertedOrder.roundKind, "production");
  assert.equal(insertedOrder.total, 25);
  assert.equal(insertedOrder.metadata.externalOrderId, "external-1");
});

test("ação integrada conserva a chave do cliente e o id externo", async () => {
  let insertedValues;
  const client = {
    async query(sql, values) {
      if (sql.includes("row_to_json(cm.*)")) return { rows: [orderRow()] };
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
          attempts: 0,
          next_attempt_at: values[7],
          response_payload: null,
          error: null,
          created_at: values[8],
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
