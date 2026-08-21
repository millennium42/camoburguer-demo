import assert from "node:assert/strict";
import { test } from "node:test";
import pg from "pg";
import { processChannelCommands } from "../apps/api/src/integrations/command-outbox.js";
import { createOrderAction } from "../apps/api/src/integrations/order-actions.js";
import createIFoodAdapter from "../apps/api/src/integrations/providers/ifood.js";

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

  const originalFetch = globalThis.fetch;

  test("H-03 E2E transacional: reconcilia 'CANCELLED' sem ativar, apenas cancelando o pedido 'received'", async () => {
    globalThis.fetch = async (url) => {
      const data = String(url).includes("/token")
        ? { accessToken: "test-token" }
        : { status: "CANCELLED" };
      return { ok: true, text: async () => JSON.stringify(data), json: async () => data };
    };

    const client = await pool.connect();
    try {
      await client.query("DELETE FROM orders WHERE id = 'h03-order-1'");
      await client.query(
        "INSERT INTO orders (id, source, status, fulfillment_mode, customer_name, delivery_address, total, items) VALUES ('h03-order-1', 'ifood', 'received', 'delivery', 'test', 'Rua B', 10, '[]') ON CONFLICT DO NOTHING",
      );
      await client.query(
        "INSERT INTO channel_mappings (id, order_id, channel, merchant_id, external_id, external_status) VALUES ('h03-map-1', 'h03-order-1', 'ifood', 'demo-merchant', 'ext-1', 'placed') ON CONFLICT DO NOTHING",
      );

      const txDb = {
        transaction: (work) => work(client),
        updateOrder: async (order, expectedStatus, client) => {
          console.log("TEST 1 updateOrder:", {
            id: order.id,
            status: order.status,
            expectedStatus,
          });
          const { rowCount } = await client.query(
            "UPDATE orders SET status = $1 WHERE id = $2 AND status = $3",
            [order.status, order.id, expectedStatus],
          );
          return rowCount > 0 ? order : null;
        },
        changeStock: async (order, qty, reason, client, refId) => {
          await client.query(
            "INSERT INTO stock_movements (id, order_id, reason, delta, category) VALUES ($1, $2, $3, $4, 'xis')",
            [`sm-${Date.now()}`, order.id, reason, qty],
          );
        },
      };

      const attempt1 = `attempt-1-${Date.now()}`;
      await client.query(
        "INSERT INTO channel_commands (id, order_id, channel, action, payload, idempotency_key, status, lease_expires_at) VALUES ($1, $2, 'ifood', $3, $4, $5, 'processing', NOW() - INTERVAL '1 MINUTE')",
        [
          `cmd-1-${Date.now()}`,
          "h03-order-1",
          "accept",
          JSON.stringify({ externalOrderId: "ext-1" }),
          attempt1,
        ],
      );

      await processChannelCommands({
        db: txDb,
        workerId: "worker-1",
        adapter: createIFoodAdapter(
          { ifood: { merchantId: "123", enabled: true, pollIntervalMs: 30000 } },
          txDb,
        ),
      });

      const { rows: orders } = await client.query(
        "SELECT status FROM orders WHERE id = 'h03-order-1'",
      );
      assert.equal(orders[0].status, "cancelled");

      const { rows: stock } = await client.query(
        "SELECT * FROM stock_movements WHERE reason = 'cancellation'",
      );
      assert.equal(stock.length, 0);

      const { rows: jobs } = await client.query(
        "SELECT * FROM print_jobs WHERE order_id = 'h03-order-1'",
      );
      assert.equal(jobs.length, 0);
    } finally {
      client.release();
      globalThis.fetch = originalFetch;
    }
  });

  test("H-03 compensação idempotente de pedido previamente confirmado ao receber CANCELLED atrasado", async () => {
    globalThis.fetch = async (url) => {
      const data = String(url).includes("/token")
        ? { accessToken: "test-token" }
        : { status: "CANCELLED" };
      return { ok: true, text: async () => JSON.stringify(data), json: async () => data };
    };

    const client = await pool.connect();
    try {
      await client.query("DELETE FROM orders WHERE id = 'h03-order-2'");
      await client.query(
        "INSERT INTO orders (id, source, status, fulfillment_mode, customer_name, delivery_address, total, items) VALUES ('h03-order-2', 'ifood', 'confirmed', 'delivery', 'test', 'Rua A', 10, '[]') ON CONFLICT DO NOTHING",
      );
      await client.query(
        "INSERT INTO channel_mappings (id, order_id, channel, merchant_id, external_id, external_status) VALUES ('h03-map-2', 'h03-order-2', 'ifood', 'demo-merchant', 'ext-2', 'confirmed') ON CONFLICT DO NOTHING",
      );

      const txDb = {
        transaction: (work) => work(client),
        updateOrder: async (order, expectedStatus, client) => {
          const { rowCount } = await client.query(
            "UPDATE orders SET status = $1 WHERE id = $2 AND status = $3",
            [order.status, order.id, expectedStatus],
          );
          return rowCount > 0 ? order : null;
        },
        changeStock: async (order, qty, reason, client, refId) => {
          await client.query(
            "INSERT INTO stock_movements (id, order_id, reason, delta, category) VALUES ($1, $2, $3, $4, 'xis')",
            [`sm-${Date.now()}`, order.id, reason, qty],
          );
        },
      };

      const attempt2 = `attempt-2-${Date.now()}`;
      await client.query(
        "INSERT INTO channel_commands (id, order_id, channel, action, payload, idempotency_key, status, lease_expires_at) VALUES ($1, $2, 'ifood', $3, $4, $5, 'processing', NOW() - INTERVAL '1 MINUTE')",
        [
          `cmd-2-${Date.now()}`,
          "h03-order-2",
          "accept",
          JSON.stringify({ externalOrderId: "ext-2" }),
          attempt2,
        ],
      );

      await processChannelCommands({
        db: txDb,
        workerId: "worker-2",
        adapter: createIFoodAdapter(
          { ifood: { merchantId: "123", enabled: true, pollIntervalMs: 30000 } },
          txDb,
        ),
      });

      const { rows: stockMovements } = await client.query(
        "SELECT * FROM stock_movements WHERE reason = 'cancellation' AND order_id = 'h03-order-2'",
      );
      assert.equal(stockMovements.length, 1);
    } finally {
      client.release();
      globalThis.fetch = originalFetch;
    }
  });
}
