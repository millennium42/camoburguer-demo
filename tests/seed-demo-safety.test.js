import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import http from "node:http";
import test from "node:test";
import { CATALOG, CATALOG_CAPTURED_AT } from "@camoburguer/domain";
import { assertSafeAutoSeed } from "../apps/api/src/config.js";
import {
  DemoSeedRefusal,
  PROTECTED_TABLES,
  requestDemoSeed,
  runSeedDemo
} from "../scripts/seed-demo.mjs";

const TARGET = "127.0.0.1:5432/camoburguer_seed_test";
const OPERATIONAL_TABLES = PROTECTED_TABLES.filter(
  (table) => table !== "catalog_items" && table !== "stock_balances"
);

function catalogRows() {
  return CATALOG.map((item) => ({
    sku: item.sku,
    name: item.name,
    category: item.category,
    price: item.price,
    description: item.description,
    stock_category: item.stockCategory,
    allows_addons: item.allowsAddons,
    preparation_mode: item.preparationMode,
    available: item.available,
    origin: "olaclick_snapshot",
    source_version: CATALOG_CAPTURED_AT,
    archived_at: null
  }));
}

function fakeDb({ blocker = null } = {}) {
  const queries = [];
  const client = {
    async query(text) {
      const sql = String(text);
      queries.push(sql);
      if (sql.includes("current_database()")) {
        return {
          rows: [{ database: "camoburguer_seed_test", address: "127.0.0.1", port: 5432 }]
        };
      }
      const exists = sql.match(/SELECT 1 FROM ([a-z_]+)/);
      if (exists) return { rows: [{ present: blocker === exists[1] }] };
      if (sql.includes("FROM stock_balances ORDER BY category")) {
        return {
          rows: blocker === "stock_balances"
            ? [
                { category: "dog", quantity: 1 },
                { category: "hamburguer", quantity: 0 },
                { category: "xis", quantity: 0 }
              ]
            : [
                { category: "dog", quantity: 0 },
                { category: "hamburguer", quantity: 0 },
                { category: "xis", quantity: 0 }
              ]
        };
      }
      if (sql.includes("FROM catalog_items") && sql.includes("ORDER BY sku")) {
        const rows = catalogRows();
        if (blocker === "catalog_items") rows[0] = { ...rows[0], archived_at: new Date() };
        return { rows };
      }
      return { rows: [], rowCount: 0 };
    }
  };
  return {
    queries,
    async transaction(work) {
      return work(client);
    }
  };
}

function validOptions(overrides = {}) {
  return {
    authenticated: true,
    environment: "demo",
    enabled: true,
    expectedTarget: TARGET,
    confirmedTarget: TARGET,
    ...overrides
  };
}

test("boot aceita AUTO_SEED ausente/false e falha fechado para qualquer outro valor", () => {
  assert.doesNotThrow(() => assertSafeAutoSeed(undefined));
  assert.doesNotThrow(() => assertSafeAutoSeed("false"));
  assert.throws(() => assertSafeAutoSeed(""), /AUTO_SEED= é proibido/);
  assert.throws(() => assertSafeAutoSeed("true"), /AUTO_SEED=true é proibido/);
  assert.throws(() => assertSafeAutoSeed("TRUE"), /AUTO_SEED=TRUE é proibido/);
});

test("gates recusam antes de abrir transação", async () => {
  const cases = [
    [{ authenticated: false }, "admin_auth_invalid"],
    [{ environment: "production" }, "environment_not_demo"],
    [{ enabled: false }, "seed_disabled"],
    [{ expectedTarget: "" }, "expected_target_missing"],
    [{ expectedTarget: "postgres://user:secret@127.0.0.1:5432/test" }, "expected_target_invalid"]
  ];
  for (const [override, code] of cases) {
    const db = fakeDb();
    await assert.rejects(runSeedDemo(db, validOptions(override)), (error) => {
      assert.equal(error.code, code);
      return true;
    });
    assert.equal(db.queries.length, 0);
  }
});

test("alvo e confirmação divergentes recusam antes do lock e de mutações", async () => {
  for (const override of [
    { expectedTarget: "127.0.0.1:5432/outro" },
    { confirmedTarget: "127.0.0.1:5432/outro" }
  ]) {
    const db = fakeDb();
    await assert.rejects(runSeedDemo(db, validOptions(override)), DemoSeedRefusal);
    assert.equal(db.queries.some((sql) => sql.startsWith("LOCK TABLE")), false);
    assert.equal(db.queries.some((sql) => /\b(TRUNCATE|INSERT|UPDATE|DELETE)\b/.test(sql)), false);
  }
});

