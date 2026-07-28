import assert from "node:assert/strict";
import { test } from "node:test";
import { processChannelCommands } from "../apps/api/src/integrations/command-outbox.js";
import { createOrderAction } from "../apps/api/src/integrations/order-actions.js";
import pg from "pg";

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  test.skip("PostgreSQL efêmero requer TEST_DATABASE_URL");
} else {
  let pool;
  
  test.before(async () => {
    pool = new pg.Pool({ connectionString });
  });

  test.after(async () => {
    if (pool) await pool.end();
  });

  // Mock global.fetch para capturar requests do iFood dentro do outbox
  const originalFetch = globalThis.fetch;
  
  test("H-03 E2E transacional: reconcilia 'CANCELLED' sem ativar, apenas cancelando o pedido 'received'", async () => {
    globalThis.fetch = async (url) => {
      const data = String(url).includes("/token") ? { accessToken: "test-token" } : { status: "CANCELLED" };
      return { ok: true, text: async () => JSON.stringify(data), json: async () => data };
    };

    const client = await pool.connect();
    try {
      // Setup order
      await client.query("INSERT INTO orders (id, source, status, fulfillment_mode, total, items) VALUES ('h03-order-1', 'ifood', 'received', 'delivery', 10, '[]') ON CONFLICT DO NOTHING");
      await client.query("INSERT INTO channel_mappings (id, order_id, channel, external_status) VALUES ('h03-map-1', 'h03-order-1', 'ifood', 'placed') ON CONFLICT DO NOTHING");
      
      const db = { transaction: (work) => work(client) };
      await createOrderAction("h03-order-1", "accept", { externalOrderId: "ext-1" }, "attempt-1", db);

      // Processa outbox que disparara a reconciliação (vai ver CANCELLED e retornar localEffect=cancel)
      await processChannelCommands({ db: pool, workerId: "worker-1" }, {
        ifood: { merchantId: "123", enabled: true }
      });

      // Validaçoes transacionais
      const { rows: orders } = await client.query("SELECT status FROM orders WHERE id = 'h03-order-1'");
      assert.equal(orders[0].status, "cancelled");

      const { rows: mappings } = await client.query("SELECT external_status FROM channel_mappings WHERE order_id = 'h03-order-1'");
      assert.equal(mappings[0].external_status, "cancel"); // Foi sincronizado como cancel

      const { rows: stock } = await client.query("SELECT * FROM stock_movements WHERE reason = 'cancellation'");
      // Pedido estava em 'received', não deduziu estoque, logo não deve estornar estoque no cancelamento!
      assert.equal(stock.length, 0);

      const { rows: jobs } = await client.query("SELECT * FROM print_jobs WHERE order_id = 'h03-order-1'");
      // Não deve gerar ticket para cozinha!
      assert.equal(jobs.length, 0);

    } finally {
      client.release();
      globalThis.fetch = originalFetch;
    }
  });

  test("H-03 compensação idempotente de pedido previamente confirmado ao receber CANCELLED atrasado", async () => {
    globalThis.fetch = async (url) => {
      const data = String(url).includes("/token") ? { accessToken: "test-token" } : { status: "CANCELLED" };
      return { ok: true, text: async () => JSON.stringify(data), json: async () => data };
    };

    const client = await pool.connect();
    try {
      await client.query("INSERT INTO orders (id, source, status, fulfillment_mode, total, items) VALUES ('h03-order-2', 'ifood', 'confirmed', 'delivery', 10, '[]') ON CONFLICT DO NOTHING");
      await client.query("INSERT INTO channel_mappings (id, order_id, channel, external_status) VALUES ('h03-map-2', 'h03-order-2', 'ifood', 'confirmed') ON CONFLICT DO NOTHING");
      
      const db = { transaction: (work) => work(client) };
      await createOrderAction("h03-order-2", "accept", { externalOrderId: "ext-2" }, "attempt-2", db);

      await processChannelCommands({ db: pool, workerId: "worker-2" }, {
        ifood: { merchantId: "123", enabled: true }
      });

      const { rows: stockMovements } = await client.query("SELECT * FROM stock_movements WHERE reason = 'cancellation' AND order_id = 'h03-order-2'");
      assert.equal(stockMovements.length, 1); // Compensou o estoque porque já estava confirmado!
    } finally {
      client.release();
      globalThis.fetch = originalFetch;
    }
  });
}
