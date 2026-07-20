import { requestForm, requestJson } from "../http-client.js";
import { ingestExternalOrder } from "../order-ingestion.js";
import { getPendingCommands, updateChannelCommand, insertChannelEvent } from "../integration-repository.js";
import { activateAcceptedOrder } from "../order-actions.js";
import { randomUUID } from "crypto";

export default function createDeliveryMuchAdapter(config, db) {
  let currentToken = null;

  async function getToken() {
    if (currentToken) return currentToken;

    const payload = await requestForm(config.deliveryMuch.authUrl, {
      grant_type: "password",
      client_id: config.deliveryMuch.clientId,
      client_secret: config.deliveryMuch.clientSecret,
      username: config.deliveryMuch.username,
      password: config.deliveryMuch.password
    });

    currentToken = payload.access_token;
    return currentToken;
  }

  async function fetchOrders() {
    const token = await getToken();
    return requestJson(`${config.deliveryMuch.apiUrl}/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async function markReceived(externalOrderId) {
    const token = await getToken();
    return requestJson(`${config.deliveryMuch.apiUrl}/orders/${externalOrderId}/receive`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async function acceptOrder(externalOrderId) {
    const token = await getToken();
    return requestJson(`${config.deliveryMuch.apiUrl}/orders/${externalOrderId}/accept`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async function cancelOrder(externalOrderId) {
    const token = await getToken();
    return requestJson(`${config.deliveryMuch.apiUrl}/orders/${externalOrderId}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async function poll(executor) {
    if (!config.deliveryMuch.enabled) return;

    try {
      // 1. Process pending commands
      const pendingCommands = await getPendingCommands("deliverymuch", executor);
      for (const cmd of pendingCommands) {
        try {
          if (cmd.action === "accept") {
            await acceptOrder(cmd.payload.externalOrderId || cmd.idempotencyKey.split(":")[2]);
            await activateAcceptedOrder(cmd.orderId, db);
          } else if (cmd.action === "cancel") {
            await cancelOrder(cmd.payload.externalOrderId || cmd.idempotencyKey.split(":")[2]);
          }

          await updateChannelCommand(cmd.id, {
            status: "completed",
            completedAt: new Date().toISOString()
          }, executor);
        } catch (err) {
          await updateChannelCommand(cmd.id, {
            attempts: cmd.attempts + 1,
            status: cmd.attempts >= 3 ? "failed" : "pending",
            error: err.message,
            nextAttemptAt: new Date(Date.now() + 60000).toISOString()
          }, executor);
        }
      }

      // 2. Fetch new orders
      const orders = await fetchOrders();
      for (const externalOrder of orders) {
        const eventId = randomUUID();
        
        await insertChannelEvent({
          id: eventId,
          channel: "deliverymuch",
          externalEventId: eventId, // DM doesn't have events, so we generate one
          externalOrderId: externalOrder.id,
          eventType: "ORDER_CREATED",
          payload: externalOrder
        }, executor);

        await ingestExternalOrder({
          source: "deliverymuch",
          externalMerchantId: config.deliveryMuch.companyUuid,
          externalOrderId: externalOrder.id,
          externalStatus: externalOrder.status,
          customerName: externalOrder.customer?.name || "Cliente",
          fulfillmentMode: "delivery", // simplistic mapping
          deliveryAddress: externalOrder.deliveryAddress?.formattedAddress,
          items: (externalOrder.items || []).map(item => ({
            id: item.id || randomUUID(),
            name: item.name,
            quantity: item.quantity,
            price: Number(item.price),
            notes: ""
          }))
        }, executor, db);

        await markReceived(externalOrder.id);
      }
    } catch (err) {
      if (err.statusCode === 401) {
        currentToken = null; // force token refresh on next run
      }
      throw err;
    }
  }

  return {
    channel: "deliverymuch",
    poll
  };
}
