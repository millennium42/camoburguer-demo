import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  assertSafeSimulationBaseUrl,
  runSimulation
} from "../scripts/demo-simulator-client.mjs";

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

function happyApi() {
  const requests = [];
  let orderStatus = "confirmed";
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    requests.push({ path: parsed.pathname + parsed.search, method: options.method || "GET" });
    if (parsed.pathname === "/health") return json({ ok: true });
    if (parsed.pathname === "/auth/login") {
      return json({ csrfToken: "csrf-test" }, 200, { "set-cookie": "camoburguer_session=test; HttpOnly" });
    }
    if (parsed.pathname === "/catalog") {
      return json({ items: [{
        sku: "sku-atual",
        price: 10,
        available: true,
        archivedAt: null,
        stockCategory: null
      }] });
    }
    if (parsed.pathname === "/inventory") return json({ balances: [] });
    if (parsed.pathname === "/cash-shifts") return json({ items: [{ id: "shift-1", status: "open" }] });
    if (parsed.pathname === "/orders" && options.method === "POST") {
      return json({ id: "order-1", status: orderStatus }, 201);
    }
    if (parsed.pathname === "/orders/order-1/status") {
      orderStatus = JSON.parse(options.body).status;
      return json({ id: "order-1", status: orderStatus });
    }
    if (parsed.pathname === "/cash-shifts/shift-1/adjustments") {
      return json({ entry: { type: "cash_withdrawal" } });
    }
    if (parsed.pathname === "/orders" && (!options.method || options.method === "GET")) {
      return json({ items: [{ id: "order-1", status: orderStatus }] });
    }
    if (parsed.pathname === "/finance/entries") {
      return json({ items: [{ type: "cash_withdrawal", shiftId: "shift-1" }] });
    }
    return json({ error: "not found" }, 404);
  };
  return { fetchImpl, requests };
}

test("simulador conclui somente depois de verificar efeitos e nunca usa id ausente", async () => {
  const api = happyApi();
  const summary = await runSimulation({
    baseUrl: "http://127.0.0.1:3001",
    username: "admin",
    password: "secret",
    fetchImpl: api.fetchImpl
  });
  assert.equal(summary.ok, true);
  assert.equal(Object.values(summary.steps).every((step) => step.status === "completed"), true);
  assert.equal(api.requests.some((request) => /\/(?:undefined|null)(?:\/|$)/.test(request.path)), false);
  assert.equal(api.requests.at(-1).path, "/finance/entries?shiftId=shift-1");
});

test("falha HTTP interrompe dependentes e produz resumo verdadeiro", async () => {
  const api = happyApi();
  const fetchImpl = async (url, options) => {
    if (new URL(url).pathname === "/catalog") return json({ error: "indisponível" }, 503);
    return api.fetchImpl(url, options);
  };
  await assert.rejects(
    runSimulation({
      baseUrl: "http://localhost:3001",
      username: "admin",
      password: "secret",
      fetchImpl
    }),
    (error) => {
      assert.equal(error.summary.steps.catalog.status, "failed");
      assert.equal(error.summary.steps.order.status, "skipped");
      return /HTTP 503/.test(error.message);
    }
  );
  assert.equal(api.requests.some((request) => request.path === "/orders"), false);
});

test("resposta não JSON e timeout falham sem sucesso falso", async () => {
  const malformed = happyApi();
  await assert.rejects(
    runSimulation({
      baseUrl: "http://api:3001",
      username: "admin",
      password: "secret",
      fetchImpl: async (url, options) => new URL(url).pathname === "/catalog"
        ? new Response("<html>erro</html>", { status: 200 })
        : malformed.fetchImpl(url, options)
    }),
    /resposta não JSON/
  );
  await assert.rejects(
    runSimulation({
      baseUrl: "http://api:3001",
      username: "admin",
      password: "secret",
      fetchImpl: async () => { throw new Error("timeout"); }
    }),
    /falha de rede ou timeout/
  );
});

test("guard recusa produção e protocolos não HTTP antes da request", () => {
  assert.throws(() => assertSafeSimulationBaseUrl("https://api.exemplo.com"), /somente API local/);
  assert.throws(() => assertSafeSimulationBaseUrl("file:///tmp/api"), /somente API local/);
  assert.equal(assertSafeSimulationBaseUrl("http://host.docker.internal:3001"), "http://host.docker.internal:3001");
});

test("catálogo vazio ou sem SKU elegível interrompe antes do pedido", async () => {
  for (const mode of ["empty", "ineligible"]) {
    const api = happyApi();
    const fetchImpl = async (url, options) => {
      if (new URL(url).pathname === "/catalog") {
        return json({
          items: mode === "empty"
            ? []
            : [{ sku: "sem-estoque", price: 10, available: true, stockCategory: "xis" }]
        });
      }
      if (new URL(url).pathname === "/inventory") {
        return json({ balances: [{ category: "xis", quantity: 0 }] });
      }
      return api.fetchImpl(url, options);
    };
    await assert.rejects(
      runSimulation({
        baseUrl: "http://localhost:3001",
        username: "admin",
        password: "secret",
        fetchImpl
      }),
      (error) => {
        assert.equal(error.summary.steps.order.status, "skipped");
        return /catálogo vazio|nenhum SKU disponível/.test(error.message);
      }
    );
    assert.equal(api.requests.some((request) => request.path === "/orders"), false);
  }
});

test("4xx falha honestamente e entrypoint devolve exit code não zero", async () => {
  const api = happyApi();
  await assert.rejects(
    runSimulation({
      baseUrl: "http://localhost:3001",
      username: "admin",
      password: "secret",
      fetchImpl: async (url, options) => new URL(url).pathname === "/inventory"
        ? json({ error: "contrato inválido" }, 422)
        : api.fetchImpl(url, options)
    }),
    (error) => error.statusCode === 422
      && error.summary.steps.inventory.status === "failed"
      && error.summary.steps.order.status === "skipped"
  );

  const cli = spawnSync(process.execPath, ["apps/event-simulator/src/seed.js"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      API_BASE_URL: "https://api.exemplo.com",
      DEMO_ADMIN_PASSWORD: "nao-deve-ser-enviado"
    }
  });
  assert.equal(cli.status, 1);
  assert.match(cli.stdout, /Simulação falhou/);
  assert.doesNotMatch(`${cli.stdout}${cli.stderr}`, /nao-deve-ser-enviado/);
});
