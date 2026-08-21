import { getOrderWithMapping } from "./integration-repository.js";
import { createOrderAction } from "./order-actions.js";
import { fetchIFoodCancellationReasons } from "./providers/ifood.js";

export default async function integrationRoutes(fastify, { db, sse, config }) {
  function adapterEnabled(channel) {
    if (channel === "ifood") return config.ifood.enabled;
    if (channel === "deliverymuch") return config.deliveryMuch.enabled;
    return false;
  }

  function publishSyncStatus(orderId, syncStatus) {
    sse.publish("orders", {
      type: "order.sync.status.changed",
      payload: { orderId, syncStatus },
      at: new Date().toISOString(),
    });
  }

  async function enqueueAction(request, reply, action, payload, message) {
    const { id } = request.params;
    const idempotencyKey = request.headers["idempotency-key"];

    try {
      const current = await getOrderWithMapping(id, db);
      if (!current?.mapping)
        return reply.code(404).send({ error: "Pedido de integração não encontrado" });
      if (!adapterEnabled(current.mapping.channel)) {
        return reply.code(503).send({
          code: "ADAPTER_DISABLED",
          error: `Adapter ${current.mapping.channel} está desligado`,
        });
      }
      const result = await createOrderAction(id, action, payload, idempotencyKey, db);
      publishSyncStatus(id, result.syncStatus);
      return reply.code(202).send({
        orderId: id,
        action,
        syncStatus: result.syncStatus,
        repeated: result.repeated,
        message,
      });
    } catch (error) {
      return reply.code(error.statusCode || 500).send({ code: error.code, error: error.message });
    }
  }

  fastify.get("/integrations/status", async () => {
    const { rows } = await db.query(
      `SELECT channel, COUNT(*)::int AS non_terminal
       FROM channel_commands
       WHERE status IN ('pending', 'processing', 'ambiguous', 'awaiting_event')
       GROUP BY channel`,
    );
    const counts = Object.fromEntries(rows.map((row) => [row.channel, Number(row.non_terminal)]));
    return {
      channels: {
        ifood: { enabled: config.ifood.enabled, nonTerminalCommands: counts.ifood || 0 },
        deliverymuch: {
          enabled: config.deliveryMuch.enabled,
          nonTerminalCommands: counts.deliverymuch || 0,
        },
      },
      simulation: false,
    };
  });

  fastify.post("/integrations/commands/:id/reprocess", async (request, reply) => {
    const { rows } = await db.query(
      `UPDATE channel_commands
       SET status = 'ambiguous', attempts = 0, next_attempt_at = NOW(),
           completed_at = NULL, dead_lettered_at = NULL, error = NULL,
           lease_owner = NULL, lease_expires_at = NULL
       WHERE id = $1 AND status = 'dead_letter'
       RETURNING id, channel, status, correlation_id`,
      [request.params.id],
    );
    if (!rows[0])
      return reply.code(409).send({
        code: "COMMAND_NOT_DEAD_LETTER",
        error: "Somente comando em dead-letter pode ser reprocessado",
      });
    return { command: rows[0], mode: "reconcile_only" };
  });

  fastify.get("/orders/:id/cancellation-reasons", async (request, reply) => {
    const order = await getOrderWithMapping(request.params.id, db);
    if (!order?.mapping) {
      return reply.code(404).send({ error: "Pedido de integração não encontrado" });
    }

    if (!adapterEnabled(order.mapping.channel)) {
      return reply.code(503).send({
        code: "ADAPTER_DISABLED",
        error: `Adapter ${order.mapping.channel} está desligado`,
      });
    }

    if (order.mapping.channel === "ifood") {
      const reasons = await fetchIFoodCancellationReasons(config.ifood, order.mapping.externalId);
      if (!reasons.length)
        return reply.code(409).send({ error: "Canal não ofereceu motivo de cancelamento" });
      return reply.send({ reasons, demo: false });
    }

    if (order.mapping.channel === "deliverymuch") {
      return reply.code(501).send({
        error: "Cancelamento Delivery Much bloqueado até homologar os códigos do parceiro",
      });
    }

    return reply
      .code(503)
      .send({ code: "ADAPTER_DISABLED", error: "Adapter desconhecido ou desligado" });
  });

  fastify.post("/orders/:id/accept", (request, reply) =>
    enqueueAction(request, reply, "accept", {}, "Aceitação enviada à plataforma"),
  );

  fastify.post("/orders/:id/cancel", (request, reply) => {
    const { reasonId } = request.body || {};
    if (!reasonId) return reply.code(400).send({ error: "reasonId é obrigatório" });
    return enqueueAction(
      request,
      reply,
      "cancel",
      { reasonId },
      "Cancelamento enviado à plataforma",
    );
  });

  fastify.post("/orders/:id/start-preparation", (request, reply) =>
    enqueueAction(request, reply, "startPreparation", {}, "Início de preparo enviado à plataforma"),
  );

  fastify.post("/orders/:id/ready", (request, reply) =>
    enqueueAction(request, reply, "ready", {}, "Pronto enviado à plataforma"),
  );
}
