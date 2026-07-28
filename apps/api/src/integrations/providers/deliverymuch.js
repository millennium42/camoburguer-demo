import { randomUUID } from "crypto";
import { requestForm, requestJson } from "../http-client.js";
import { ingestExternalOrder } from "../order-ingestion.js";
import {
  getOrderWithMapping,
  insertChannelEvent,
  updateChannelEvent,
  updateChannelMapping
} from "../integration-repository.js";
import { activateAcceptedOrder, applyIntegratedTransition } from "../order-actions.js";
import { fingerprint } from "../../idempotency.js";

const DELIVERYMUCH_STATUS = new Map([
  ["pending", "received"],
  ["new", "received"],
  ["received", "received"],
  ["accepted", "confirmed"],
  ["confirmed", "confirmed"],
  ["preparing", "in_preparation"],
  ["in_preparation", "in_preparation"],
  ["ready", "ready"],
  ["cancelled", "cancelled"],
  ["canceled", "cancelled"]
]);

export function normalizeDeliveryMuchStatus(status) {
  return DELIVERYMUCH_STATUS.get(String(status || "").trim().toLowerCase()) || null;
}

export function deliveryMuchPayloadFingerprint(order) {
  return fingerprint({
    id: String(order?.id || ""),
    total: order?.total ?? order?.amount ?? null,
    deliveryAddress: order?.deliveryAddress || null,
    items: order?.items || []
  });
}

export function mapDeliveryMuchOrderItem(item) {
  const sku = String(
    item.sku
      || item.externalCode
      || item.product?.sku
      || item.product?.externalCode
      || item.product?.code
      || ""
  ).trim() || null;
  return {
    id: item.id || randomUUID(),
    sku,
    name: item.name,
    quantity: item.quantity,
    price: Number(item.price),
    notes: item.notes || ""
  };
}

