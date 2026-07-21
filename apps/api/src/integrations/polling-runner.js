import createDeliveryMuchAdapter from "./providers/deliverymuch.js";
import createIFoodAdapter from "./providers/ifood.js";

function assertConfigured(name, enabled, settings, fields) {
  if (!enabled) return;
  const missing = fields.filter((field) => !String(settings[field] || "").trim());
  if (missing.length) throw new Error(`${name} habilitado sem configuração: ${missing.join(", ")}`);
}

export function startIntegrationPolling({ config, db, sse }) {
  assertConfigured("iFood", config.ifood.enabled, config.ifood, ["apiUrl", "clientId", "clientSecret", "merchantId"]);
  assertConfigured("Delivery Much", config.deliveryMuch.enabled, config.deliveryMuch, [
    "authUrl",
    "apiUrl",
    "clientId",
    "clientSecret",
    "username",
    "password",
    "companyUuid"
  ]);
  const adapters = [];
  
  if (config.deliveryMuch?.enabled) {
    adapters.push(createDeliveryMuchAdapter(config, db));
  }
  
  if (config.ifood?.enabled) {
    adapters.push(createIFoodAdapter(config, db));
  }

  if (adapters.length === 0) return [];

  const timers = adapters.map((adapter) => {
    const run = async () => {
      let pollResult;
      try {
        pollResult = await db.transaction(async (client) => {
          const { rows } = await client.query(
            "SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) as locked",
            [`integration-poll:${adapter.channel}`]
          );
          if (!rows[0].locked) return null;
          return adapter.poll(client);
        });
        if (pollResult && adapter.afterCommit) await adapter.afterCommit(pollResult);
        if (pollResult && sse) {
          sse.publish("orders", {
            type: "integration.poll.committed",
            payload: { channel: adapter.channel },
            at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error(`Error polling ${adapter.channel}:`, err);
      }
    };

    const timer = setInterval(run, adapter.pollIntervalMs).unref();
    run();
    return timer;
  });

  return timers;
}