test("preflight cobre as 14 tabelas e recusa cada classe sem mutação", async () => {
  for (const blocker of PROTECTED_TABLES) {
    const db = fakeDb({ blocker });
    await assert.rejects(runSeedDemo(db, validOptions()), (error) => {
      assert.equal(error.code, "preflight_conflict");
      assert.deepEqual(error.details.blockers, [blocker]);
      return true;
    });
    assert.equal(
      db.queries.some((sql) => /\b(TRUNCATE|INSERT|UPDATE|DELETE)\b/.test(sql)),
      false,
      blocker
    );
  }
  assert.equal(OPERATIONAL_TABLES.length, 12);
});

test("baseline permitido bloqueia as 14 tabelas em ordem antes da primeira mutação", async () => {
  const db = fakeDb();
  await runSeedDemo(db, validOptions());
  const lockIndex = db.queries.findIndex((sql) => sql.startsWith("LOCK TABLE"));
  const mutationIndex = db.queries.findIndex((sql) => /\b(TRUNCATE|INSERT|UPDATE|DELETE)\b/.test(sql));
  assert.ok(lockIndex >= 0);
  assert.ok(mutationIndex > lockIndex);
  assert.equal(
    db.queries[lockIndex],
    `LOCK TABLE ${PROTECTED_TABLES.join(", ")} IN ACCESS EXCLUSIVE MODE`
  );
});

test("falha injetada após a primeira mutação propaga para rollback da transação", async () => {
  const base = fakeDb();
  let rolledBack = false;
  const db = {
    queries: base.queries,
    async transaction(work) {
      try {
        return await base.transaction(work);
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    }
  };
  await assert.rejects(
    runSeedDemo(db, validOptions({ injectFailureAfterFirstMutation: true })),
    /Falha de teste injetada/
  );
  assert.equal(db.queries.some((sql) => sql.includes("TRUNCATE TABLE")), true);
  assert.equal(rolledBack, true);
});

test("CLI direto é somente cliente HTTP e autentica sem enviar segredo ao seed", async () => {
  const source = await readFile(new URL("../scripts/seed-demo.mjs", import.meta.url), "utf8");
  const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.doesNotMatch(source, /DATABASE_URL|createRequire|new pg\.|pg\.Pool|pg\.Client/);
  assert.match(
    source,
    /from "\.\.\/packages\/domain\/index\.js"/,
    "o módulo copiado para /app/scripts deve resolver o domínio sem depender do node_modules da API"
  );
  assert.doesNotMatch(workflow, /-Atc \\"select host\(inet_server_addr\(\)\)/);
  assert.match(workflow, /-Atc "select host\(inet_server_addr\(\)\).*current_database\(\)"\)"/);

  let loginBody;
  let seedHeaders;
  const server = http.createServer((request, response) => {
    if (request.url === "/auth/login") {
      let body = "";
      request.on("data", (chunk) => { body += chunk; });
      request.on("end", () => {
        loginBody = JSON.parse(body);
        response.setHeader("set-cookie", [
          "camoburguer_session=sessao; Path=/; HttpOnly",
          "camoburguer_csrf=csrf; Path=/"
        ]);
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ csrfToken: "csrf" }));
      });
      return;
    }
    seedHeaders = request.headers;
    response.writeHead(403, { "content-type": "application/json" });
    response.end(JSON.stringify({ code: "admin_auth_invalid", error: "Identidade inválida." }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const child = spawn(process.execPath, [
    "scripts/seed-demo.mjs",
    `--confirm-target=${TARGET}`
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DEMO_API_URL: `http://127.0.0.1:${address.port}`,
      ADMIN_PASSWORD: "arbitrario-um",
      DATABASE_URL: "postgres://nao-deve-ser-usada"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const exitCode = await new Promise((resolve) => child.once("exit", resolve));
  await new Promise((resolve) => server.close(resolve));
  assert.equal(exitCode, 1, stderr);
  assert.deepEqual(loginBody, { username: "admin", password: "arbitrario-um" });
  assert.equal(seedHeaders.authorization, undefined);
  assert.equal(seedHeaders["x-csrf-token"], "csrf");
  assert.match(seedHeaders.cookie, /camoburguer_session=sessao/);
  assert.match(stderr, /admin_auth_invalid/);

  let call = 0;
  await assert.rejects(requestDemoSeed({
    apiBase: "http://127.0.0.1:1",
    password: "qualquer",
    confirmedTarget: TARGET,
    fetchImpl: async () => {
      call += 1;
      if (call === 1) {
        return new Response(JSON.stringify({ csrfToken: "csrf" }), {
          status: 200,
          headers: [
            ["content-type", "application/json"],
            ["set-cookie", "camoburguer_session=sessao; Path=/; HttpOnly"],
            ["set-cookie", "camoburguer_csrf=csrf; Path=/"]
          ]
        });
      }
      return new Response(
        JSON.stringify({ code: "admin_auth_invalid", error: "Inválido" }),
        { status: 403 }
      );
    }
  }), (error) => error.statusCode === 403 && error.code === "admin_auth_invalid");
});
