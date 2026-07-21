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

const tokenCaches = new Map();

function tokenKey(settings) {
  return `${settings.apiUrl}:${settings.clientId}`;
}

async function getIFoodToken(settings) {
  const key = tokenKey(settings);
  const cached = tokenCaches.get(key);
  if (cached?.expiresAt > Date.now() + 60_000) return cached.value;

  const payload = await requestForm(`${settings.apiUrl}/authentication/v1.0/oauth/token`, {
    grantType: "client_credentials",
    clientId: settings.clientId,
    clientSecret: settings.clientSecret
  });
  const next = {
    value: payload.accessToken,
    expiresAt: Date.now() + Number(payload.expiresIn || 21_600) * 1000
  };
  tokenCaches.set(key, next);
  return next.value;
}

function clearIFoodToken(settings) {
  tokenCaches.delete(tokenKey(settings));
}

export async function fetchIFoodCancellationReasons(settings, externalOrderId) {
  let payload;
  try {
    const token = await getIFoodToken(settings);
    payload = await requestJson(
      `${settings.apiUrl}/order/v1.0/orders/${encodeURIComponent(externalOrderId)}/cancellationReasons`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (error) {
    if (error.statusCode === 401) clearIFoodToken(settings);
    throw error;
  }
  const reasons = Array.isArray(payload) ? payload : payload?.reasons || [];
  return reasons.map((reason) => ({
    id: String(reason.code || reason.id),
    name: String(reason.description || reason.name || reason.code || reason.id)
  }));
}

const EVENT_ALIASES = new Map([
  ["PLC", "PLACED"],
  ["ORDER_PLACED", "PLACED"],
  ["CFM", "CONFIRMED"],
  ["ORDER_CONFIRMED", "CONFIRMED"],
  ["CAN", "CANCELLED"],
  ["ORDER_CANCELLED", "CANCELLED"],
  ["SPS", "PREPARATION_STARTED"],
  ["SEPARATION_STARTED", "PREPARATION_STARTED"],
  ["SPE", "READY_TO_PICKUP"],
  ["PREPARATION_ENDED", "READY_TO_PICKUP"],
  ["SEPARATION_ENDED", "READY_TO_PICKUP"],
  ["RTP", "READY_TO_PICKUP"]
]);

export function normalizeIFoodEventType(event) {
  const candidates = [event.fullCode, event.code].filter(Boolean).map((value) => String(value).toUpperCase());
  for (const candidate of candidates) {
    if (EVENT_ALIASES.has(candidate)) return EVENT_ALIASES.get(candidate);
    if (["PLACED", "CONFIRMED", "CANCELLED", "PREPARATION_STARTED", "READY_TO_PICKUP"].includes(candidate)) {
      return candidate;
    }
  }
  return candidates[0] || "UNKNOWN";
}

function ifoodFulfillmentMode(orderType) {
  if (orderType === "TAKEOUT") return "pickup";
  if (orderType === "DINE_IN" || orderType === "INDOOR") return "local";
  return "delivery";
}

function ifoodDeliveryAddress(orderDetails) {
  const address = orderDetails.delivery?.deliveryAddress;
  if (!address) return null;
  return [
    address.formattedAddress || [address.streetName, address.streetNumber].filter(Boolean).join(", "),
    address.complement,
    address.neighborhood,
    address.city,
    address.state
  ].filter(Boolean).join(" — ");
}

function ifoodPaymentMethod(orderDetails) {
  const methods = orderDetails.payments?.methods || [];
  const offline = methods.filter((method) => String(method.type || "").trim().toUpperCase() === "OFFLINE");
  if (!offline.length) return "app_paid";
  if (offline.length !== 1) return "app_paid";
  return {
    CASH: "cash",
    PIX: "pix",
    CREDIT: "credit_card",
    DEBIT: "debit_card"
  }[String(offline[0].method || "").trim().toUpperCase()] || "app_paid";
}

function ifoodItemNotes(item) {
  const optionNames = (item.options || []).flatMap((option) => [
    `${option.quantity || 1}x ${option.name}`,
    ...(option.customization || []).map((custom) => `${custom.quantity || 1}x ${custom.name}`)
  ]);
  return [item.observations, optionNames.length ? `Adicionais: ${optionNames.join(", ")}` : ""]
    .filter(Boolean)
    .join(" | ");
}

const EVENT_ACTIONS = new Map([
  ["CONFIRMED", "accept"],
  ["CANCELLED", "cancel"],
  ["PREPARATION_STARTED", "startPreparation"],
  ["READY_TO_PICKUP", "ready"]
]);

const EVENT_STATUSES = new Map([
  ["CANCELLED", "cancelled"],
  ["PREPARATION_STARTED", "in_preparation"],
  ["READY_TO_PICKUP", "ready"]
]);

export default function createIFoodAdapter(config, db) {
  const getToken = () => getIFoodToken(config.ifood);

  async function fetchEvents() {
    const token = await getToken();
    const payload = await requestJson(`${config.ifood.apiUrl}/events/v1.0/events:polling?categories=FOOD`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-polling-merchants": config.ifood.merchantId
      }
    });
    return Array.isArray(payload) ? payload : payload?.events || [];
  }

  async function sendAcknowledgment(eventIds) {
    if (!eventIds.length) return;
    const token = await getToken();
    return requestJson(`${config.ifood.apiUrl}/events/v1.0/events/acknowledgment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventIds.map((id) => ({ id })))
    });
  }

  async function fetchOrderDetails(externalOrderId) {
    const token = await getToken();
    return requestJson(`${config.ifood.apiUrl}/order/v1.0/orders/${encodeURIComponent(externalOrderId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async function sendCommand(command) {
    const externalOrderId = command.payload.externalOrderId;
    if (!externalOrderId) throw new Error("Comando iFood sem externalOrderId");

    const token = await getToken();
    const endpoints = {
      accept: ["confirm", null],
      cancel: ["requestCancellation", {
        reason: command.payload.reasonId
      }],
      startPreparation: ["startPreparation", null],
      ready: ["readyToPickup", null]
    };
    const target = endpoints[command.action];
    if (!target) throw new Error(`Ação iFood não suportada: ${command.action}`);

    const [endpoint, body] = target;
    return requestJson(`${config.ifood.apiUrl}/order/v1.0/orders/${encodeURIComponent(externalOrderId)}/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  }

  async function processPendingCommands(executor) {
    const pendingCommands = await getPendingCommands("ifood", executor);
    for (const command of pendingCommands) {
      try {
        await sendCommand(command);
        await updateChannelCommand(command.id, {
          status: "awaiting_event",
          completedAt: null,
          error: null
        }, executor);
      } catch (error) {
        const attempts = command.attempts + 1;
        await updateChannelCommand(command.id, {
          attempts,
          status: attempts >= 3 ? "failed" : "pending",
          error: error.message,
          nextAttemptAt: new Date(Date.now() + 30_000).toISOString()
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

  async function findInternalOrder(externalOrderId, executor) {
    const { rows } = await executor.query(
      `SELECT o.id AS order_id, cm.id AS mapping_id
       FROM orders o
       JOIN channel_mappings cm ON o.id = cm.order_id
       WHERE cm.channel = 'ifood' AND cm.merchant_id = $1 AND cm.external_id = $2`,
      [config.ifood.merchantId, externalOrderId]
    );
    return rows[0] || null;
  }

  async function completeCommand(orderId, action, executor) {
    if (!action) return;
    await executor.query(
      `UPDATE channel_commands
       SET status = 'completed', completed_at = NOW(), error = NULL
       WHERE order_id = $1 AND action = $2 AND status = 'awaiting_event'`,
      [orderId, action]
    );
  }

  async function processEvent(event, executor) {
    const type = normalizeIFoodEventType(event);
    if (type === "PLACED") {
      const orderDetails = await fetchOrderDetails(event.orderId);
      const fulfillmentMode = ifoodFulfillmentMode(orderDetails.orderType);
      await ingestExternalOrder({
        source: "ifood",
        externalMerchantId: config.ifood.merchantId,
        externalOrderId: event.orderId,
        externalStatus: type,
        customerName: orderDetails.customer?.name || "Cliente iFood",
        deliveryAddress: fulfillmentMode === "delivery" ? ifoodDeliveryAddress(orderDetails) : null,
        fulfillmentMode,
        paymentMethod: ifoodPaymentMethod(orderDetails),
        items: (orderDetails.items || []).map((item) => ({
          id: item.uniqueId || item.id,
          name: item.name,
          price: Number(item.totalPrice ?? item.price ?? item.unitPrice * item.quantity) / Number(item.quantity || 1),
          quantity: item.quantity,
          notes: ifoodItemNotes(item)
        })),
        createdAt: orderDetails.createdAt || event.createdAt,
        metadata: {
          ifoodOrder: orderDetails,
          externalOrderAmount: orderDetails.total?.orderAmount ?? null,
          externalPayments: orderDetails.payments || null
        }
      }, executor, db);
      return;
    }

    const local = await findInternalOrder(event.orderId, executor);
    if (!local) return;

    if (type === "CANCELLATION_REQUEST_FAILED") {
      const reason = String(event.metadata?.reason || "Solicitação rejeitada pelo iFood");
      await executor.query(
        `UPDATE channel_commands
         SET status = 'failed', completed_at = NOW(), error = $2
         WHERE order_id = $1 AND action IN ('accept', 'cancel') AND status = 'awaiting_event'`,
        [local.order_id, reason]
      );
      await updateChannelMapping(local.mapping_id, {
        externalStatus: type,
        syncStatus: "failed",
        syncError: reason
      }, executor);
      return;
    }

    if (type === "CONFIRMED") {
      await activateAcceptedOrder(local.order_id, db, executor);
    } else if (EVENT_STATUSES.has(type)) {
      await applyIntegratedTransition(local.order_id, EVENT_STATUSES.get(type), db, executor);
    }

    const action = EVENT_ACTIONS.get(type);
    await completeCommand(local.order_id, action, executor);
    await updateChannelMapping(local.mapping_id, {
      externalStatus: type,
      syncStatus: action ? "synchronized" : "external_event_received"
    }, executor);
  }

  async function poll(executor) {
    if (!config.ifood.enabled) return { ackIds: [] };

    try {
      await processPendingCommands(executor);
      const events = await fetchEvents();
      if (!Array.isArray(events) || events.length === 0) return { ackIds: [] };

      events.sort((a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0));
      const ackIds = [];

      for (const event of events) {
        if (!event?.id || !event?.orderId || (!event?.fullCode && !event?.code)) {
          throw new Error("Evento iFood inválido");
        }
        const savedEvent = await insertChannelEvent({
          id: event.id,
          channel: "ifood",
          externalEventId: event.id,
          merchantId: config.ifood.merchantId,
          externalOrderId: event.orderId,
          eventType: normalizeIFoodEventType(event),
          payload: event,
          status: "processed",
          occurredAt: event.createdAt
        }, executor);

        if (savedEvent) await processEvent(event, executor);
        ackIds.push(event.id);
      }

      return { ackIds };
    } catch (error) {
      if (error.statusCode === 401) clearIFoodToken(config.ifood);
      throw error;
    }
  }

  return {
    channel: "ifood",
    pollIntervalMs: Math.max(config.ifood.pollIntervalMs, 30_000),
    poll,
    afterCommit: async ({ ackIds }) => {
      try {
        await sendAcknowledgment(ackIds);
      } catch (error) {
        if (error.statusCode === 401) clearIFoodToken(config.ifood);
        throw error;
      }
    }
  };
}
