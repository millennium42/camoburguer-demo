import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { isIP } from "node:net";
import { after, before, describe, test } from "node:test";
import pg from "pg";
import { CATALOG, CATALOG_CAPTURED_AT } from "@camoburguer/domain";
import { createDb } from "../apps/api/src/db.js";
import { PROTECTED_TABLES, runSeedDemo } from "../scripts/seed-demo.mjs";

const connectionString = process.env.TEST_DATABASE_URL;
const ADMIN_TOKEN = "postgres-test-admin-token";
let target;
let db;
let pool;
let nextPort = 33410;

function assertSafeTestUrl(value) {
  const url = new URL(value);
  const ciCompose = process.env.TEST_POSTGRES_PROFILE === "ci-compose" && process.env.CI === "true";
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol), "protocolo PostgreSQL obrigatório");
  assert.equal(url.hostname, "127.0.0.1", "host deve ser loopback explícito");
  assert.ok(url.port, "porta explícita obrigatória");
  assert.equal(
    Number(url.port),
    ciCompose ? 5432 : 55432,
    "porta do processo PostgreSQL efêmero esperado"
  );
  assert.match(url.pathname.slice(1), /_test$/, "database deve terminar em _test");
  assert.equal(url.pathname.slice(1), "camoburguer_auto_seed_test");
  return url;
}

function assertServerIdentity(url, identity, ciCompose) {
  assert.match(identity.version, /PostgreSQL 16\.14/);
  assert.equal(identity.database, url.pathname.slice(1));
  assert.equal(Number(identity.port), ciCompose ? 5432 : Number(url.port));
  const dataDirectory = identity.data_directory.replaceAll("\\", "/");
  if (ciCompose) {
    assert.equal(isIP(identity.address), 4, "servidor Compose deve resolver para IPv4 interno");
    assert.match(
      identity.address,
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/,
      "identidade do servidor deve ser IP privado do container"
    );
    assert.equal(dataDirectory, "/var/lib/postgresql/data");
  } else {
    assert.equal(identity.address, url.hostname);
    assert.match(dataDirectory, /camoburguer-auto-seed-test-20260728/);
  }
}

async function validateEphemeralProcess() {
  const url = assertSafeTestUrl(connectionString);
  const ciCompose = process.env.TEST_POSTGRES_PROFILE === "ci-compose" && process.env.CI === "true";
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const { rows: [identity] } = await client.query(`
      SELECT version(),
             current_database() AS database,
             host(inet_server_addr()) AS address,
             inet_server_port() AS port,
             current_setting('data_directory') AS data_directory
    `);
    assertServerIdentity(url, identity, ciCompose);
    target = `${identity.address}:${identity.port}/${identity.database}`;
  } finally {
    await client.end();
  }
}

async function resetBaseline() {
  await pool.query("DROP TRIGGER IF EXISTS seed_test_fail_update ON stock_balances");
  await pool.query("DROP FUNCTION IF EXISTS seed_test_fail_update()");
  await pool.query(`TRUNCATE TABLE ${PROTECTED_TABLES.join(", ")} CASCADE`);
  await pool.query(`
    INSERT INTO stock_balances (category, quantity)
    VALUES ('xis', 0), ('dog', 0), ('hamburguer', 0)
  `);
  await pool.query(`
    INSERT INTO catalog_items (
      sku, name, category, price, description, stock_category, allows_addons,
      preparation_mode, available, origin, source_version
    )
    SELECT sku, name, category, price, description, stock_category, allows_addons,
           preparation_mode, available, 'olaclick_snapshot', $2
    FROM jsonb_to_recordset($1::jsonb) AS item(
      sku text, name text, category text, price numeric, description text,
      stock_category text, allows_addons boolean, preparation_mode text, available boolean
    )
  `, [JSON.stringify(CATALOG.map((item) => ({
    sku: item.sku,
    name: item.name,
    category: item.category,
    price: item.price,
    description: item.description,
    stock_category: item.stockCategory,
    allows_addons: item.allowsAddons,
    preparation_mode: item.preparationMode,
    available: item.available
  }))), CATALOG_CAPTURED_AT]);
}

async function snapshot() {
  const result = {};
  for (const table of PROTECTED_TABLES) {
    const { rows } = await pool.query(`SELECT * FROM ${table}`);
    result[table] = rows.map((row) => JSON.stringify(row)).sort();
  }
  return result;
}

async function countOperationalRows() {
  const counts = {};
  for (const table of PROTECTED_TABLES) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = rows[0].count;
  }
  return counts;
}

