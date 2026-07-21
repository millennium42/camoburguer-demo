import { randomUUID } from "crypto";
import {
  findChannelCommand,
  getOrderWithMapping,
  insertChannelCommand,
  updateChannelMapping
} from "./integration-repository.js";

import { transitionOrder } from "@camoburguer/domain";

const ACTION_RULES = {
  accept: { status: "received", syncStatus: "accept_pending" },
  cancel: { statuses: ["received", "confirmed", "in_preparation", "ready"], syncStatus: "cancel_pending" },
  startPreparation: { status: "confirmed", syncStatus: "preparation_pending" },
  ready: { status: "in_preparation", syncStatus: "ready_pending" }
};

const CHANNEL_ACTIONS = {
  ifood: new Set(["accept", "cancel", "startPreparation", "ready"]),
  deliverymuch: new Set(["accept", "cancel", "ready"])
};

export async function createOrderAction(orderId, action, payload, idempotencyKey, db) {
  const rule = ACTION_RULES[action];
  if (!rule) {
    const error = new Error("Ação de integração inválida");
    error.statusCode = 400;
    throw error;
  }
  const key = String(idempotencyKey || "").trim();
  if (!key) {
    const error = new Error("Idempotency-Key é obrigatório");
    error.statusCode = 400;
    throw error;
  }

  return db.transaction(async (client) => {
    const order = await getOrderWithMapping(orderId, client);
    if (!order || !order.mapping) {
      const err = new Error("Pedido ou integração não encontrados");
      err.statusCode = 404;
      throw err;
    }

    if (!CHANNEL_ACTIONS[order.mapping.channel]?.has(action)) {
      const error = new Error(`Ação ${action} não suportada pelo canal ${order.mapping.channel}`);
      error.statusCode = 422;
      throw error;
    }

    const existing = await findChannelCommand({ channel: order.mapping.channel, idempotencyKey: key }, client);
    const commandPayload = { ...(payload || {}), externalOrderId: order.mapping.externalId };
    if (existing) {
      const sameOperation = existing.orderId === order.id
        && existing.action === action
        && JSON.stringify(existing.payload || {}) === JSON.stringify(commandPayload);
      if (!sameOperation) {
        const error = new Error("Idempotency-Key já usada por outra ação de integração");
        error.statusCode = 409;
        throw error;
      }
      return { command: existing, syncStatus: order.mapping.syncStatus, order, repeated: true };
    }

    const allowedStatuses = rule.statuses || [rule.status];
    if (!allowedStatuses.includes(order.status)) {
      const err = new Error(`Pedido em estado ${order.status} não aceita a ação ${action}`);
      err.statusCode = 409;
      throw err;
    }

    const command = await insertChannelCommand({
      id: randomUUID(),
      orderId: order.id,
      channel: order.mapping.channel,
      action,
      idempotencyKey: key,
      payload: commandPayload,
      status: "pending"
    }, client);

    if (!command) {
      const winner = await findChannelCommand({ channel: order.mapping.channel, idempotencyKey: key }, client);
      const sameOperation = winner?.orderId === order.id
        && winner.action === action
        && JSON.stringify(winner.payload || {}) === JSON.stringify(commandPayload);
      if (!sameOperation) {
        const error = new Error("Idempotency-Key já usada por outra ação de integração");
        error.statusCode = 409;
        throw error;
      }
      return { command: winner, syncStatus: order.mapping.syncStatus, order, repeated: true };
    }

    const syncStatus = rule.syncStatus;
    await updateChannelMapping(order.mapping.id, { syncStatus }, client);

    return { command, syncStatus, order, repeated: false };
  });
}

export async function activateAcceptedOrder(orderId, db, executor = null) {
  const activate = async (client) => {
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
    const saved = await db.updateOrder(confirmed, "received", client);
    if (!saved) {
      const error = new Error("Pedido foi alterado durante a confirmação");
      error.statusCode = 409;
      throw error;
    }
    await db.changeStock(saved, -1, "sale", client);

    const printJob = await db.reservePrintJob(saved, "confirmed", client);
    await updateChannelMapping(order.mapping.id, { syncStatus: "synchronized" }, client);

    return { saved, repeated: false, printJob };
  };
  return executor ? activate(executor) : db.transaction(activate);
}

export async function applyIntegratedTransition(orderId, nextStatus, db, executor = null) {
  const apply = async (client) => {
    const order = await getOrderWithMapping(orderId, client);
    if (!order?.mapping) throw new Error("Pedido de integração não encontrado");
    if (order.status === nextStatus) return { saved: order, repeated: true };

    const updated = transitionOrder(order, nextStatus);
    const saved = await db.updateOrder(updated, order.status, client);
    if (!saved) {
      const error = new Error("Pedido foi alterado durante a sincronização");
      error.statusCode = 409;
      throw error;
    }
    if (nextStatus === "cancelled" && order.status === "confirmed") {
      await db.changeStock(saved, 1, "cancellation", client, saved.id);
    }
    return { saved, repeated: false };
  };
  return executor ? apply(executor) : db.transaction(apply);
}
