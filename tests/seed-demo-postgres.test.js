import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { CATALOG, CATALOG_CAPTURED_AT } from "@camoburguer/domain";
import pg from "pg";
import { hashPassword } from "../apps/api/src/auth.js";
import { createDb } from "../apps/api/src/db.js";
import { processChannelCommands } from "../apps/api/src/integrations/command-outbox.js";
import { updateOwnedChannelCommand } from "../apps/api/src/integrations/integration-repository.js";
import { createOrderAction } from "../apps/api/src/integrations/order-actions.js";
import { PROTECTED_TABLES, runSeedDemo } from "../scripts/seed-demo.mjs";

const connectionString = process.env.TEST_DATABASE_URL;
const ADMIN_PASSWORD = "postgres-test-admin-password";
let target;
let db;
let pool;
let nextPort = 33410;

function assertSafeTestUrl(value) {
  const url = new URL(value);
  const ciCompose = process.env.TEST_POSTGRES_PROFILE === "ci-compose" && process.env.CI === "true";
  assert.ok(
    ["postgres:", "postgresql:"].includes(url.protocol),
    "protocolo PostgreSQL obrigatório",
  );
  assert.equal(url.hostname, "127.0.0.1", "host deve ser loopback explícito");
  assert.ok(url.port, "porta explícita obrigatória");
  assert.equal(
    Number(url.port),
    ciCompose ? 5432 : 55432,
    "porta do processo PostgreSQL efêmero esperado",
  );
  assert.match(url.pathname.slice(1), /_test$/, "database deve terminar em _test");
  assert.equal(url.pathname.slice(1), "camoburguer_auto_seed_test");
  return url;
}

