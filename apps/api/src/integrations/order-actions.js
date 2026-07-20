import { randomUUID } from "crypto";
import { getOrderWithMapping, updateChannelMapping, insertChannelCommand } from "./integration-repository.js";
import { updateOrder, changeStock, reservePrintJob } from "../db.js";
import { transitionOrder } from "domain";

export async function createOrderAction(orderId, action, payload, db) {
  return db.transaction(async (client) => {
    const order = await getOrderWithMapping(orderId, client);
    if (!order || !order.mapping) {
      const err = new Error("Pedido ou integração não encontrados");
      err.statusCode = 404;
      throw err;
    }

    if (action === "accept" && order.status !== "received") {
      const err = new Error("Pedido não está aguardando autorização");
      err.statusCode = 409;
      throw err;
    }

    const idempotencyKey = randomUUID();
    const command = await insertChannelCommand({
      id: randomUUID(),
      orderId: order.id,
      channel: order.mapping.channel,
      action,
      idempotencyKey,
      payload,
      status: "pending"
    }, client);

    const syncStatus = `${action}_pending`;
    await updateChannelMapping(order.mapping.id, { syncStatus }, client);

    return { command, syncStatus, order };
  });
}

export async function activateAcceptedOrder(orderId, db) {
  return db.transaction(async (client) => {
    const order = await getOrderWithMapping(orderId, client);
    if (!order || !order.mapping) {
      throw new Error("Pedido não encontrado");
    }

    if (order.status === "confirmed") {
      return { saved: order, repeated: true, printJob: null };
    }

    if (order.status !== "received") {
      throw new Error("Pedido não está aguardando autorização");
    }

    const confirmed = transitionOrder(order, "confirmed");
    const saved = await updateOrder(confirmed, "received", client);
    await changeStock(saved, -1, "sale", client);

    const printJob = await reservePrintJob(saved, "confirmed", client);
    await updateChannelMapping(order.mapping.id, { syncStatus: "synchronized" }, client);

    return { saved, repeated: false, printJob };
  });
}
