import { createOrderAction } from "./order-actions.js";
import { getOrderWithMapping } from "./integration-repository.js";
import { fetchIFoodCancellationReasons } from "./providers/ifood.js";

export default async function integrationRoutes(fastify, { db, sse, config }) {
  function publishSyncStatus(orderId, syncStatus) {
    sse.publish("orders", {
      type: "order.sync.status.changed",
      payload: { orderId, syncStatus },
      at: new Date().toISOString()
    });
  }

  async function enqueueAction(request, reply, action, payload, message) {
    const { id } = request.params;
    const idempotencyKey = request.headers["idempotency-key"];

    try {
      const result = await createOrderAction(id, action, payload, idempotencyKey, db);
      publishSyncStatus(id, result.syncStatus);
      return reply.code(202).send({
        orderId: id,
        action,
        syncStatus: result.syncStatus,
        repeated: result.repeated,
        message
      });
    } catch (error) {
      return reply.code(error.statusCode || 500).send({ error: error.message });
    }
  }

  fastify.get("/orders/:id/cancellation-reasons", async (request, reply) => {
    const order = await getOrderWithMapping(request.params.id, db);
    if (!order?.mapping) {
      return reply.code(404).send({ error: "Pedido de integração não encontrado" });
    }

    if (order.mapping.channel === "ifood" && config.ifood.enabled) {
      const reasons = await fetchIFoodCancellationReasons(config.ifood, order.mapping.externalId);
      if (!reasons.length) return reply.code(409).send({ error: "Canal não ofereceu motivo de cancelamento" });
      return reply.send({ reasons, demo: false });
    }

    if (order.mapping.channel === "deliverymuch" && config.deliveryMuch.enabled) {
      return reply.code(501).send({
        error: "Cancelamento Delivery Much bloqueado até homologar os códigos do parceiro"
      });
    }

    // Apenas para pedidos sintéticos quando o adapter está desligado.
    return reply.send({
      reasons: [
        { id: "501", name: "Problemas no sistema" },
        { id: "502", name: "Restaurante sem energia" },
        { id: "503", name: "Produto indisponível" }
      ],
      demo: true
    });
  });

  fastify.post("/orders/:id/accept", (request, reply) => enqueueAction(
    request,
    reply,
    "accept",
    {},
    "Aceitação enviada à plataforma"
  ));

  fastify.post("/orders/:id/cancel", (request, reply) => {
    const { reasonId } = request.body || {};
    if (!reasonId) return reply.code(400).send({ error: "reasonId é obrigatório" });
    return enqueueAction(request, reply, "cancel", { reasonId }, "Cancelamento enviado à plataforma");
  });

  fastify.post("/orders/:id/start-preparation", (request, reply) => enqueueAction(
    request,
    reply,
    "startPreparation",
    {},
    "Início de preparo enviado à plataforma"
  ));

  fastify.post("/orders/:id/ready", (request, reply) => enqueueAction(
    request,
    reply,
    "ready",
    {},
    "Pronto enviado à plataforma"
  ));
}