function assertServerIdentity(url, identity, ciCompose) {
  const dockerDesktopLocal = process.env.TEST_POSTGRES_PROFILE === "docker-desktop-local";
  assert.match(identity.version, /PostgreSQL 16\.14/);
  assert.equal(identity.database, url.pathname.slice(1));
  assert.equal(Number(identity.port), ciCompose || dockerDesktopLocal ? 5432 : Number(url.port));
  const dataDirectory = identity.data_directory.replaceAll("\\", "/");
  if (ciCompose || dockerDesktopLocal) {
    assert.equal(isIP(identity.address), 4, "servidor Compose deve resolver para IPv4 interno");
    assert.match(
      identity.address,
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/,
      "identidade do servidor deve ser IP privado do container",
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
    const {
      rows: [identity],
    } = await client.query(`
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
  await pool.query("TRUNCATE TABLE privacy_requests");
  await pool.query(`
    INSERT INTO stock_balances (category, quantity)
    VALUES ('xis', 0), ('dog', 0), ('hamburguer', 0)
    ON CONFLICT (category) DO NOTHING
  `);
  await pool.query(
    `
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
    ON CONFLICT (sku) DO NOTHING
  `,
    [
      JSON.stringify(
        CATALOG.map((item) => ({
          sku: item.sku,
          name: item.name,
          category: item.category,
          price: item.price,
          description: item.description,
          stock_category: item.stockCategory,
          allows_addons: item.allowsAddons,
          preparation_mode: item.preparationMode,
          available: item.available,
        })),
      ),
      CATALOG_CAPTURED_AT,
    ],
  );
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
    ADMIN_BOOTSTRAP_PASSWORD: ADMIN_PASSWORD,
    APP_ENV: "demo",
    DEMO_SEED_ENABLED: "true",
    DEMO_SEED_TARGET: target,
    PRINT_BRIDGE_URL: "http://127.0.0.1:1",
    IFOOD_ENABLED: "false",
    DELIVERYMUCH_ENABLED: "false",
    ...overrides,
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
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
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
      stdio: "ignore",
    });
    await new Promise((resolve) => killer.once("exit", resolve));
  } else if (server.child.exitCode == null) {
    server.child.kill("SIGKILL");
  }
  if (server.child.exitCode == null) {
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2000))]);
  }
}

async function startPrintBridge() {
  const spoolDir = await mkdtemp(join(tmpdir(), "camoburguer-lgpd-"));
  const portFile = join(spoolDir, "bridge-port");
  const child = spawn(process.execPath, ["apps/print-bridge/src/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: "0",
      PRINT_SPOOL_DIR: spoolDir,
      PRINT_BRIDGE_TOKEN: "privacy-test-token",
      PRINT_BRIDGE_PORT_FILE: portFile,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`Bridge encerrou:\n${output}`);
    try {
      const port = Number((await readFile(portFile, "utf8")).trim());
      if (!Number.isInteger(port) || port < 1) throw new Error("porta inválida");
      const bridge = {
        child,
        base: `http://127.0.0.1:${port}`,
        spoolDir,
        output: () => output,
      };
      if ((await fetch(`${bridge.base}/health`)).ok) return bridge;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  await stopServer(bridge);
  throw new Error(`Timeout bridge:\n${output}`);
}

async function stopPrintBridge(bridge) {
  await stopServer(bridge);
  await rm(bridge.spoolDir, { recursive: true, force: true });
}

async function loginSession(server, username, password) {
  const response = await fetch(`${server.base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await response.json();
  const setCookies = response.headers.getSetCookie?.() || [
    response.headers.get("set-cookie") || "",
  ];
  const cookie = setCookies
    .map((value) => value.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return { status: response.status, body, cookie, setCookies };
}

const adminSession = (server, password = ADMIN_PASSWORD) => loginSession(server, "admin", password);

async function requestAs(
  server,
  session,
  path,
  { method = "GET", body, csrf = session?.body?.csrfToken, headers: extraHeaders = {} } = {},
) {
  const headers = { ...extraHeaders };
  if (session?.cookie) headers.cookie = session.cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  if (!["GET", "HEAD"].includes(method) && csrf) headers["x-csrf-token"] = csrf;
  const response = await fetch(`${server.base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function openSse(server, session, path) {
  const controller = new AbortController();
  const response = await fetch(`${server.base}${path}`, {
    headers: { cookie: session.cookie },
    signal: controller.signal,
  });
  const reader = response.body?.getReader();
  if (response.status === 200) await reader.read();
  return { response, reader, controller };
}

async function readSseData(stream, timeoutMs = 3000) {
  const decoder = new TextDecoder();
  const result = await Promise.race([
    stream.reader.read(),
    new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), timeoutMs)),
  ]);
  if (result.timeout) return result;
  if (result.done) return { done: true, data: null };
  const line = decoder
    .decode(result.value)
    .split("\n")
    .find((item) => item.startsWith("data: "));
  return line ? { done: false, data: JSON.parse(line.slice(6)) } : { done: false, data: null };
}

async function postSeed(
  server,
  { authenticated = true, password = ADMIN_PASSWORD, confirmTarget = target } = {},
) {
  const headers = { "content-type": "application/json" };
  if (authenticated) {
    const session = await adminSession(server, password);
    if (session.status !== 200) return session;
    headers.cookie = session.cookie;
    headers["x-csrf-token"] = session.body.csrfToken;
  }
  const response = await fetch(`${server.base}/demo/seed`, {
    method: "POST",
    headers,
    body: JSON.stringify({ confirmTarget }),
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
    ...overrides,
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
  await client.query(
    `
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, total, items)
    VALUES ($1, 'counter', 'received', 'Sentinela', 'pickup', 0, '[]'::jsonb)
    ON CONFLICT (id) DO NOTHING
  `,
    [id],
  );
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
  catalog_items: (client) =>
    client.query(
      "UPDATE catalog_items SET price = price + 1 WHERE sku = (SELECT MIN(sku) FROM catalog_items)",
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
  idempotency_records: (client) =>
    client.query(`
    INSERT INTO idempotency_records (
      idempotency_key, operation, resource, fingerprint, canonical_version
    ) VALUES (
      'seed-test-idempotency', 'test', 'seed-test',
      repeat('a', 64), 'v1'
    )
  `),
  print_jobs: async (client) => {
    await insertOrder(client);
    await client.query(`
      INSERT INTO print_jobs (id, order_id, status, printer_name, content)
      VALUES ('seed-test-print', 'seed-test-order', 'pending', 'test', 'test')
    `);
  },
  stock_balances: (client) =>
    client.query("UPDATE stock_balances SET quantity = 1 WHERE category = 'xis'"),
  stock_movements: (client) =>
    client.query(`
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
  finance_entries: (client) =>
    client.query(`
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
  channel_events: (client) =>
    client.query(`
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
  },
};

test("perfil CI separa URL publicada loopback da identidade privada do container", () => {
  const previousProfile = process.env.TEST_POSTGRES_PROFILE;
  const previousCi = process.env.CI;
  process.env.TEST_POSTGRES_PROFILE = "ci-compose";
  process.env.CI = "true";
  try {
    const url = assertSafeTestUrl(
      "postgres://camoburguer:camoburguer@127.0.0.1:5432/camoburguer_auto_seed_test",
    );
    const identity = {
      version: "PostgreSQL 16.14",
      database: "camoburguer_auto_seed_test",
      address: "172.20.0.2",
      port: 5432,
      data_directory: "/var/lib/postgresql/data",
    };
    assert.doesNotThrow(() => assertServerIdentity(url, identity, true));
    assert.throws(
      () => assertServerIdentity(url, { ...identity, address: "8.8.8.8" }, true),
      /IP privado/,
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

    test("HTTP real aplica default-deny, CSRF por sessao e matriz RBAC", async () => {
      const passwordHash = await hashPassword("role-test-password");
      await pool.query(
        `INSERT INTO users (id, name, email, username, role, password_hash)
         VALUES ('operator-test', 'Operator', 'operator@demo.local', 'operator-test', 'operator', $1),
                ('kitchen-test', 'Kitchen', 'kitchen@demo.local', 'kitchen-test', 'kitchen', $1)
         ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [passwordHash],
      );
      const server = await startServer();
      try {
        const protectedFamilies = [
          ["/catalog", "GET"],
          ["/inventory", "GET"],
          ["/cash-shifts", "GET"],
          ["/finance/summary", "GET"],
          ["/tabs", "GET"],
          ["/orders", "GET"],
          ["/kitchen/queue", "GET"],
          ["/events/orders", "GET"],
          ["/orders/missing/reprint", "POST"],
          ["/orders/missing/accept", "POST"],
          ["/lgpd/anonymize", "POST"],
          ["/demo/seed", "POST"],
        ];
        for (const [path, method] of protectedFamilies) {
          assert.equal(
            (
              await requestAs(server, null, path, {
                method,
                body: method === "POST" ? {} : undefined,
              })
            ).status,
            401,
            `${method} ${path}`,
          );
        }
        const admin = await adminSession(server);
        assert.equal(admin.status, 200);
        assert.ok(admin.setCookies.some((value) => /camoburguer_session=.*HttpOnly/i.test(value)));
        assert.ok(admin.setCookies.every((value) => /SameSite=Strict/i.test(value)));
        assert.ok(admin.setCookies.every((value) => /Secure/i.test(value)));
        assert.equal(JSON.stringify(admin.body).includes(ADMIN_PASSWORD), false);
        assert.equal((await requestAs(server, admin, "/rota-sem-classificacao")).status, 401);
        for (const path of [
          "/catalog",
          "/inventory",
          "/cash-shifts",
          "/finance/summary",
          "/tabs",
          "/orders",
          "/kitchen/queue",
        ]) {
          assert.equal((await requestAs(server, admin, path)).status, 200, path);
        }
        for (const path of ["/orders/missing/reprint", "/orders/missing/accept"]) {
          const status = (await requestAs(server, admin, path, { method: "POST", body: {} }))
            .status;
          assert.notEqual(status, 401, path);
          assert.notEqual(status, 403, path);
        }
        assert.equal(
          (
            await requestAs(server, admin, "/lgpd/anonymize", {
              method: "POST",
              headers: { "Idempotency-Key": "auth-lgpd-request" },
              body: { searchTerm: "inexistente-auth-test" },
            })
          ).status,
          200,
        );

        const otherAdmin = await adminSession(server);
        const tabsBefore = Number(
          (await pool.query("SELECT COUNT(*) FROM service_tabs")).rows[0].count,
        );
        const res = await requestAs(server, admin, "/tabs", {
          method: "POST",
          body: { kind: "tab", label: "csrf-cross-session" },
          csrf: otherAdmin.body.csrfToken,
        });
        if (res.status !== 403) {
          console.log("ADMIN:", admin);
          console.log("OTHER ADMIN:", otherAdmin);
          console.log("RESPONSE:", res);
        }
        assert.equal(res.status, 403);
        assert.equal(
          Number((await pool.query("SELECT COUNT(*) FROM service_tabs")).rows[0].count),
          tabsBefore,
        );

        const operator = await loginSession(server, "operator-test", "role-test-password");
        const kitchen = await loginSession(server, "kitchen-test", "role-test-password");
        for (const path of [
          "/orders",
          "/tabs",
          "/cash-shifts",
          "/finance/summary",
          "/catalog",
          "/inventory",
        ]) {
          assert.equal((await requestAs(server, operator, path)).status, 200, `operator ${path}`);
        }
        for (const path of [
          "/orders/x/accept",
          "/orders/x/reprint",
          "/demo/seed",
          "/lgpd/anonymize",
        ]) {
          assert.equal(
            (
              await requestAs(server, operator, path, {
                method: "POST",
                body: path === "/lgpd/anonymize" ? { searchTerm: "cliente" } : {},
              })
            ).status,
            403,
            `operator ${path}`,
          );
        }
        assert.equal((await requestAs(server, kitchen, "/kitchen/queue")).status, 200);
        assert.equal((await requestAs(server, kitchen, "/orders")).status, 200);
        for (const path of [
          "/cash-shifts",
          "/finance/summary",
          "/tabs",
          "/catalog",
          "/inventory",
        ]) {
          assert.equal((await requestAs(server, kitchen, path)).status, 403, `kitchen ${path}`);
        }
        for (const path of ["/demo/seed", "/lgpd/anonymize"]) {
          assert.equal(
            (
              await requestAs(server, kitchen, path, {
                method: "POST",
                body: path === "/lgpd/anonymize" ? { searchTerm: "cliente" } : {},
              })
            ).status,
            403,
            `kitchen ${path}`,
          );
        }

        const appPage = await fetch(`${server.base}/app/`);
        assert.equal(appPage.status, 200);
        const appHtml = await appPage.text();
        assert.ok(appHtml.includes("main.js"));
        assert.ok(appHtml.includes("styles.css"));
      } finally {
        await stopServer(server);
      }
    });

    test("bootstrap concorrente cria um unico admin sem expor o segredo", async () => {
      await pool.query("TRUNCATE auth_sessions, audit_events, audit_logs, users CASCADE");
      const [first, second] = await Promise.all([startServer(), startServer()]);
      try {
        const count = await pool.query(
          "SELECT COUNT(*)::int count FROM users WHERE role = 'admin'",
        );
        assert.equal(count.rows[0].count, 1);
        assert.equal(first.output().includes(ADMIN_PASSWORD), false);
        assert.equal(second.output().includes(ADMIN_PASSWORD), false);
        assert.equal((await adminSession(first)).status, 200);
        assert.equal((await adminSession(second)).status, 200);
      } finally {
        await Promise.all([stopServer(first), stopServer(second)]);
      }
    });

    test("logout e expiracao absoluta revogam a sessao HTTP", async () => {
      const server = await startServer();
      try {
        const loggedOut = await adminSession(server);
        assert.equal(
          (
            await requestAs(server, loggedOut, "/auth/logout", {
              method: "POST",
            })
          ).status,
          204,
        );
        assert.equal((await requestAs(server, loggedOut, "/orders")).status, 401);

        const expired = await adminSession(server);
        await pool.query(
          `UPDATE auth_sessions SET expires_at = NOW() - INTERVAL '1 second'
           WHERE user_id = (SELECT id FROM users WHERE username = 'admin') AND revoked_at IS NULL`,
        );
        assert.equal((await requestAs(server, expired, "/orders")).status, 401);
      } finally {
        await stopServer(server);
      }
    });

    test("SSE HTTP isola roles, revalida expiracao e nao entrega evento pendente", async () => {
      const passwordHash = await hashPassword("role-test-password");
      await pool.query(
        `INSERT INTO users (id, name, email, username, role, password_hash)
         VALUES ('kitchen-sse-test', 'Kitchen SSE', 'kitchen-sse@demo.local', 'kitchen-sse-test', 'kitchen', $1)
         ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [passwordHash],
      );
      await insertOrder(pool, "sse-auth-order");
      const server = await startServer();
      const streams = [];
      try {
        const admin = await adminSession(server);
        const kitchen = await loginSession(server, "kitchen-sse-test", "role-test-password");
        const forbiddenFinance = await fetch(`${server.base}/events/finance`, {
          headers: { cookie: kitchen.cookie },
        });
        assert.equal(forbiddenFinance.status, 403);

        const adminOrders = await openSse(server, admin, "/events/orders");
        const kitchenOrders = await openSse(server, kitchen, "/events/orders");
        streams.push(adminOrders, kitchenOrders);
        assert.equal(adminOrders.response.status, 200);
        assert.equal(kitchenOrders.response.status, 200);

        assert.equal(
          (
            await requestAs(server, admin, "/orders/sse-auth-order/discount", {
              method: "PATCH",
              body: { discountPercent: 1 },
            })
          ).status,
          200,
        );
        assert.equal((await readSseData(adminOrders)).data?.type, "order.updated");
        assert.equal((await readSseData(kitchenOrders)).data?.type, "order.updated");

        await pool.query(
          `UPDATE auth_sessions SET expires_at = NOW() - INTERVAL '1 second'
           WHERE user_id = (SELECT id FROM users WHERE username = 'kitchen-sse-test')`,
        );
        assert.equal(
          (
            await requestAs(server, admin, "/orders/sse-auth-order/discount", {
              method: "PATCH",
              body: { discountPercent: 2 },
            })
          ).status,
          200,
        );
        assert.equal((await readSseData(adminOrders)).data?.type, "order.updated");
        assert.equal((await readSseData(kitchenOrders)).done, true);
        assert.equal((await requestAs(server, kitchen, "/events/orders")).status, 401);
      } finally {
        for (const stream of streams) stream.controller.abort();
        await stopServer(server);
      }
    });

    test("fechamento de comanda publica tab.closed v1 pós-commit para dois clientes", async () => {
      await resetBaseline();
      await pool.query(
        `INSERT INTO service_tabs (id, kind, label, customer_name, status)
         VALUES ('p15-tab', 'tab', 'P15', 'PII QUE NAO PODE VAZAR', 'open');
         INSERT INTO orders (
           id, tab_id, round_number, source, status, customer_name,
           fulfillment_mode, total, items
         ) VALUES (
           'p15-order', 'p15-tab', 1, 'counter', 'ready',
           'PII QUE NAO PODE VAZAR', 'local', 0, '[]'::jsonb
         )`,
      );
      const server = await startServer();
      const streams = [];
      try {
        const firstAdmin = await adminSession(server);
        const secondAdmin = await adminSession(server);
        streams.push(
          await openSse(server, firstAdmin, "/events/orders"),
          await openSse(server, secondAdmin, "/events/orders"),
        );
        const closed = await requestAs(server, firstAdmin, "/tabs/p15-tab/close", {
          method: "POST",
          body: {},
        });
        assert.equal(closed.status, 200);
        for (const stream of streams) {
          const event = (await readSseData(stream)).data;
          assert.equal(event.type, "tab.closed");
          assert.equal(event.payload.version, 1);
          assert.equal(event.payload.tabId, "p15-tab");
          assert.deepEqual(event.payload.roundOrderIds, ["p15-order"]);
          assert.match(event.payload.eventId, /^[0-9a-f-]{36}$/);
          assert.doesNotMatch(JSON.stringify(event), /PII QUE NAO PODE VAZAR/);
        }
        assert.equal(
          (await pool.query("SELECT status FROM orders WHERE id = 'p15-order'")).rows[0].status,
          "completed",
        );

        await pool.query(
          `INSERT INTO service_tabs (id, kind, label, status)
           VALUES ('p15-rollback-tab', 'tab', 'P15 rollback', 'open');
           INSERT INTO orders (
             id, tab_id, round_number, source, status, customer_name,
             fulfillment_mode, total, items
           ) VALUES (
             'p15-rollback-order', 'p15-rollback-tab', 1, 'counter', 'ready',
             'Rollback', 'local', 0, '[]'::jsonb
           );
           CREATE OR REPLACE FUNCTION p15_fail_close() RETURNS trigger AS $$
           BEGIN
             RAISE EXCEPTION 'falha p15 injetada';
           END;
           $$ LANGUAGE plpgsql;
           CREATE TRIGGER p15_fail_close
             BEFORE UPDATE ON orders
             FOR EACH ROW
             WHEN (OLD.tab_id = 'p15-rollback-tab')
             EXECUTE FUNCTION p15_fail_close()`,
        );
        const rollback = await requestAs(server, firstAdmin, "/tabs/p15-rollback-tab/close", {
          method: "POST",
          body: {},
        });
        assert.equal(rollback.status, 500);
        assert.equal((await readSseData(streams[0], 500)).timeout, true);
        assert.equal(
          (await pool.query("SELECT status FROM service_tabs WHERE id = 'p15-rollback-tab'"))
            .rows[0].status,
          "open",
        );
      } finally {
        await pool.query("DROP TRIGGER IF EXISTS p15_fail_close ON orders");
        await pool.query("DROP FUNCTION IF EXISTS p15_fail_close()");
        for (const stream of streams) stream.controller.abort();
        await stopServer(server);
      }
    });

    test("fila de impressão reconcilia ACK perdido, deduplica workers e protege dead-letter", async () => {
      await resetBaseline();
      const bridge = await startPrintBridge();
      const servers = [];
      try {
        await insertOrder(pool, "p16-order");
        await pool.query(
          `INSERT INTO print_jobs (
             id, order_id, reason, status, printer_name, content, attempts, next_attempt_at
           ) VALUES (
             'p16-concurrent', 'p16-order', 'confirmed', 'pending',
             'test', 'ticket concorrente', 0, NOW()
           )`,
        );
        const pair = await Promise.all([
          startServer({ PRINT_BRIDGE_URL: bridge.base, PRINT_BRIDGE_TOKEN: "privacy-test-token" }),
          startServer({ PRINT_BRIDGE_URL: bridge.base, PRINT_BRIDGE_TOKEN: "privacy-test-token" }),
        ]);
        servers.push(...pair);
        assert.deepEqual(
          (await pool.query("SELECT status, attempts FROM print_jobs WHERE id = 'p16-concurrent'"))
            .rows[0],
          { status: "printed", attempts: 1 },
        );

        const preSpooled = await fetch(`${bridge.base}/print-jobs`, {
          method: "POST",
          headers: {
            authorization: "Bearer privacy-test-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            orderId: "p16-order",
            jobId: "p16-ack-lost",
            printerName: "test",
            reason: "reprint",
            content: "ticket com ACK perdido",
          }),
        });
        assert.equal(preSpooled.status, 201);
        await pool.query(
          `INSERT INTO print_jobs (
             id, order_id, reason, status, printer_name, content, attempts, next_attempt_at
           ) VALUES (
             'p16-ack-lost', 'p16-order', 'reprint', 'retry_wait',
             'test', 'ticket com ACK perdido', 1, NOW()
           )`,
        );
        const reconciler = await startServer({
          PRINT_BRIDGE_URL: bridge.base,
          PRINT_BRIDGE_TOKEN: "privacy-test-token",
        });
        servers.push(reconciler);
        const reconciled = (
          await pool.query(
            "SELECT status, attempts, metadata FROM print_jobs WHERE id = 'p16-ack-lost'",
          )
        ).rows[0];
        assert.equal(reconciled.status, "printed");
        assert.equal(reconciled.attempts, 2);
        assert.equal(reconciled.metadata.reconciled, true);
        const receipt = await fetch(`${bridge.base}/print-jobs/p16-order/p16-ack-lost`, {
          headers: { authorization: "Bearer privacy-test-token" },
        });
        assert.equal(receipt.status, 200);
        assert.equal((await receipt.json()).status, "already_printed");

        await pool.query(
          `INSERT INTO print_jobs (
             id, order_id, reason, status, printer_name, content, attempts,
             dead_lettered_at, next_attempt_at
           ) VALUES (
             'p16-dead', 'p16-order', 'reprint', 'dead_letter',
             'test', 'ticket dead-letter', 5, NOW(), NOW()
           )`,
        );
        const operatorHash = await hashPassword("role-test-password");
        await pool.query(
          `INSERT INTO users (id, name, email, username, role, password_hash)
           VALUES ('p16-operator', 'P16 Operator', 'p16-operator@demo.local', 'p16-operator', 'operator', $1)
           ON CONFLICT (username) DO UPDATE
           SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash`,
          [operatorHash],
        );
        const operator = await loginSession(pair[0], "p16-operator", "role-test-password");
        assert.equal(
          (
            await requestAs(pair[0], operator, "/print-jobs/p16-dead/reprocess", {
              method: "POST",
              body: {},
            })
          ).status,
          403,
        );
        const auditBefore = Number(
          (
            await pool.query(
              `SELECT COUNT(*) FROM audit_events
            WHERE resource_path = '/print-jobs/p16-dead/reprocess'
              AND action = 'print_job.reprocessed'`,
            )
          ).rows[0].count,
        );
        const admin = await adminSession(pair[0]);
        const reprocessed = await requestAs(pair[0], admin, "/print-jobs/p16-dead/reprocess", {
          method: "POST",
          body: {},
        });
        assert.equal(reprocessed.status, 202);
        assert.equal(reprocessed.body.printJob.status, "retry_wait");
        assert.equal(reprocessed.body.printJob.attempts, 0);
        assert.equal(
          (
            await requestAs(pair[0], admin, "/print-jobs/p16-dead/reprocess", {
              method: "POST",
              body: {},
            })
          ).status,
          409,
        );
        assert.equal(
          Number(
            (
              await pool.query(
                `SELECT COUNT(*) FROM audit_events
            WHERE resource_path = '/print-jobs/p16-dead/reprocess'
              AND action = 'print_job.reprocessed'`,
              )
            ).rows[0].count,
          ),
          auditBefore + 1,
        );
      } finally {
        for (const server of servers) await stopServer(server);
        await stopPrintBridge(bridge);
      }
    });

    test("fingerprint idempotente cobre pedido, rodada, cancelamentos, legado e concorrencia", async () => {
      await resetBaseline();
      const server = await startServer();
      try {
        const admin = await adminSession(server);
        assert.equal(
          (
            await requestAs(server, admin, "/inventory/xis/adjustments", {
              method: "POST",
              headers: { "Idempotency-Key": "p06-stock-setup" },
              body: { delta: 50, reason: "setup p06" },
            })
          ).status,
          201,
        );

        const orderKey = "p06-order";
        const orderBody = {
          customerName: "Cliente P06",
          fulfillmentMode: "pickup",
          items: [
            { sku: "x-simples", quantity: 1 },
            { sku: "refrigerante-lata", quantity: 1 },
          ],
          metadata: { z: 1, a: 2 },
        };
        const created = await requestAs(server, admin, "/orders", {
          method: "POST",
          headers: { "Idempotency-Key": orderKey },
          body: orderBody,
        });
        assert.equal(created.status, 201);
        const replay = await requestAs(server, admin, "/orders", {
          method: "POST",
          headers: { "Idempotency-Key": orderKey },
          body: {
            metadata: { a: 2, z: 1 },
            items: [...orderBody.items].reverse(),
            fulfillmentMode: "pickup",
            customerName: "Cliente P06",
          },
        });
        assert.equal(replay.status, 201);
        assert.equal(replay.body.id, created.body.id);
        const divergentOrder = await requestAs(server, admin, "/orders", {
          method: "POST",
          headers: { "Idempotency-Key": orderKey },
          body: { ...orderBody, items: [{ sku: "x-simples", quantity: 2 }] },
        });
        assert.equal(divergentOrder.status, 409);
        assert.equal(divergentOrder.body.code, "idempotency_payload_mismatch");

        const tab = await requestAs(server, admin, "/tabs", {
          method: "POST",
          body: { kind: "tab", label: "P06 Tab" },
        });
        assert.equal(tab.status, 201);
        assert.equal(
          (
            await requestAs(server, admin, `/tabs/${tab.body.id}/rounds`, {
              method: "POST",
              headers: { "Idempotency-Key": orderKey },
              body: { items: [{ sku: "x-simples", quantity: 1 }] },
            })
          ).status,
          409,
        );

        const roundKey = "p06-round";
        const roundBody = {
          reason: null,
          items: [
            { sku: "refrigerante-lata", quantity: 1 },
            { sku: "x-simples", quantity: 2 },
          ],
        };
        const round = await requestAs(server, admin, `/tabs/${tab.body.id}/rounds`, {
          method: "POST",
          headers: { "Idempotency-Key": roundKey },
          body: roundBody,
        });
        assert.equal(round.status, 201);
        const roundReplay = await requestAs(server, admin, `/tabs/${tab.body.id}/rounds`, {
          method: "POST",
          headers: { "Idempotency-Key": roundKey },
          body: { items: [...roundBody.items].reverse(), reason: null },
        });
        assert.equal(roundReplay.status, 201);
        assert.equal(roundReplay.body.id, round.body.id);
        assert.equal(
          (
            await requestAs(server, admin, `/tabs/${tab.body.id}/rounds`, {
              method: "POST",
              headers: { "Idempotency-Key": roundKey },
              body: { items: [{ sku: "x-simples", quantity: 1 }] },
            })
          ).status,
          409,
        );

        const itemId = round.body.items.find((item) => item.sku === "x-simples").id;
        const cancelKey = "p06-cancel";
        const cancelBody = { reason: "erro do cliente", items: [{ itemId, quantity: 1 }] };
        const cancellation = await requestAs(
          server,
          admin,
          `/tabs/${tab.body.id}/rounds/${round.body.id}/cancellations`,
          {
            method: "POST",
            headers: { "Idempotency-Key": cancelKey },
            body: cancelBody,
          },
        );
        assert.equal(cancellation.status, 201);
        const cancellationReplay = await requestAs(
          server,
          admin,
          `/tabs/${tab.body.id}/rounds/${round.body.id}/cancellations`,
          {
            method: "POST",
            headers: { "Idempotency-Key": cancelKey },
            body: { items: [{ quantity: 1, itemId }], reason: "erro do cliente" },
          },
        );
        assert.equal(cancellationReplay.status, 201);
        assert.equal(cancellationReplay.body.id, cancellation.body.id);
        const cancellationDivergent = await requestAs(
          server,
          admin,
          `/tabs/${tab.body.id}/rounds/${round.body.id}/cancellations`,
          {
            method: "POST",
            headers: { "Idempotency-Key": cancelKey },
            body: { ...cancelBody, reason: "outro motivo" },
          },
        );
        assert.equal(cancellationDivergent.status, 409);

        await pool.query(
          `INSERT INTO orders (
             id, idempotency_key, source, status, customer_name, fulfillment_mode, total, items
           ) VALUES (
             'p06-legacy-order', 'p06-legacy-key', 'counter', 'confirmed',
             'Legado', 'pickup', 0, '[]'::jsonb
           )`,
        );
        const legacy = await requestAs(server, admin, "/orders", {
          method: "POST",
          headers: { "Idempotency-Key": "p06-legacy-key" },
          body: { items: [{ sku: "x-simples", quantity: 1 }] },
        });
        assert.equal(legacy.status, 409);
        assert.equal(legacy.body.code, "legacy_idempotency_unverifiable");

        await pool.query(
          `INSERT INTO orders (
             id, source, status, customer_name, fulfillment_mode, delivery_address, total, items
           ) VALUES (
             'p06-integrated-order', 'ifood', 'received', 'Integrado',
             'delivery', 'Rua P06', 10, '[]'::jsonb
           );
           INSERT INTO channel_mappings (
             id, order_id, channel, merchant_id, external_id
           ) VALUES (
             'p06-integrated-mapping', 'p06-integrated-order', 'ifood',
             'merchant-p06', 'external-p06'
           )`,
        );
        const integrated = await createOrderAction(
          "p06-integrated-order",
          "cancel",
          { reasonId: "501" },
          "p06-integrated-cancel",
          db,
        );
        assert.equal(integrated.repeated, false);
        const integratedReplay = await createOrderAction(
          "p06-integrated-order",
          "cancel",
          { reasonId: "501" },
          "p06-integrated-cancel",
          db,
        );
        assert.equal(integratedReplay.repeated, true);
        await assert.rejects(
          createOrderAction(
            "p06-integrated-order",
            "cancel",
            { reasonId: "502" },
            "p06-integrated-cancel",
            db,
          ),
          (error) => error.statusCode === 409,
        );

        const concurrentKey = "p06-concurrent";
        const beforeEvents = Number(
          (await pool.query("SELECT COUNT(*) FROM channel_events")).rows[0].count,
        );
        const concurrentRequests = await Promise.all([
          requestAs(server, admin, "/orders", {
            method: "POST",
            headers: { "Idempotency-Key": concurrentKey },
            body: { customerName: "Concorrente", items: [{ sku: "x-simples", quantity: 1 }] },
          }),
          requestAs(server, admin, "/orders", {
            method: "POST",
            headers: { "Idempotency-Key": concurrentKey },
            body: { items: [{ quantity: 1, sku: "x-simples" }], customerName: "Concorrente" },
          }),
        ]);
        assert.deepEqual(
          concurrentRequests.map((item) => item.status),
          [201, 201],
        );
        assert.equal(concurrentRequests[0].body.id, concurrentRequests[1].body.id);
        assert.equal(
          Number(
            (
              await pool.query("SELECT COUNT(*) FROM orders WHERE idempotency_key = $1", [
                concurrentKey,
              ])
            ).rows[0].count,
          ),
          1,
        );
        assert.equal(
          Number(
            (
              await pool.query(
                `SELECT COUNT(*) FROM stock_movements
           WHERE order_id = (SELECT id FROM orders WHERE idempotency_key = $1) AND reason = 'sale'`,
                [concurrentKey],
              )
            ).rows[0].count,
          ),
          1,
        );
        assert.equal(
          Number(
            (
              await pool.query(
                `SELECT COUNT(*) FROM print_jobs
           WHERE order_id = (SELECT id FROM orders WHERE idempotency_key = $1)`,
                [concurrentKey],
              )
            ).rows[0].count,
          ),
          1,
        );
        assert.equal(
          Number((await pool.query("SELECT COUNT(*) FROM channel_events")).rows[0].count),
          beforeEvents,
        );
      } finally {
        await stopServer(server);
      }
    });

    test("fluxos manuais e integrados permanecem isolados por mapping e fallback legado", async () => {
      await resetBaseline();
      const server = await startServer();
      const _admin = await adminSession(server);
      try {
        const admin = await adminSession(server);
        const before = await countOperationalRows();
        for (const source of ["ifood", "deliverymuch"]) {
          const response = await requestAs(server, admin, "/orders", {
            method: "POST",
            headers: { "Idempotency-Key": `p08-reject-${source}` },
            body: {
              source,
              fulfillmentMode: "delivery",
              deliveryAddress: "Rua externa",
              items: [{ sku: "x-simples", quantity: 1 }],
            },
          });
          assert.equal(response.status, 400);
          assert.equal(response.body.code, "EXTERNAL_SOURCE_REQUIRES_ADAPTER");
          assert.equal(
            Number(
              (
                await pool.query(
                  "SELECT COUNT(*) FROM idempotency_records WHERE idempotency_key = $1",
                  [`p08-reject-${source}`],
                )
              ).rows[0].count,
            ),
            0,
          );
        }
        assert.deepEqual(await countOperationalRows(), before);

        await pool.query(`
          INSERT INTO orders (
            id, source, status, customer_name, fulfillment_mode, total, items
          ) VALUES
            ('p08-mapped', 'counter', 'received', 'Mapped', 'pickup', 0, '[]'::jsonb),
            ('p08-legacy', 'ifood', 'received', 'Legacy', 'pickup', 0, '[]'::jsonb);
          INSERT INTO channel_mappings (
            id, order_id, channel, merchant_id, external_id
          ) VALUES (
            'p08-mapping', 'p08-mapped', 'ifood', 'merchant-p08', 'external-p08'
          );
        `);
        for (const id of ["p08-mapped", "p08-legacy"]) {
          const blocked = await requestAs(server, admin, `/orders/${id}/status`, {
            method: "PATCH",
            body: { status: "confirmed" },
          });
          assert.equal(blocked.status, 409, `${JSON.stringify(blocked.body)}\n${server.output()}`);
          assert.equal(blocked.body.code, "INTEGRATED_FLOW_REQUIRED");
          assert.equal(
            (await pool.query("SELECT status FROM orders WHERE id = $1", [id])).rows[0].status,
            "received",
          );
        }

        assert.equal(
          (
            await requestAs(server, admin, "/inventory/xis/adjustments", {
              method: "POST",
              headers: { "Idempotency-Key": "p08-stock" },
              body: { delta: 3, reason: "setup manual" },
            })
          ).status,
          201,
        );
        for (const source of ["counter", "whatsapp", "olaclick"]) {
          const manual = await requestAs(server, admin, "/orders", {
            method: "POST",
            headers: { "Idempotency-Key": `p08-manual-${source}` },
            body: { source, items: [{ sku: "x-simples", quantity: 1 }] },
          });
          assert.equal(manual.status, 201, source);
          assert.equal(manual.body.hasChannelMapping, false);
        }
      } finally {
        await stopServer(server);
      }
    });

    test("cancelamento tardio em rodada preserva saldo e registra perda auditável", async () => {
      await resetBaseline();
      const server = await startServer();
      try {
        const admin = await adminSession(server);
        assert.equal(
          (
            await requestAs(server, admin, "/inventory/xis/adjustments", {
              method: "POST",
              headers: { "Idempotency-Key": "h05-setup-stock" },
              body: { delta: 5, reason: "carga para cancelamento tardio" },
            })
          ).status,
          201,
        );

        const createdTab = await requestAs(server, admin, "/tabs", {
          method: "POST",
          body: { label: "H05-preparo" },
        });
        assert.equal(createdTab.status, 201);

        const round = await requestAs(server, admin, `/tabs/${createdTab.body.id}/rounds`, {
          method: "POST",
          headers: { "Idempotency-Key": "h05-round" },
          body: { items: [{ sku: "x-simples", quantity: 1 }] },
        });
        assert.equal(round.status, 201, `${JSON.stringify(round.body)}\n${server.output()}`);

        assert.equal(
          (
            await requestAs(server, admin, `/orders/${round.body.id}/status`, {
              method: "PATCH",
              body: { status: "in_preparation" },
            })
          ).status,
          200,
        );

        const balanceBeforeCancellation = Number(
          (await pool.query("SELECT quantity FROM stock_balances WHERE category = 'xis'")).rows[0]
            .quantity,
        );

        const cancelled = await requestAs(
          server,
          admin,
          `/tabs/${createdTab.body.id}/rounds/${round.body.id}/cancellations`,
          {
            method: "POST",
            headers: { "Idempotency-Key": "h05-cancel" },
            body: {
              items: [{ itemId: round.body.items[0].id, quantity: 1 }],
              reason: "cancelamento após preparo",
            },
          },
        );
        assert.equal(
          cancelled.status,
          201,
          `${JSON.stringify(cancelled.body)}\n${server.output()}`,
        );

        const balanceAfterCancellation = Number(
          (await pool.query("SELECT quantity FROM stock_balances WHERE category = 'xis'")).rows[0]
            .quantity,
        );
        assert.equal(balanceAfterCancellation, balanceBeforeCancellation);

        const lossMovements = await pool.query(
          `SELECT delta, reason, metadata
             FROM stock_movements
            WHERE order_id = $1 AND category = 'xis'`,
          [cancelled.body.id],
        );
        assert.equal(lossMovements.rowCount, 1);
        assert.equal(lossMovements.rows[0].reason, "cancellation_loss");
        assert.equal(Number(lossMovements.rows[0].delta), 0);
        assert.equal(Number(lossMovements.rows[0].metadata.lostQuantity), 1);
        assert.equal(lossMovements.rows[0].metadata.roundKind, "cancellation");

        await assert.rejects(
          pool.query(
            `INSERT INTO stock_movements (id, category, delta, reason, metadata)
             VALUES ('h05-invalid-zero', 'xis', 0, 'manual_zero', '{}'::jsonb)`,
          ),
          (error) => {
            assert.equal(error.code, "23514");
            assert.match(error.message, /stock_movements_delta_check/);
            return true;
          },
        );
      } finally {
        await stopServer(server);
      }
    });

    test("outbox executa HTTP fora da transacao, possui lease e reconcilia sem reenvio", async () => {
      await resetBaseline();
      await insertOrder(pool, "p10-order");
      async function insertCommand(id) {
        await pool.query(
          `INSERT INTO channel_commands (
           id, order_id, channel, action, idempotency_key, payload, status,
             correlation_id, next_attempt_at
           ) VALUES (
             $1, 'p10-order', 'fake', 'accept', $1, $2::jsonb, 'pending', $1,
             NOW() - INTERVAL '1 second'
           )`,
          [id, JSON.stringify({ externalOrderId: `external-${id}` })],
        );
      }

      const { AsyncLocalStorage } = await import("node:async_hooks");
      const txAls = new AsyncLocalStorage();
      const trackedDb = {
        async transaction(work) {
          return db.transaction(async (client) => {
            return txAls.run(true, () => work(client));
          });
        },
      };
      let sends = 0;
      let reconciliations = 0;
      const adapter = {
        channel: "fake",
        async sendCommand(command) {
          assert.equal(txAls.getStore() || false, false, "HTTP/send fora da transacao");
          assert.equal(command.correlationId, command.id);
          sends += 1;
        },
        async reconcileCommand() {
          assert.equal(txAls.getStore() || false, false, "HTTP/reconcile fora da transacao");
          reconciliations += 1;
          return { state: "applied", externalStatus: "accepted" };
        },
        async finalizeCommand(_command, _client, { reconciled }) {
          return {
            status: "completed",
            completedAt: new Date().toISOString(),
            lastHttpStatus: 200,
            ...(reconciled ? { reconciledAt: new Date().toISOString() } : {}),
          };
        },
      };

      await insertCommand("p10-concurrent");
      await Promise.all([
        processChannelCommands({ db: trackedDb, adapter, workerId: "worker-a", limit: 1 }),
        processChannelCommands({ db: trackedDb, adapter, workerId: "worker-b", limit: 1 }),
      ]);
      assert.equal(sends, 1);
      assert.equal(
        (await pool.query("SELECT status FROM channel_commands WHERE id = 'p10-concurrent'"))
          .rows[0].status,
        "completed",
      );

      await insertCommand("p10-finalize-failure");
      let transactions = 0;
      const failingFinalizeDb = {
        async transaction(work) {
          transactions += 1;
          if (transactions === 2) {
            return db.transaction(async () => {
              throw new Error("falha apos aceite");
            });
          }
          return trackedDb.transaction(work);
        },
      };
      await assert.rejects(
        processChannelCommands({
          db: failingFinalizeDb,
          adapter,
          workerId: "worker-crash",
          limit: 1,
        }),
        /falha apos aceite/,
      );
      assert.equal(sends, 2);
      assert.equal(
        (await pool.query("SELECT status FROM channel_commands WHERE id = 'p10-finalize-failure'"))
          .rows[0].status,
        "processing",
      );
      await pool.query(
        `UPDATE channel_commands
         SET lease_expires_at = NOW() - INTERVAL '1 second'
         WHERE id = 'p10-finalize-failure'`,
      );
      await processChannelCommands({
        db: trackedDb,
        adapter,
        workerId: "worker-reconcile",
        limit: 1,
      });
      assert.equal(sends, 2, "resultado ambiguo nao foi reenviado");
      assert.equal(reconciliations, 1);
      assert.equal(
        (await pool.query("SELECT status FROM channel_commands WHERE id = 'p10-finalize-failure'"))
          .rows[0].status,
        "completed",
      );

      await insertCommand("p10-http-401");
      const sendsBefore401 = sends;
      const unauthorizedAdapter = {
        ...adapter,
        async sendCommand(command) {
          assert.equal(txAls.getStore() || false, false);
          assert.equal(command.id, "p10-http-401");
          sends += 1;
          const error = new Error("credencial expirada");
          error.statusCode = 401;
          throw error;
        },
      };
      await processChannelCommands({
        db: trackedDb,
        adapter: unauthorizedAdapter,
        workerId: "worker-401",
        limit: 1,
      });
      assert.equal(
        (await pool.query("SELECT status FROM channel_commands WHERE id = 'p10-http-401'")).rows[0]
          .status,
        "ambiguous",
      );
      await pool.query(
        "UPDATE channel_commands SET next_attempt_at = NOW() WHERE id = 'p10-http-401'",
      );
      await processChannelCommands({
        db: trackedDb,
        adapter: unauthorizedAdapter,
        workerId: "worker-401-reconcile",
        limit: 1,
      });
      assert.equal(sends, sendsBefore401 + 1, "HTTP 401 não causou reenvio cego");
      assert.equal(
        (await pool.query("SELECT status FROM channel_commands WHERE id = 'p10-http-401'")).rows[0]
          .status,
        "completed",
      );

      await insertCommand("p10-ownership");
      await db.transaction(async (client) => {
        await client.query(
          `UPDATE channel_commands
           SET status = 'processing', lease_owner = 'owner-certo',
               lease_expires_at = NOW() + INTERVAL '1 minute'
           WHERE id = 'p10-ownership'`,
        );
      });
      await assert.rejects(
        db.transaction((client) =>
          updateOwnedChannelCommand(
            "p10-ownership",
            "owner-errado",
            { status: "completed", completedAt: new Date().toISOString() },
            client,
          ),
        ),
        (error) => error.code === "COMMAND_LEASE_LOST",
      );

      await insertCommand("p11-watchdog");
      await pool.query(
        `UPDATE channel_commands
         SET status = 'awaiting_event', attempts = 1,
             event_deadline_at = NOW() - INTERVAL '1 second'
         WHERE id = 'p11-watchdog'`,
      );
      const inconclusiveAdapter = {
        ...adapter,
        async reconcileCommand() {
          return { state: "unknown", reason: "sem confirmação externa" };
        },
      };
      await processChannelCommands({
        db: trackedDb,
        adapter: inconclusiveAdapter,
        workerId: "watchdog-1",
        limit: 1,
      });
      assert.deepEqual(
        (
          await pool.query(
            "SELECT status, attempts FROM channel_commands WHERE id = 'p11-watchdog'",
          )
        ).rows[0],
        { status: "ambiguous", attempts: 2 },
      );
      await pool.query(
        "UPDATE channel_commands SET next_attempt_at = NOW() WHERE id = 'p11-watchdog'",
      );
      await processChannelCommands({
        db: trackedDb,
        adapter: inconclusiveAdapter,
        workerId: "watchdog-2",
        limit: 1,
      });
      assert.deepEqual(
        (
          await pool.query(
            "SELECT status, attempts FROM channel_commands WHERE id = 'p11-watchdog'",
          )
        ).rows[0],
        { status: "dead_letter", attempts: 3 },
      );
    });

    test("integridade financeira, turno, ajustes idempotentes e adapter off", async () => {
      await resetBaseline();
      const server = await startServer();
      async function insertReadyOrder(id, total, paymentMethod = "cash", source = "counter") {
        await pool.query(
          `INSERT INTO orders (
             id, source, status, customer_name, fulfillment_mode,
             payment_method, total, items
           ) VALUES ($1, $4, 'ready', $1, 'pickup', $3, $2, '[]'::jsonb)`,
          [id, total, paymentMethod, source],
        );
      }
      try {
        const admin = await adminSession(server);
        await insertReadyOrder("p03-sale", 100);
        const noShift = await requestAs(server, admin, "/orders/p03-sale/status", {
          method: "PATCH",
          body: { status: "completed" },
        });
        assert.equal(noShift.status, 409);
        assert.equal(noShift.body.code, "CASH_SHIFT_REQUIRED");
        assert.equal(
          (await pool.query("SELECT status FROM orders WHERE id = 'p03-sale'")).rows[0].status,
          "ready",
        );
        assert.equal(
          Number(
            (await pool.query("SELECT COUNT(*) FROM finance_entries WHERE order_id = 'p03-sale'"))
              .rows[0].count,
          ),
          0,
        );

        const opened = await requestAs(server, admin, "/cash-shifts/open", {
          method: "POST",
          body: { openingAmount: 0, notes: "turno p03" },
        });
        assert.equal(opened.status, 201);
        assert.equal(
          (
            await requestAs(server, admin, "/orders/p03-sale/status", {
              method: "PATCH",
              body: { status: "completed" },
            })
          ).status,
          200,
        );
        const saleEntry = (
          await pool.query(
            "SELECT * FROM finance_entries WHERE order_id = 'p03-sale' AND type = 'sale'",
          )
        ).rows[0];
        assert.equal(saleEntry.shift_id, opened.body.id);
        assert.equal(Number(saleEntry.amount), 100);

        const blockedDiscount = await requestAs(server, admin, "/orders/p03-sale/discount", {
          method: "PATCH",
          body: { discountPercent: 50 },
        });
        assert.equal(blockedDiscount.status, 409);
        assert.equal(blockedDiscount.body.code, "FINANCIAL_EFFECT_IMMUTABLE");
        assert.equal(
          Number(
            (await pool.query("SELECT total FROM orders WHERE id = 'p03-sale'")).rows[0].total,
          ),
          100,
        );

        assert.equal(
          (
            await requestAs(server, admin, "/orders/p03-sale/status", {
              method: "PATCH",
              body: { status: "cancelled", reason: "cliente" },
            })
          ).status,
          400,
        );
        const manualCancelRace = await Promise.all(
          [0, 1].map(() =>
            requestAs(server, admin, "/orders/p03-sale/status", {
              method: "PATCH",
              headers: { "Idempotency-Key": "p06-manual-cancel" },
              body: { status: "cancelled", reason: "cliente" },
            }),
          ),
        );
        assert.deepEqual(
          manualCancelRace.map((response) => response.status),
          [200, 200],
        );
        assert.equal(
          (
            await requestAs(server, admin, "/orders/p03-sale/status", {
              method: "PATCH",
              headers: { "Idempotency-Key": "p06-manual-cancel" },
              body: { status: "cancelled", reason: "outro motivo" },
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await requestAs(server, admin, "/orders/p03-sale/status", {
              method: "PATCH",
              headers: { "Idempotency-Key": "p06-manual-cancel-new-key" },
              body: { status: "cancelled" },
            })
          ).status,
          200,
        );
        const ledger = await pool.query(
          `SELECT type, amount, shift_id FROM finance_entries
           WHERE order_id = 'p03-sale' ORDER BY occurred_at`,
        );
        assert.deepEqual(
          ledger.rows.map((row) => Number(row.amount)),
          [100, -100],
        );
        assert.equal(
          ledger.rows.every((row) => row.shift_id === opened.body.id),
          true,
        );
        assert.equal(
          ledger.rows.reduce((sum, row) => sum + Number(row.amount), 0),
          0,
        );
        assert.equal(
          (
            await requestAs(server, admin, "/orders/p03-sale/discount", {
              method: "PATCH",
              body: { discountPercent: 10 },
            })
          ).status,
          409,
        );

        await insertReadyOrder("p03-race", 80);
        const race = await Promise.all([
          requestAs(server, admin, "/orders/p03-race/discount", {
            method: "PATCH",
            body: { discountPercent: 50 },
          }),
          requestAs(server, admin, "/orders/p03-race/status", {
            method: "PATCH",
            body: { status: "completed" },
          }),
        ]);
        assert.ok(race.some((response) => response.status === 200));
        const raceOrder = (
          await pool.query("SELECT total, status FROM orders WHERE id = 'p03-race'")
        ).rows[0];
        const raceSale = (
          await pool.query(
            "SELECT amount FROM finance_entries WHERE order_id = 'p03-race' AND type = 'sale'",
          )
        ).rows[0];
        assert.equal(Number(raceSale.amount), Number(raceOrder.total));
        assert.equal(raceOrder.status, "completed");

        for (const [id, method] of [
          ["p04-pix", "pix"],
          ["p04-credit", "credit_card"],
          ["p04-debit", "debit_card"],
        ]) {
          await insertReadyOrder(id, 10, method);
          assert.equal(
            (
              await requestAs(server, admin, `/orders/${id}/status`, {
                method: "PATCH",
                body: { status: "completed" },
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await pool.query(
                "SELECT shift_id FROM finance_entries WHERE order_id = $1 AND type = 'sale'",
                [id],
              )
            ).rows[0].shift_id,
            opened.body.id,
          );
        }

        await insertReadyOrder("p04-close-race", 30);
        const closeRace = await Promise.all([
          requestAs(server, admin, `/cash-shifts/${opened.body.id}/close`, {
            method: "POST",
            body: { declaredAmount: 0 },
          }),
          requestAs(server, admin, "/orders/p04-close-race/status", {
            method: "PATCH",
            body: { status: "completed" },
          }),
        ]);
        assert.ok(closeRace.every((response) => [200, 409].includes(response.status)));
        const closeRaceSale = await pool.query(
          "SELECT shift_id FROM finance_entries WHERE order_id = 'p04-close-race' AND type = 'sale'",
        );
        if (closeRaceSale.rows[0]) assert.equal(closeRaceSale.rows[0].shift_id, opened.body.id);

        const adjustmentShift = await requestAs(server, admin, "/cash-shifts/open", {
          method: "POST",
          body: { openingAmount: 0, notes: "turno p07" },
        });
        assert.equal(adjustmentShift.status, 201);
        assert.equal(
          (
            await requestAs(server, admin, `/cash-shifts/${adjustmentShift.body.id}/adjustments`, {
              method: "POST",
              body: { kind: "reinforcement", amount: 10, reason: "troco" },
            })
          ).status,
          400,
        );

        const adjustmentOptions = {
          method: "POST",
          headers: { "Idempotency-Key": "p07-adjustment" },
          body: { kind: "reinforcement", amount: 10, reason: "troco" },
        };
        const adjustment = await requestAs(
          server,
          admin,
          `/cash-shifts/${adjustmentShift.body.id}/adjustments`,
          adjustmentOptions,
        );
        const adjustmentReplay = await requestAs(
          server,
          admin,
          `/cash-shifts/${adjustmentShift.body.id}/adjustments`,
          adjustmentOptions,
        );
        assert.equal(adjustment.status, 200);
        assert.equal(adjustmentReplay.status, 200);
        assert.equal(adjustmentReplay.body.entry.id, adjustment.body.entry.id);
        assert.equal(
          Number(
            (
              await pool.query("SELECT COUNT(*) FROM finance_entries WHERE id = $1", [
                adjustment.body.entry.id,
              ])
            ).rows[0].count,
          ),
          1,
        );
        assert.equal(
          (
            await requestAs(server, admin, `/cash-shifts/${adjustmentShift.body.id}/adjustments`, {
              ...adjustmentOptions,
              body: { ...adjustmentOptions.body, reason: "outro" },
            })
          ).status,
          409,
        );

        const concurrentAdjustments = await Promise.all([
          requestAs(server, admin, `/cash-shifts/${adjustmentShift.body.id}/adjustments`, {
            method: "POST",
            headers: { "Idempotency-Key": "p07-concurrent" },
            body: { kind: "withdrawal", amount: 5, reason: "sangria" },
          }),
          requestAs(server, admin, `/cash-shifts/${adjustmentShift.body.id}/adjustments`, {
            method: "POST",
            headers: { "Idempotency-Key": "p07-concurrent" },
            body: { reason: "sangria", amount: 5, kind: "withdrawal" },
          }),
        ]);
        assert.deepEqual(
          concurrentAdjustments.map((response) => response.status),
          [200, 200],
        );
        assert.equal(
          concurrentAdjustments[0].body.entry.id,
          concurrentAdjustments[1].body.entry.id,
        );
        assert.equal(
          Number(
            (
              await pool.query(
                `SELECT COUNT(*) FROM finance_entries
           WHERE shift_id = $1 AND type IN ('cash_reinforcement', 'cash_withdrawal')`,
                [adjustmentShift.body.id],
              )
            ).rows[0].count,
          ),
          2,
        );

        const currentShift = (
          await pool.query("SELECT expected_amount FROM cash_shifts WHERE id = $1", [
            adjustmentShift.body.id,
          ])
        ).rows[0];
        assert.equal(Number(currentShift.expected_amount), 5);
        assert.equal(
          (
            await requestAs(server, admin, `/cash-shifts/${adjustmentShift.body.id}/close`, {
              method: "POST",
              body: { declaredAmount: 5 },
            })
          ).status,
          200,
        );
        const nextShift = await requestAs(server, admin, "/cash-shifts/open", {
          method: "POST",
          body: { openingAmount: 0 },
        });
        assert.equal(
          (
            await requestAs(server, admin, `/cash-shifts/${nextShift.body.id}/adjustments`, {
              method: "POST",
              headers: { "Idempotency-Key": "p07-adjustment" },
              body: { kind: "reinforcement", amount: 10, reason: "troco" },
            })
          ).status,
          409,
        );

        await pool.query(`
          INSERT INTO orders (
            id, source, status, customer_name, fulfillment_mode, total, items
          ) VALUES (
            'p09-order', 'ifood', 'received', 'Adapter Off', 'pickup', 0, '[]'::jsonb
          );
          INSERT INTO channel_mappings (
            id, order_id, channel, merchant_id, external_id, sync_status
          ) VALUES (
            'p09-mapping', 'p09-order', 'ifood', 'merchant-p09',
            'external-p09', 'synchronized'
          );
        `);
        const commandsBefore = Number(
          (await pool.query("SELECT COUNT(*) FROM channel_commands")).rows[0].count,
        );
        const adapterOff = await requestAs(server, admin, "/orders/p09-order/accept", {
          method: "POST",
          headers: { "Idempotency-Key": "p09-off" },
          body: {},
        });
        assert.equal(adapterOff.status, 503);
        assert.equal(adapterOff.body.code, "ADAPTER_DISABLED");
        assert.equal(
          Number((await pool.query("SELECT COUNT(*) FROM channel_commands")).rows[0].count),
          commandsBefore,
        );
        assert.equal(
          (await pool.query("SELECT sync_status FROM channel_mappings WHERE id = 'p09-mapping'"))
            .rows[0].sync_status,
          "synchronized",
        );
        assert.equal(
          (await requestAs(server, admin, "/orders/p09-order/cancellation-reasons")).status,
          503,
        );
        const diagnostic = await requestAs(server, admin, "/integrations/status");
        assert.equal(diagnostic.status, 200);
        assert.equal(diagnostic.body.channels.ifood.enabled, false);
        assert.equal(diagnostic.body.simulation, false);
      } finally {
        await stopServer(server);
      }
    });

    test("anonimizacao LGPD remove canarios, limpa spool e expõe pendencia sem sucesso falso", async () => {
      await resetBaseline();
      const bridge = await startPrintBridge();
      const server = await startServer({
        PRINT_BRIDGE_URL: bridge.base,
        PRINT_BRIDGE_TOKEN: "privacy-test-token",
      });
      const canary = "LGPD-CANARY-42";
      try {
        const itemsFixture = JSON.stringify([
          { id: "line-lgpd", name: canary, notes: canary, quantity: 1, price: 25 },
        ]);
        const metadataFixture = JSON.stringify({ canary, nested: { customer: canary } });
        const fixtureQueries = [
          [
            "INSERT INTO service_tabs (id, kind, label, customer_name, status) VALUES ('lgpd-tab', 'tab', 'LGPD', $1, 'open')",
            [canary],
          ],
          [
            "INSERT INTO cash_shifts (id, status, notes, opened_at) VALUES ('lgpd-shift', 'open', $1, NOW())",
            [canary],
          ],
          [
            `INSERT INTO orders (
             id, source, status, customer_name, fulfillment_mode, delivery_address,
             notes, total, items, metadata
           ) VALUES ('lgpd-order', 'ifood', 'received', $1, 'delivery', $1, $1, 25, $2::jsonb, $3::jsonb)`,
            [canary, itemsFixture, metadataFixture],
          ],
          [
            `INSERT INTO orders (
             id, source, status, customer_name, fulfillment_mode, total, items, metadata
           ) VALUES (
             'lgpd-isolated-order', 'ifood', 'received', 'isolated fixture',
             'pickup', 0, '[]'::jsonb, '{}'::jsonb
           )`,
            [],
          ],
          [
            `INSERT INTO finance_entries (
             id, order_id, shift_id, type, amount, payment_method, source, label,
             metadata, occurred_at
           ) VALUES ('lgpd-finance', 'lgpd-order', 'lgpd-shift', 'sale', 25, 'cash',
             'counter', $1, $2::jsonb, NOW())`,
            [canary, metadataFixture],
          ],
          [
            `INSERT INTO channel_mappings (
             id, order_id, channel, merchant_id, external_id, metadata
           ) VALUES ('lgpd-mapping', 'lgpd-order', 'ifood', $1, $1, $2::jsonb)`,
            [canary, metadataFixture],
          ],
          [
            `INSERT INTO channel_mappings (
             id, order_id, channel, merchant_id, external_id, metadata
           ) VALUES ('lgpd-mapping-merchant-only', 'lgpd-isolated-order', 'ifood',
             $1, 'external-without-canary', '{}'::jsonb)`,
            [canary],
          ],
          [
            `INSERT INTO channel_events (
             id, channel, external_event_id, merchant_id, external_order_id, event_type, payload
           ) VALUES (
             'lgpd-event', 'ifood', 'lgpd-event-original', 'lgpd-merchant-original',
             $1, 'PLACED', $2::jsonb
           )`,
            [canary, metadataFixture],
          ],
          [
            `INSERT INTO channel_events (
             id, channel, external_event_id, merchant_id, external_order_id, event_type, payload
           ) VALUES ('lgpd-event-id-only', 'ifood', $1, 'merchant-without-canary',
             'order-without-canary-1', 'PLACED', '{}'::jsonb)`,
            [canary],
          ],
          [
            `INSERT INTO channel_events (
             id, channel, external_event_id, merchant_id, external_order_id, event_type, payload
           ) VALUES ('lgpd-event-merchant-only', 'ifood', 'event-without-canary', $1,
             'order-without-canary-2', 'PLACED', '{}'::jsonb)`,
            [canary],
          ],
          [
            `INSERT INTO channel_commands (
             id, order_id, channel, action, idempotency_key, payload, status, next_attempt_at
           ) VALUES ('lgpd-command', 'lgpd-order', 'ifood', 'accept', 'lgpd-command-key',
             $1::jsonb, 'pending', NOW())`,
            [metadataFixture],
          ],
          [
            `INSERT INTO order_tab_assignments (
             id, idempotency_key, order_id, tab_id, round_number, normalized_payload
           ) VALUES ('lgpd-assignment', 'lgpd-assignment-key', 'lgpd-order', 'lgpd-tab', 1, $1::jsonb)`,
            [metadataFixture],
          ],
          [
            `INSERT INTO tab_payments (
             id, tab_id, shift_id, payment_method, amount_cents, idempotency_key, metadata
           ) VALUES ('lgpd-payment', 'lgpd-tab', 'lgpd-shift', 'cash', 100,
             'lgpd-payment-key', $1::jsonb)`,
            [metadataFixture],
          ],
          [
            `INSERT INTO stock_movements (
             id, category, delta, reason, order_id, metadata
           ) VALUES ('lgpd-stock', 'xis', 1, 'privacy-test', 'lgpd-order', $1::jsonb)`,
            [metadataFixture],
          ],
          [
            `INSERT INTO print_jobs (
             id, order_id, status, printer_name, content, metadata
           ) VALUES ('lgpd-print', 'lgpd-order', 'printed', 'test', $1, $2::jsonb)`,
            [canary, metadataFixture],
          ],
        ];
        const fixtureClient = await pool.connect();
        try {
          await fixtureClient.query("BEGIN");
          for (const [sql, values] of fixtureQueries) await fixtureClient.query(sql, values);
          await fixtureClient.query("COMMIT");
        } catch (error) {
          await fixtureClient.query("ROLLBACK");
          throw error;
        } finally {
          fixtureClient.release();
        }
        const spooled = await fetch(`${bridge.base}/print-jobs`, {
          method: "POST",
          headers: {
            authorization: "Bearer privacy-test-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            orderId: "lgpd-order",
            jobId: "lgpd-print",
            content: `Cliente: ${canary}`,
            printerName: "test",
          }),
        });
        assert.equal(spooled.status, 201);

        const admin = await adminSession(server);
        const anonymized = await requestAs(server, admin, "/lgpd/anonymize", {
          method: "POST",
          headers: { "Idempotency-Key": "lgpd-request-1" },
          body: { searchTerm: canary },
        });
        assert.equal(anonymized.status, 200);
        assert.equal(anonymized.body.success, true);
        assert.equal(anonymized.body.status, "completed");
        assert.equal(anonymized.body.externalCleanup, "completed");
        assert.equal(JSON.stringify(anonymized.body).includes(canary), false);

        const piiTables = [
          "orders",
          "service_tabs",
          "finance_entries",
          "channel_mappings",
          "channel_events",
          "channel_commands",
          "order_tab_assignments",
          "tab_payments",
          "stock_movements",
          "cash_shifts",
          "print_jobs",
        ];
        for (const table of piiTables) {
          const count = await pool.query(
            `SELECT COUNT(*)::int count FROM ${table}
             WHERE POSITION(LOWER($1) IN LOWER(row_to_json(${table})::text)) > 0`,
            [canary],
          );
          assert.equal(count.rows[0].count, 0, table);
        }
        assert.doesNotMatch(
          await readFile(join(bridge.spoolDir, "lgpd-order-lgpd-print.txt"), "utf8"),
          new RegExp(canary, "i"),
        );

        const replay = await requestAs(server, admin, "/lgpd/anonymize", {
          method: "POST",
          headers: { "Idempotency-Key": "lgpd-request-1" },
          body: { searchTerm: canary },
        });
        assert.equal(replay.status, 200);
        assert.equal(replay.body.repeated, true);
        assert.equal(
          (
            await requestAs(server, admin, "/lgpd/anonymize", {
              method: "POST",
              headers: { "Idempotency-Key": "lgpd-request-1" },
              body: { searchTerm: "OUTRO-CANARY" },
            })
          ).status,
          409,
        );

        const rollbackCanary = "LGPD-ROLLBACK-CANARY";
        await pool.query(
          `INSERT INTO orders (
             id, source, status, customer_name, fulfillment_mode, total, items
           ) VALUES (
             'lgpd-rollback-order', 'counter', 'completed', $1, 'pickup', 5, '[]'::jsonb
           )`,
          [rollbackCanary],
        );
        await pool.query(
          `INSERT INTO finance_entries (
             id, order_id, type, amount, payment_method, source, label, metadata, occurred_at
           ) VALUES (
             'lgpd-rollback-finance', 'lgpd-rollback-order', 'sale', 5, 'cash',
             'counter', $1, jsonb_build_object('canary', $1::text), NOW()
           )`,
          [rollbackCanary],
        );
        await pool.query(
          `CREATE OR REPLACE FUNCTION lgpd_test_fail_update() RETURNS trigger AS $$
           BEGIN
             IF NEW.metadata::text LIKE '%DADO ANONIMIZADO%' THEN
               RAISE EXCEPTION 'falha lgpd injetada';
             END IF;
             RETURN NEW;
           END;
           $$ LANGUAGE plpgsql;
           CREATE TRIGGER lgpd_test_fail_update
             BEFORE UPDATE ON finance_entries
             FOR EACH ROW EXECUTE FUNCTION lgpd_test_fail_update()`,
        );
        const rolledBack = await requestAs(server, admin, "/lgpd/anonymize", {
          method: "POST",
          headers: { "Idempotency-Key": "lgpd-request-rollback" },
          body: { searchTerm: rollbackCanary },
        });
        assert.equal(rolledBack.status, 500);
        assert.equal(
          (await pool.query("SELECT customer_name FROM orders WHERE id = 'lgpd-rollback-order'"))
            .rows[0].customer_name,
          rollbackCanary,
        );
        assert.equal(
          Number(
            (
              await pool.query(
                "SELECT COUNT(*) FROM privacy_requests WHERE idempotency_key = 'lgpd-request-rollback'",
              )
            ).rows[0].count,
          ),
          0,
        );
        await pool.query(
          `DROP TRIGGER lgpd_test_fail_update ON finance_entries;
           DROP FUNCTION lgpd_test_fail_update()`,
        );

        await stopServer(bridge);
        const pendingCanary = "LGPD-PENDING-CANARY";
        await pool.query(
          `INSERT INTO orders (
             id, source, status, customer_name, fulfillment_mode, total, items
           ) VALUES (
             'lgpd-pending-order', 'counter', 'completed', $1, 'pickup', 1, '[]'::jsonb
           )`,
          [pendingCanary],
        );
        await pool.query(
          `INSERT INTO print_jobs (
             id, order_id, status, printer_name, content
           ) VALUES (
             'lgpd-pending-print', 'lgpd-pending-order', 'printed', 'test', $1
           )`,
          [pendingCanary],
        );
        const pending = await requestAs(server, admin, "/lgpd/anonymize", {
          method: "POST",
          headers: { "Idempotency-Key": "lgpd-request-pending" },
          body: { searchTerm: pendingCanary },
        });
        assert.equal(pending.status, 202);
        assert.equal(pending.body.success, false);
        assert.equal(pending.body.status, "pending_external_cleanup");
        assert.deepEqual(pending.body.pendingArtifacts, ["print_spool"]);
        assert.equal(
          (
            await pool.query(
              "SELECT status FROM privacy_requests WHERE idempotency_key = 'lgpd-request-pending'",
            )
          ).rows[0].status,
          "pending_external_cleanup",
        );
      } finally {
        await stopServer(server);
        await stopPrintBridge(bridge);
      }
    });
    test("M-02: conflito explícito para chave idempotente de versão defasada (v1)", async () => {
      await resetBaseline();
      const server = await startServer();
      const admin = await adminSession(server);

      try {
        await pool.query(
          `INSERT INTO idempotency_records (idempotency_key, operation, resource, fingerprint, canonical_version)
           VALUES ('legacy-key-v1', 'tab-round:create', 'tab:test', $1, 'v1')`,
          ["0".repeat(64)],
        );
        await pool.query(
          "INSERT INTO service_tabs (id, kind, label, status) VALUES ('test', 'tab', 'Mesa legado', 'open')",
        );

        const res = await requestAs(server, admin, "/tabs/test/rounds", {
          method: "POST",
          headers: { "Idempotency-Key": "legacy-key-v1" },
          body: { items: [{ sku: "refrigerante-lata", quantity: 1 }] },
        });

        assert.equal(res.status, 409);
        assert.equal(res.body.code, "idempotency_version_mismatch");
      } finally {
        await stopServer(server);
      }
    });

    test("troca de senha revoga todas as sessoes do usuario", async () => {
      const server = await startServer();
      try {
        const first = await adminSession(server);
        const second = await adminSession(server);
        const changed = await requestAs(server, first, "/auth/password", {
          method: "POST",
          body: {
            currentPassword: ADMIN_PASSWORD,
            newPassword: "postgres-test-admin-password-new",
          },
        });
        assert.equal(changed.status, 204);
        assert.equal((await requestAs(server, first, "/orders")).status, 401);
        assert.equal((await requestAs(server, second, "/orders")).status, 401);
        const replacement = await adminSession(server, "postgres-test-admin-password-new");
        assert.equal(replacement.status, 200);
        await requestAs(server, replacement, "/auth/password", {
          method: "POST",
          body: {
            currentPassword: "postgres-test-admin-password-new",
            newPassword: ADMIN_PASSWORD,
          },
        });
      } finally {
        await stopServer(server);
      }
    });

    test("boot real ausente/false não semeia; true falha; restart preserva sentinela e 14 tabelas", async () => {
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
      assert.equal(
        (await pool.query("SELECT COUNT(*)::int count FROM cash_shifts")).rows[0].count,
        0,
      );
      const restarted = await startServer({ AUTO_SEED: "false" });
      await stopServer(restarted);
      assert.deepEqual(await snapshot(), sentinel);
      const rejectedRestart = await startServer({ AUTO_SEED: "true" }, { expectFailure: true });
      assert.notEqual(rejectedRestart.exitCode, 0);
      assert.deepEqual(await snapshot(), sentinel);
    });

    test("preflight PostgreSQL persiste e recusa cada uma das 14 classes sem alteração", async () => {
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
        /Falha de teste injetada/,
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
      const holdFirst = new Promise((resolve) => {
        releaseFirst = resolve;
      });
      let firstReady;
      const ready = new Promise((resolve) => {
        firstReady = resolve;
      });
      const first = runSeedDemo(
        db,
        validOptions({
          onDecision: async () => {
            firstReady();
            await holdFirst;
          },
        }),
      );
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
      const holdSeed = new Promise((resolve) => {
        releaseSeed = resolve;
      });
      let seedReady;
      const seedAtBarrier = new Promise((resolve) => {
        seedReady = resolve;
      });
      const seed = runSeedDemo(
        db,
        validOptions({
          onDecision: async () => {
            seedReady();
            await holdSeed;
          },
        }),
      );
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
      const unauthenticated = await startServer();
      assert.equal((await postSeed(unauthenticated, { authenticated: false })).status, 401);
      assert.equal((await postSeed(unauthenticated, { password: "senha-incorreta" })).status, 401);
      await stopServer(unauthenticated);

      const production = await startServer({ APP_ENV: "production" });
      try {
        const res = await postSeed(production);
        if (res.status !== 403) {
          console.log("PRODUCTION SEED FAILED TO REJECT:", res);
          console.log("PRODUCTION STDOUT:", production.output());
        }
        assert.equal(res.status, 403);
      } finally {
        await stopServer(production);
      }

      const disabled = await startServer({ DEMO_SEED_ENABLED: "false" });
      assert.equal((await postSeed(disabled)).status, 403);
      await stopServer(disabled);

      const wrongTarget = await startServer({ DEMO_SEED_TARGET: "127.0.0.1:55432/outro_test" });
      assert.equal(
        (
          await postSeed(wrongTarget, {
            confirmTarget: "127.0.0.1:55432/outro_test",
          })
        ).status,
        422,
      );
      await stopServer(wrongTarget);

      const server = await startServer();
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
          error: "Falha interna ao executar seed.",
        });
        assert.doesNotMatch(
          failing.output(),
          /catalog_items_seed_test_hidden|postgres:\/\/|postgres-test-admin-token/,
        );
      } finally {
        await pool.query("ALTER TABLE catalog_items_seed_test_hidden RENAME TO catalog_items");
        await stopServer(failing);
      }
    });

    test("H-06: Auditoria Transacional garante idempotencia, autorizacao e rollback sem salvar logs orfãos", async () => {
      await resetBaseline();
      const server = await startServer();
      try {
        // 1. Autorização na rota
        const admin = await adminSession(server);
        const unauthorized = await requestAs(server, null, "/audit", { method: "GET" });
        assert.equal(unauthorized.status, 401);

        // 2. Transacionalidade e Falha Injetada
        // Vamos renomear audit_events para forçar a falha do INSERT do hook e ver se o transaction rollback da negócio atua
        await pool.query("ALTER TABLE audit_events RENAME TO audit_events_hidden");
        try {
          const brokenCreate = await requestAs(server, admin, "/catalog/items", {
            method: "POST",
            headers: { "Idempotency-Key": "h06-fail" },
            body: {
              sku: "h06-item",
              name: "H06 Fail",
              category: "Teste",
              price: 10,
              stockCategory: null,
              preparationMode: "kitchen",
            },
          });
          assert.equal(brokenCreate.status, 500); // Falhou pq auditEvents inseriu falhando a transação inteira

          // O item de negócio NÃO foi salvo no banco (rollback garantido)
          const search = await pool.query("SELECT * FROM catalog_items WHERE sku = 'h06-item'");
          assert.equal(search.rows.length, 0);
        } finally {
          await pool.query("ALTER TABLE audit_events_hidden RENAME TO audit_events");
        }

        // 3. Sanitização e Replay Idempotente
        const validCreate = await requestAs(server, admin, "/catalog/items", {
          method: "POST",
          headers: { "Idempotency-Key": "h06-valid" },
          body: {
            sku: "h06-valid-item",
            name: "H06 Valid",
            category: "Teste",
            price: 10,
            stockCategory: null,
            preparationMode: "kitchen",
          },
        });
        assert.equal(validCreate.status, 201);

        // Replay
        const replayCreate = await requestAs(server, admin, "/catalog/items", {
          method: "POST",
          headers: { "Idempotency-Key": "h06-valid" },
          body: {
            sku: "h06-valid-item",
            name: "H06 Valid",
            category: "Teste",
            price: 10,
            stockCategory: null,
            preparationMode: "kitchen",
          },
        });
        assert.equal(replayCreate.status, 201);

        // Consulta o log de auditoria
        const auditLog = await requestAs(server, admin, "/audit", { method: "GET" });
        assert.equal(auditLog.status, 200);

        // Assegurar que só existe UMA entrada para o catalog.item_added (replay ignorado)
        const adds = auditLog.body.items.filter(
          (i) => i.action === "catalog.item_added" && i.idempotency_key === "h06-valid",
        );
        assert.equal(adds.length, 1);
        assert.ok(adds[0].state_after);
        assert.equal(adds[0].state_after.sku, "h06-valid-item");
      } finally {
        await stopServer(server);
      }
    });
  });
}
