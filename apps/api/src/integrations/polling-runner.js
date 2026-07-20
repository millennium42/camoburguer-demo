import { createDb } from "../db.js";
import createDeliveryMuchAdapter from "./providers/deliverymuch.js";
import createIFoodAdapter from "./providers/ifood.js";

export function startIntegrationPolling({ config, db }) {
  const adapters = [];
  
  if (config.deliveryMuch?.enabled) {
    adapters.push(createDeliveryMuchAdapter(config, db));
  }
  
  if (config.ifood?.enabled) {
    adapters.push(createIFoodAdapter(config, db));
  }

  if (adapters.length === 0) return;

  const pollingDb = createDb(config.databaseUrl);
  
  setInterval(async () => {
    try {
      await pollingDb.transaction(async (client) => {
        // Advisory lock 100 for integration polling
        const { rows } = await client.query("SELECT pg_try_advisory_xact_lock(100) as locked");
        if (!rows[0].locked) return; // already running

        for (const adapter of adapters) {
          try {
            await adapter.poll(client);
          } catch (err) {
            console.error(`Error polling ${adapter.channel}:`, err);
          }
        }
      });
    } catch (err) {
      console.error("Integration polling runner error:", err);
    }
  }, 15000).unref(); // runs every 15s
}