export default function createDeliveryMuchAdapter(config, db) {
  let tokenCache = null;

  async function getToken() {
    if (tokenCache?.expiresAt > Date.now() + 60_000) return tokenCache.value;

    const payload = await requestForm(config.deliveryMuch.authUrl, {
      grant_type: "password",
      client_id: config.deliveryMuch.clientId,
      client_secret: config.deliveryMuch.clientSecret,
      username: config.deliveryMuch.username,
      password: config.deliveryMuch.password
    });

    tokenCache = {
      value: payload.access_token,
      expiresAt: Date.now() + Number(payload.expires_in || payload.expiresIn || 3_600) * 1000
    };
    return tokenCache.value;
  }

  async function authorizedRequest(path, options = {}) {
    const token = await getToken();
    return requestJson(`${config.deliveryMuch.apiUrl}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` }
    });
  }

  async function fetchOrders() {
    const payload = await authorizedRequest("/orders");
    return Array.isArray(payload) ? payload : payload?.orders || [];
  }

  async function sendCommand(command) {
    const externalOrderId = command.payload.externalOrderId;
    if (!externalOrderId) throw new Error("Comando Delivery Much sem externalOrderId");

    const endpoint = {
      accept: "accept",
      cancel: "cancel",
      ready: "ready"
    }[command.action];
    if (!endpoint) throw new Error(`Ação Delivery Much não suportada: ${command.action}`);

    return authorizedRequest(`/orders/${encodeURIComponent(externalOrderId)}/${endpoint}`, {
      method: "PATCH",
      headers: { "x-idempotency-key": command.correlationId || command.id }
    });
  }

  async function fetchBatch() {
    if (!config.deliveryMuch.enabled) return { orders: [] };
    try {
      const orders = await fetchOrders();
      return { orders };
    } catch (error) {
      if (error.statusCode === 401) tokenCache = null;
      throw error;
    }
  }

  async function persistBatch(batch, executor) {
      const receiveIds = [];

      for (const externalOrder of batch.orders || []) {
        if (!externalOrder?.id) throw new Error("Pedido Delivery Much sem id");
        const payloadFingerprint = deliveryMuchPayloadFingerprint(externalOrder);
        const eventFingerprint = fingerprint(externalOrder);
        const version = externalOrder.version || externalOrder.updatedAt || "hash";
        const externalEventId = `${externalOrder.id}:${version}:${eventFingerprint}`;
        const savedEvent = await insertChannelEvent({
          id: randomUUID(),
          channel: "deliverymuch",
          externalEventId,
          merchantId: config.deliveryMuch.companyUuid,
          externalOrderId: externalOrder.id,
          eventType: `ORDER_${String(externalOrder.status || "observed").toUpperCase()}`,
          payload: externalOrder,
          status: "pending"
        }, executor);

        if (!savedEvent) {
          const existingEvent = await executor.query(
            `SELECT status FROM channel_events
             WHERE channel = 'deliverymuch' AND external_event_id = $1`,
            [externalEventId]
          );
          if (existingEvent.rows[0]?.status === "processed") receiveIds.push(externalOrder.id);
          continue;
        }
        const normalizedStatus = normalizeDeliveryMuchStatus(externalOrder.status);
        if (!normalizedStatus) {
          await updateChannelEvent(savedEvent.id, {
            status: "blocked",
            error: `Estado Delivery Much desconhecido: ${String(externalOrder.status || "ausente")}`,
            processedAt: new Date().toISOString()
          }, executor);
          const existing = await executor.query(
            `SELECT id FROM channel_mappings
             WHERE channel = 'deliverymuch' AND merchant_id = $1 AND external_id = $2`,
            [config.deliveryMuch.companyUuid, externalOrder.id]
          );
          if (existing.rows[0]) {
            await updateChannelMapping(existing.rows[0].id, {
              syncStatus: "reconciliation_required",
              syncError: "Estado externo desconhecido"
            }, executor);
          }
          continue;
        }

        const ingestion = await ingestExternalOrder({
          source: "deliverymuch",
          externalMerchantId: config.deliveryMuch.companyUuid,
          externalOrderId: externalOrder.id,
          externalStatus: externalOrder.status,
          customerName: externalOrder.customer?.name || "Cliente Delivery Much",
          fulfillmentMode: externalOrder.fulfillmentMode === "pickup" ? "pickup" : "delivery",
          deliveryAddress: externalOrder.deliveryAddress?.formattedAddress || null,
          createdAt: externalOrder.createdAt,
          items: (externalOrder.items || []).map(mapDeliveryMuchOrderItem),
          metadata: {
            deliveryMuchOrder: externalOrder,
            syncPayloadFingerprint: payloadFingerprint
          }
        }, executor, db);
        let order = await getOrderWithMapping(ingestion.orderId, executor);
        if (ingestion.repeated && order?.mapping?.metadata?.syncPayloadFingerprint
          && order.mapping.metadata.syncPayloadFingerprint !== payloadFingerprint) {
          await updateChannelMapping(order.mapping.id, {
            externalStatus: externalOrder.status,
            syncStatus: "reconciliation_required",
            syncError: "Payload comercial externo mudou após captura"
          }, executor);
          await updateChannelEvent(savedEvent.id, {
            status: "blocked",
            error: "Payload comercial divergente",
            processedAt: new Date().toISOString()
          }, executor);
          continue;
        }
        if (order?.mapping) {
          await updateChannelMapping(order.mapping.id, {
            externalStatus: externalOrder.status,
            syncStatus: "synchronized",
            syncError: null,
            metadata: {
              ...(order.mapping.metadata || {}),
              syncPayloadFingerprint: payloadFingerprint
            }
          }, executor);
        }
        if (["confirmed", "in_preparation", "ready"].includes(normalizedStatus)) {
          await activateAcceptedOrder(ingestion.orderId, db, executor);
          order = await getOrderWithMapping(ingestion.orderId, executor);
        }
        if (normalizedStatus === "in_preparation" && order.status === "confirmed") {
          await applyIntegratedTransition(order.id, "in_preparation", db, executor);
        } else if (normalizedStatus === "ready") {
          if (order.status === "confirmed") {
            await applyIntegratedTransition(order.id, "in_preparation", db, executor);
            order = await getOrderWithMapping(order.id, executor);
          }
          if (order.status === "in_preparation") {
            await applyIntegratedTransition(order.id, "ready", db, executor);
          }
        } else if (normalizedStatus === "cancelled" && order.status !== "cancelled") {
          await applyIntegratedTransition(order.id, "cancelled", db, executor);
        }
        await updateChannelEvent(savedEvent.id, {
          status: "processed",
          error: null,
          processedAt: new Date().toISOString()
        }, executor);
        receiveIds.push(externalOrder.id);
      }
      return { receiveIds };
  }

  async function reconcileCommand(command) {
    const order = await authorizedRequest(`/orders/${encodeURIComponent(command.payload.externalOrderId)}`);
    const status = String(order?.status || "").toLowerCase();
    const applied = command.action === "accept"
      ? ["accepted", "confirmed", "preparing", "ready", "delivered", "cancelled"].includes(status)
      : command.action === "cancel"
      ? status === "cancelled"
      : command.action === "ready"
      ? ["ready", "delivered"].includes(status)
      : false;
    const localEffect = status === "cancelled" ? "cancel" : command.action;
    return applied
      ? { state: "applied", externalStatus: status, localEffect }
      : { state: "unknown", reason: `Status Delivery Much inconclusivo: ${status || "ausente"}` };
  }

  async function finalizeCommand(command, executor, { reconciled, localEffect }) {
    const action = localEffect || command.action;
    if (action === "accept") {
      await activateAcceptedOrder(command.orderId, db, executor);
    } else if (action === "ready") {
      await applyIntegratedTransition(command.orderId, "ready", db, executor);
    } else if (action === "cancel") {
      await applyIntegratedTransition(command.orderId, "cancelled", db, executor);
    }
    const order = await getOrderWithMapping(command.orderId, executor);
    if (order?.mapping) {
      await updateChannelMapping(order.mapping.id, {
        externalStatus: action,
        syncStatus: "synchronized",
        syncError: null
      }, executor);
    }
    return {
      status: "completed",
      completedAt: new Date().toISOString(),
      lastHttpStatus: 200,
      ...(reconciled ? { reconciledAt: new Date().toISOString() } : {})
    };
  }

  return {
    channel: "deliverymuch",
    pollIntervalMs: Math.max(config.deliveryMuch.pollIntervalMs, 15_000),
    fetchBatch,
    persistBatch,
    sendCommand,
    reconcileCommand,
    finalizeCommand,
    afterCommit: async ({ receiveIds }) => {
      try {
        for (const externalOrderId of receiveIds) {
          await authorizedRequest(`/orders/${encodeURIComponent(externalOrderId)}/receive`, { method: "PATCH" });
        }
      } catch (error) {
        if (error.statusCode === 401) tokenCache = null;
        throw error;
      }
    }
  };
}