function serverEnv(overrides = {}) {
  const env = {
    ...process.env,
    DATABASE_URL: connectionString,
    PORT: String(nextPort++),
    DEMO_ADMIN_TOKEN: ADMIN_TOKEN,
    APP_ENV: "demo",
    DEMO_SEED_ENABLED: "true",
    DEMO_SEED_TARGET: target,
    PRINT_BRIDGE_URL: "http://127.0.0.1:1",
    IFOOD_ENABLED: "false",
    DELIVERYMUCH_ENABLED: "false",
    ...overrides
  };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete env[key];
  }
  return env;
}

async function startServer(overrides = {}, { expectFailure = false } = {}) {
  const env = serverEnv(overrides);
  const child = spawn(process.execPath, ["apps/api/src/server.js"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const base = `http://127.0.0.1:${env.PORT}`;

  if (expectFailure) {
    const exitCode = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`API não falhou cedo:\n${output}`)), 8000);
      child.once("exit", (code) => {
        clearTimeout(timeout);
        resolve(code);
      });
    });
    return { child, base, env, exitCode, output: () => output };
  }

  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`API encerrou no boot:\n${output}`);
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) return { child, base, env, output: () => output };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill();
  throw new Error(`Timeout aguardando API:\n${output}`);
}

async function stopServer(server) {
  if (server.child.exitCode != null) return;
  const exited = new Promise((resolve) => server.child.once("exit", resolve));
  server.child.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 1000))]);
  if (server.child.exitCode == null && process.platform === "win32") {
    const killer = spawn("taskkill", ["/PID", String(server.child.pid), "/T", "/F"], {
      stdio: "ignore"
    });
    await new Promise((resolve) => killer.once("exit", resolve));
  } else if (server.child.exitCode == null) {
    server.child.kill("SIGKILL");
  }
  if (server.child.exitCode == null) {
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2000))]);
  }
}

async function postSeed(server, {
  token = ADMIN_TOKEN,
  confirmTarget = target
} = {}) {
  const headers = { "content-type": "application/json" };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${server.base}/demo/seed`, {
    method: "POST",
    headers,
    body: JSON.stringify({ confirmTarget })
  });
  return { status: response.status, body: await response.json() };
}

function validOptions(overrides = {}) {
  return {
    authenticated: true,
    environment: "demo",
    enabled: true,
    expectedTarget: target,
    confirmedTarget: target,
    ...overrides
  };
}

async function insertTab(client) {
  await client.query(`
    INSERT INTO service_tabs (id, kind, label, status)
    VALUES ('seed-test-tab', 'tab', 'Seed test tab', 'open')
    ON CONFLICT (id) DO NOTHING
  `);
}

async function insertOrder(client, id = "seed-test-order") {
  await client.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, total, items)
    VALUES ($1, 'counter', 'received', 'Sentinela', 'pickup', 0, '[]'::jsonb)
    ON CONFLICT (id) DO NOTHING
  `, [id]);
}

async function insertShift(client) {
  await client.query(`
    INSERT INTO cash_shifts (id, status, opened_at)
    VALUES ('seed-test-shift', 'open', NOW())
    ON CONFLICT (id) DO NOTHING
  `);
}

