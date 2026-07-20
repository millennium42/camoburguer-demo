import { requestForm, requestJson } from "../http-client.js";
import { ingestExternalOrder } from "../order-ingestion.js";
import { getPendingCommands, updateChannelCommand, insertChannelEvent } from "../integration-repository.js";
import { activateAcceptedOrder } from "../order-actions.js";

export default function createIFoodAdapter(config, db) {
  let currentToken = null;

  async function getToken() {
    if (currentToken) return currentToken;

    const payload = await requestForm(`${config.ifood.apiUrl}/authentication/v1.0/oauth/token`, {
      grantType: "client_credentials",
      clientId: config.ifood.clientId,
      clientSecret: config.ifood.clientSecret
    });

    currentToken = payload.accessToken;
    return currentToken;
  }

  async function fetchEvents() {
    const token = await getToken();
    return requestJson(`${config.ifood.apiUrl}/order/v1.0/events:polling`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async function sendAcknowledgment(eventIds) {
    if (!eventIds.length) return;
    const token = await getToken();
    return requestJson(`${config.ifood.apiUrl}/order/v1.0/events/acknowledgment`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventIds.map(id => ({ id })))
    });
  }

  async function fetchOrderDetails(externalOrderId) {
    const token = await getToken();
    return requestJson(`${config.ifood.apiUrl}/order/v1.0/orders/${externalOrderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async function confirmOrder(externalOrderId) {
    const token = await getToken();
    return requestJson(`${config.ifood.apiUrl}/order/v1.0/orders/${externalOrderId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async function startPreparation(externalOrderId) {
    const token = await getToken();
    return requestJson(`${config.ifood.apiUrl}/order/v1.0/orders/${externalOrderId}/startPreparation`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async function readyToPickup(externalOrderId) {
    const token = await getToken();
    return requestJson(`${config.ifood.apiUrl}/order/v1.0/orders/${externalOrderId}/readyToPickup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async function cancelOrder(externalOrderId, reasonId = "501") {
    const token = await getToken();
    return requestJson(`${config.ifood.apiUrl}/order/v1.0/orders/${externalOrderId}/requestCancellation`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ reason: reasonId, cancellationCode: reasonId })
    });
  }

  async function poll(executor) {
    if (!config.ifood.enabled) return;

    try {
      // 1. Process pending commands
      const pendingCommands = await getPendingCommands("ifood", executor);
      for (const cmd of pendingCommands) {
        try {
          const externalOrderId = cmd.payload.externalOrderId || cmd.idempotencyKey.split(":")[2];
          
          if (cmd.action === "accept") {
            await confirmOrder(externalOrderId);
            // iFood requires waiting for the CONFIRMED event before activation,
            // but we update the command state to awaiting_event.
          } else if (cmd.action === "cancel") {
            await cancelOrder(externalOrderId, cmd.payload.reasonId);
          } else if (cmd.action === "startPreparation") {
            await startPreparation(externalOrderId);
          } else if (cmd.action === "ready") {
            await readyToPickup(externalOrderId);
          }

          await updateChannelCommand(cmd.id, {
            status: "awaiting_event",
            completedAt: new Date().toISOString()
          }, executor);
        } catch (err) {
          await updateChannelCommand(cmd.id, {
            attempts: cmd.attempts + 1,
            status: cmd.attempts >= 3 ? "failed" : "pending",
            error: err.message,
            nextAttemptAt: new Date(Date.now() + 30000).toISOString()
          }, executor);
        }
      }

      // 2. Fetch new events
      const events = await fetchEvents();
      if (!events || events.length === 0) return;

      // Sort by created at as per iFood docs
      events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const ackIds = [];

      for (const event of events) {
        const savedEvent = await insertChannelEvent({
          id: event.id,
          channel: "ifood",
          externalEventId: event.id,
          merchantId: config.ifood.merchantId,
          externalOrderId: event.orderId,
          eventType: event.fullCode,
          payload: event,
          occurredAt: event.createdAt
        }, executor);

        if (!savedEvent) {
          // Already processed or duplicate
          ackIds.push(event.id);
          continue;
        }

        // Process based on event type
        if (event.fullCode === "PLACED") {
          const orderDetails = await fetchOrderDetails(event.orderId);
          await ingestExternalOrder({
            source: "ifood",
            externalMerchantId: config.ifood.merchantId,
            externalOrderId: event.orderId,
            externalStatus: "PLACED",
            customerName: orderDetails.customer?.name || "Cliente iFood",
            deliveryAddress: orderDetails.delivery?.deliveryAddress ? `${orderDetails.delivery.deliveryAddress.streetName}, ${orderDetails.delivery.deliveryAddress.streetNumber}` : null,
            fulfillmentMode: orderDetails.orderType === "TAKEOUT" ? "pickup" : "delivery",
            items: orderDetails.items.map((i) => ({
              id: i.id,
              name: i.name,
              price: i.unitPrice,
              quantity: i.quantity,
              notes: i.observations || ""
            })),
            metadata: { ifoodOrder: orderDetails }
          }, executor, db);
        }
        
        if (event.fullCode === "CONFIRMED") {
          // iFood confirmed, now we can safely activate locally
          const { rows } = await executor.query(
            "SELECT o.id FROM orders o JOIN channel_mappings cm ON o.id = cm.order_id WHERE cm.channel = 'ifood' AND cm.external_id = $1",
            [event.orderId]
          );
          if (rows[0]) {
            await activateAcceptedOrder(rows[0].id, db);
          }
        }

        ackIds.push(event.id);
      }

      // 3. Send acknowledgment
      if (ackIds.length > 0) {
        await sendAcknowledgment(ackIds);
      }

    } catch (err) {
      if (err.statusCode === 401) {
        currentToken = null; // force token refresh
      }
      throw err;
    }
  }

  return {
    channel: "ifood",
    poll
  };
}
