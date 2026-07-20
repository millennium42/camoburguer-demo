import { createOrderAction } from "./order-actions.js";
import { getOrderWithMapping } from "./integration-repository.js";

export default async function integrationRoutes(fastify, options) {
  const { db, sse } = fastify;

  fastify.get("/orders/:id/cancellation-reasons", async (request, reply) => {
    const { id } = request.params;
    const order = await getOrderWithMapping(id, db);
    
    if (!order || !order.mapping) {
      return reply.code(404).send({ error: "Pedido de integração não encontrado" });
    }
    
    // Simplification for the demo: hardcoded reasons for the channels
    const reasons = [
      { id: "501", name: "Problemas no sistema" },
      { id: "502", name: "Restaurante sem energia" },
      { id: "503", name: "Produto indisponível" }
    ];

    return reply.send({ reasons });
  });

  fastify.post("/orders/:id/accept", async (request, reply) => {
    const { id } = request.params;
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) return reply.code(400).send({ error: "idempotency-key is required" });

    try {
      const { command, syncStatus, order } = await createOrderAction(id, "accept", {}, db);
      sse.publish("order.sync.status.changed", { orderId: id, syncStatus });
      return reply.code(202).send({
        orderId: id,
        action: "accept",
        syncStatus,
        message: "Aceitação enviada à plataforma"
      });
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });

  fastify.post("/orders/:id/cancel", async (request, reply) => {
    const { id } = request.params;
    const idempotencyKey = request.headers['idempotency-key'];
    const { reasonId } = request.body || {};
    
    if (!idempotencyKey) return reply.code(400).send({ error: "idempotency-key is required" });
    if (!reasonId) return reply.code(400).send({ error: "reasonId is required" });

    try {
      const { command, syncStatus, order } = await createOrderAction(id, "cancel", { reasonId }, db);
      sse.publish("order.sync.status.changed", { orderId: id, syncStatus });
      return reply.code(202).send({
        orderId: id,
        action: "cancel",
        syncStatus,
        message: "Cancelamento enviado à plataforma"
      });
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });

  fastify.post("/orders/:id/start-preparation", async (request, reply) => {
    const { id } = request.params;
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) return reply.code(400).send({ error: "idempotency-key is required" });

    try {
      const { command, syncStatus, order } = await createOrderAction(id, "startPreparation", {}, db);
      sse.publish("order.sync.status.changed", { orderId: id, syncStatus });
      return reply.code(202).send({
        orderId: id,
        action: "startPreparation",
        syncStatus,
        message: "Início de preparo enviado à plataforma"
      });
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });

  fastify.post("/orders/:id/ready", async (request, reply) => {
    const { id } = request.params;
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) return reply.code(400).send({ error: "idempotency-key is required" });

    try {
      const { command, syncStatus, order } = await createOrderAction(id, "ready", {}, db);
      sse.publish("order.sync.status.changed", { orderId: id, syncStatus });
      return reply.code(202).send({
        orderId: id,
        action: "ready",
        syncStatus,
        message: "Pronto enviado à plataforma"
      });
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });
}
