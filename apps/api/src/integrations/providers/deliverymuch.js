import { randomUUID } from "crypto";
import { requestForm, requestJson } from "../http-client.js";
import { ingestExternalOrder } from "../order-ingestion.js";
import {
  getPendingCommands,
  getOrderWithMapping,
  insertChannelEvent,
  updateChannelCommand,
  updateChannelMapping
} from "../integration-repository.js";
import { activateAcceptedOrder, applyIntegratedTransition } from "../order-actions.js";

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

    return authorizedRequest(`/orders/${encodeURIComponent(externalOrderId)}/${endpoint}`, { method: "PATCH" });
  }

  async function processPendingCommands(executor) {
    const commands = await getPendingCommands("deliverymuch", executor);
    for (const command of commands) {
      try {
        await sendCommand(command);
        if (command.action === "accept") {
          await activateAcceptedOrder(command.orderId, db, executor);
        } else if (command.action === "ready") {
          await applyIntegratedTransition(command.orderId, "ready", db, executor);
        } else if (command.action === "cancel") {
          await applyIntegratedTransition(command.orderId, "cancelled", db, executor);
        }
        const order = await getOrderWithMapping(command.orderId, executor);
        if (order?.mapping) {
          await updateChannelMapping(order.mapping.id, {
            externalStatus: command.action,
            syncStatus: "synchronized",
            syncError: null
          }, executor);
        }
        await updateChannelCommand(command.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
          error: null
        }, executor);
      } catch (error) {
        const attempts = command.attempts + 1;
        await updateChannelCommand(command.id, {
          attempts,
          status: attempts >= 3 ? "failed" : "pending",
          error: error.message,
          nextAttemptAt: new Date(Date.now() + 60_000).toISOString()
        }, executor);
        if (attempts >= 3) {
          const order = await getOrderWithMapping(command.orderId, executor);
          if (order?.mapping) {
            await updateChannelMapping(order.mapping.id, {
              syncStatus: "failed",
              syncError: error.message
            }, executor);
          }
        }
      }
    }
  }

  async function poll(executor) {
    if (!config.deliveryMuch.enabled) return;

    try {
      await processPendingCommands(executor);
      const orders = await fetchOrders();
      const receiveIds = [];

      for (const externalOrder of orders) {
        if (!externalOrder?.id) throw new Error("Pedido Delivery Much sem id");
        const externalEventId = `${externalOrder.id}:${externalOrder.status || "unknown"}`;
        const savedEvent = await insertChannelEvent({
          id: randomUUID(),
          channel: "deliverymuch",
          externalEventId,
          merchantId: config.deliveryMuch.companyUuid,
          externalOrderId: externalOrder.id,
          eventType: `ORDER_${String(externalOrder.status || "observed").toUpperCase()}`,
          payload: externalOrder,
          status: "processed"
        }, executor);

        receiveIds.push(externalOrder.id);
        if (!savedEvent) continue;

        const ingestion = await ingestExternalOrder({
          source: "deliverymuch",
          externalMerchantId: config.deliveryMuch.companyUuid,
          externalOrderId: externalOrder.id,
          externalStatus: externalOrder.status,
          customerName: externalOrder.customer?.name || "Cliente Delivery Much",
          fulfillmentMode: externalOrder.fulfillmentMode === "pickup" ? "pickup" : "delivery",
          deliveryAddress: externalOrder.deliveryAddress?.formattedAddress || null,
          createdAt: externalOrder.createdAt,
          items: (externalOrder.items || []).map((item) => ({
            id: item.id || randomUUID(),
            name: item.name,
            quantity: item.quantity,
            price: Number(item.price),
            notes: item.notes || ""
          })),
          metadata: { deliveryMuchOrder: externalOrder }
        }, executor, db);
        if (ingestion.repeated) {
          const order = await getOrderWithMapping(ingestion.orderId, executor);
          if (order?.mapping) {
            await updateChannelMapping(order.mapping.id, {
              externalStatus: externalOrder.status,
              syncStatus: "synchronized"
            }, executor);
          }
        }
      }
      return { receiveIds };
    } catch (error) {
      if (error.statusCode === 401) tokenCache = null;
      throw error;
    }
  }

  return {
    channel: "deliverymuch",
    pollIntervalMs: Math.max(config.deliveryMuch.pollIntervalMs, 15_000),
    poll,
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