const persistedFixtures = {
  service_tabs: insertTab,
  catalog_items: (client) => client.query(
    "UPDATE catalog_items SET price = price + 1 WHERE sku = (SELECT MIN(sku) FROM catalog_items)"
  ),
  orders: insertOrder,
  order_tab_assignments: async (client) => {
    await insertTab(client);
    await insertOrder(client);
    await client.query(`
      INSERT INTO order_tab_assignments
        (id, idempotency_key, order_id, tab_id, round_number, normalized_payload)
      VALUES ('seed-test-assignment', 'seed-test-assignment-key', 'seed-test-order',
              'seed-test-tab', 1, '{}'::jsonb)
    `);
  },
  print_jobs: async (client) => {
    await insertOrder(client);
    await client.query(`
      INSERT INTO print_jobs (id, order_id, status, printer_name, content)
      VALUES ('seed-test-print', 'seed-test-order', 'pending', 'test', 'test')
    `);
  },
  stock_balances: (client) => client.query(
    "UPDATE stock_balances SET quantity = 1 WHERE category = 'xis'"
  ),
  stock_movements: (client) => client.query(`
    INSERT INTO stock_movements (id, category, delta, reason)
    VALUES ('seed-test-stock', 'xis', 1, 'test')
  `),
  cash_shifts: insertShift,
  tab_payments: async (client) => {
    await insertTab(client);
    await insertShift(client);
    await client.query(`
      INSERT INTO tab_payments
        (id, tab_id, shift_id, payment_method, amount_cents, idempotency_key)
      VALUES ('seed-test-payment', 'seed-test-tab', 'seed-test-shift',
              'cash', 100, 'seed-test-payment-key')
    `);
  },
  finance_entries: (client) => client.query(`
    INSERT INTO finance_entries
      (id, type, amount, payment_method, source, label, occurred_at)
    VALUES ('seed-test-finance', 'adjustment', 1, 'cash', 'counter', 'test', NOW())
  `),
  channel_mappings: async (client) => {
    await insertOrder(client);
    await client.query(`
      INSERT INTO channel_mappings
        (id, order_id, channel, merchant_id, external_id)
      VALUES ('seed-test-mapping', 'seed-test-order', 'test', 'test', 'test')
    `);
  },
  channel_events: (client) => client.query(`
    INSERT INTO channel_events
      (id, channel, external_event_id, event_type, payload)
    VALUES ('seed-test-event', 'test', 'seed-test-event', 'test', '{}'::jsonb)
  `),
  channel_commands: async (client) => {
    await insertOrder(client);
    await client.query(`
      INSERT INTO channel_commands
        (id, order_id, channel, action, idempotency_key)
      VALUES ('seed-test-command', 'seed-test-order', 'test', 'test', 'seed-test-command-key')
    `);
  }
};

test("perfil CI separa URL publicada loopback da identidade privada do container", () => {
  const previousProfile = process.env.TEST_POSTGRES_PROFILE;
  const previousCi = process.env.CI;
  process.env.TEST_POSTGRES_PROFILE = "ci-compose";
  process.env.CI = "true";
  try {
    const url = assertSafeTestUrl(
      "postgres://camoburguer:camoburguer@127.0.0.1:5432/camoburguer_auto_seed_test"
    );
    const identity = {
      version: "PostgreSQL 16.14",
      database: "camoburguer_auto_seed_test",
      address: "172.20.0.2",
      port: 5432,
      data_directory: "/var/lib/postgresql/data"
    };
    assert.doesNotThrow(() => assertServerIdentity(url, identity, true));
    assert.throws(
      () => assertServerIdentity(url, { ...identity, address: "8.8.8.8" }, true),
      /IP privado/
    );
  } finally {
    if (previousProfile === undefined) delete process.env.TEST_POSTGRES_PROFILE;
    else process.env.TEST_POSTGRES_PROFILE = previousProfile;
    if (previousCi === undefined) delete process.env.CI;
    else process.env.CI = previousCi;
  }
});

if (!connectionString) {
  test("PostgreSQL efêmero requer TEST_DATABASE_URL", { skip: true }, () => {});
} else {
  describe("seed demo em PostgreSQL efêmero validado", { concurrency: false }, () => {
    before(async () => {
      await validateEphemeralProcess();
      pool = new pg.Pool({ connectionString });
      db = createDb(connectionString);
      await db.init();
      await resetBaseline();
    });

    after(async () => {
      await resetBaseline();
      await db.close();
      await pool.end();
    });

    test("boot real ausente/false não semeia; true falha; restart preserva sentinela e 13 tabelas", async () => {
      await resetBaseline();
      const baseline = await snapshot();
      for (const autoSeed of [undefined, "false"]) {
        const server = await startServer({ AUTO_SEED: autoSeed });
        await stopServer(server);
        assert.deepEqual(await snapshot(), baseline);
      }

      const rejected = await startServer({ AUTO_SEED: "true" }, { expectFailure: true });
      assert.notEqual(rejected.exitCode, 0);
      assert.match(rejected.output(), /AUTO_SEED=true é proibido/);
      assert.deepEqual(await snapshot(), baseline);

      await insertOrder(pool);
      const sentinel = await snapshot();
      assert.equal((await pool.query("SELECT COUNT(*)::int count FROM cash_shifts")).rows[0].count, 0);
      const restarted = await startServer({ AUTO_SEED: "false" });
      await stopServer(restarted);
      assert.deepEqual(await snapshot(), sentinel);
      const rejectedRestart = await startServer({ AUTO_SEED: "true" }, { expectFailure: true });
      assert.notEqual(rejectedRestart.exitCode, 0);
      assert.deepEqual(await snapshot(), sentinel);
    });

    test("preflight PostgreSQL persiste e recusa cada uma das 13 classes sem alteração", async () => {
      for (const table of PROTECTED_TABLES) {
        await resetBaseline();
        await persistedFixtures[table](pool);
        const beforeState = await snapshot();
        await assert.rejects(runSeedDemo(db, validOptions()), (error) => {
          assert.equal(error.code, "preflight_conflict");
          assert.ok(error.details.blockers.includes(table), `${table}: ${error.details.blockers}`);
          return true;
        });
        assert.deepEqual(await snapshot(), beforeState, table);
      }
    });

    test("baseline semeia atomicamente e falha pós-primeiro DML faz rollback integral", async () => {
      await resetBaseline();
      const baseline = await snapshot();
      await assert.rejects(
        runSeedDemo(db, validOptions({ injectFailureAfterFirstMutation: true })),
        /Falha de teste injetada/
      );
      assert.deepEqual(await snapshot(), baseline);
      await runSeedDemo(db, validOptions());
      const counts = await countOperationalRows();
      assert.ok(counts.orders > 0);
      assert.ok(counts.cash_shifts > 0);
    });

    test("locks serializam duas seeds e impedem escrita entre preflight e mutação", async () => {
      await resetBaseline();
      let releaseFirst;
      const holdFirst = new Promise((resolve) => { releaseFirst = resolve; });
      let firstReady;
      const ready = new Promise((resolve) => { firstReady = resolve; });
      const first = runSeedDemo(db, validOptions({
        onDecision: async () => {
          firstReady();
          await holdFirst;
        }
      }));
      await ready;
      const second = runSeedDemo(db, validOptions());
      await new Promise((resolve) => setTimeout(resolve, 100));
      releaseFirst();
      const results = await Promise.allSettled([first, second]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      const rejected = results.find((result) => result.status === "rejected");
      assert.equal(rejected.reason.code, "preflight_conflict");

      await resetBaseline();
      let releaseSeed;
      const holdSeed = new Promise((resolve) => { releaseSeed = resolve; });
      let seedReady;
      const seedAtBarrier = new Promise((resolve) => { seedReady = resolve; });
      const seed = runSeedDemo(db, validOptions({
        onDecision: async () => {
          seedReady();
          await holdSeed;
        }
      }));
      await seedAtBarrier;
      let writeFinished = false;
      const writer = insertOrder(pool, "concurrent-operational-write").then(() => {
        writeFinished = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(writeFinished, false);
      releaseSeed();
      await seed;
      await writer;
      assert.equal(writeFinished, true);
    });

    test("HTTP real distingue recusas, conflito e 500 sanitizado sem segredos", async () => {
      await resetBaseline();
      const noTokenConfig = await startServer({ DEMO_ADMIN_TOKEN: "" });
      assert.equal((await postSeed(noTokenConfig)).status, 503);
      await stopServer(noTokenConfig);

      const production = await startServer({ APP_ENV: "production" });
      assert.equal((await postSeed(production)).status, 403);
      await stopServer(production);

      const disabled = await startServer({ DEMO_SEED_ENABLED: "false" });
      assert.equal((await postSeed(disabled)).status, 403);
      await stopServer(disabled);

      const wrongTarget = await startServer({ DEMO_SEED_TARGET: "127.0.0.1:55432/outro_test" });
      assert.equal((await postSeed(wrongTarget, {
        confirmTarget: "127.0.0.1:55432/outro_test"
      })).status, 422);
      await stopServer(wrongTarget);

      const server = await startServer();
      assert.equal((await postSeed(server, { token: null })).status, 401);
      assert.equal((await postSeed(server, { token: "segredo-incorreto" })).status, 403);
      assert.equal((await postSeed(server, { confirmTarget: "" })).status, 422);
      await insertOrder(pool);
      const conflict = await postSeed(server);
      assert.equal(conflict.status, 409);
      assert.ok(conflict.body.blockers.includes("orders"));
      await stopServer(server);

      await resetBaseline();
      const failing = await startServer();
      await pool.query("ALTER TABLE catalog_items RENAME TO catalog_items_seed_test_hidden");
      try {
        const internal = await postSeed(failing);
        assert.equal(internal.status, 500);
        assert.deepEqual(internal.body, {
          code: "internal_error",
          error: "Falha interna ao executar seed."
        });
        assert.doesNotMatch(
          failing.output(),
          /catalog_items_seed_test_hidden|postgres:\/\/|postgres-test-admin-token/
        );
      } finally {
        await pool.query("ALTER TABLE catalog_items_seed_test_hidden RENAME TO catalog_items");
        await stopServer(failing);
      }
    });
  });
}
