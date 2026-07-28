import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import pg from "pg";

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  test.skip("PostgreSQL efêmero requer TEST_DATABASE_URL");
} else {
  let child;
  let base;
  let adminCookie;
  let adminCsrf;
  let pool;

  before(async () => {
    pool = new pg.Pool({ connectionString });
    const env = { 
      ...process.env, 
      DATABASE_URL: connectionString, 
      PORT: "33419", 
      APP_ENV: "demo", 
      IFOOD_ENABLED: "false", 
      DELIVERYMUCH_ENABLED: "false",
      ADMIN_BOOTSTRAP_PASSWORD: "test-password"
    };
    child = spawn(process.execPath, ["apps/api/src/server.js"], { env, stdio: "ignore" });
    base = "http://127.0.0.1:33419";
    
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (child.exitCode != null) throw new Error("API boot failed");
      try { if ((await fetch(`${base}/health`)).ok) break; } catch {}
      await new Promise(r => setTimeout(r, 50));
    }

    const loginRes = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "test-password" })
    });
    const setCookies = loginRes.headers.getSetCookie?.() || [loginRes.headers.get("set-cookie") || ""];
    adminCookie = setCookies.map((value) => value.split(";")[0]).filter(Boolean).join("; ");
    adminCsrf = (await loginRes.json()).csrfToken;
  });

  after(async () => {
    if (child && child.exitCode == null) child.kill();
    if (pool) await pool.end();
  });

  async function api(path, { method = "GET", body } = {}) {
    const headers = { cookie: adminCookie };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (method !== "GET") headers["x-csrf-token"] = adminCsrf;
    
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  test("rollback integral ao bloquear comanda com rodada 'confirmed'", async () => {
    const runId = randomUUID().slice(0, 8);
    const tabRes = await api("/tabs", { method: "POST", body: { kind: "table", label: `h02-${runId}` } });
    assert.equal(tabRes.status, 201);
    const tabId = tabRes.body.id;

    const roundRes = await api(`/tabs/${tabId}/rounds`, {
      method: "POST",
      headers: { "Idempotency-Key": `h02-r1-${runId}` },
      body: { items: [{ sku: `sku-${runId}`, name: "Teste", quantity: 1, price: 100, preparationMode: "kitchen" }] }
    });
    assert.equal(roundRes.status, 201);
    
    await api(`/tabs/${tabId}/payments`, {
      method: "POST",
      headers: { "Idempotency-Key": `h02-p1-${runId}` },
      body: { paymentMethod: "cash", amountCents: 10000 }
    });

    const closeRes = await api(`/tabs/${tabId}/close`, { method: "POST", body: {} });
    assert.equal(closeRes.status, 409);
    assert.equal(closeRes.body.code, "TAB_PRODUCTION_PENDING");
    assert.equal(closeRes.body.pendingRounds.length, 1);
    assert.equal(closeRes.body.pendingRounds[0].status, "confirmed");

    const tabState = await api(`/tabs/${tabId}`);
    assert.equal(tabState.body.status, "open");
    assert.equal(tabState.body.rounds[0].status, "confirmed");
  });

  test("bloqueia fechamento com rodada 'in_preparation'", async () => {
    const runId = randomUUID().slice(0, 8);
    const tabRes = await api("/tabs", { method: "POST", body: { kind: "table", label: `h02-inprep-${runId}` } });
    const tabId = tabRes.body.id;

    const roundRes = await api(`/tabs/${tabId}/rounds`, {
      method: "POST",
      headers: { "Idempotency-Key": `h02-r1-${runId}` },
      body: { items: [{ sku: `sku-${runId}`, name: "Teste", quantity: 1, price: 100, preparationMode: "kitchen" }] }
    });
    const roundId = roundRes.body.id;

    await api(`/orders/${roundId}/status`, { method: "PATCH", body: { status: "in_preparation" } });
    await api(`/tabs/${tabId}/payments`, {
      method: "POST",
      headers: { "Idempotency-Key": `h02-p1-${runId}` },
      body: { paymentMethod: "cash", amountCents: 10000 }
    });

    const closeRes = await api(`/tabs/${tabId}/close`, { method: "POST", body: {} });
    assert.equal(closeRes.status, 409);
    assert.equal(closeRes.body.code, "TAB_PRODUCTION_PENDING");
    assert.equal(closeRes.body.pendingRounds[0].status, "in_preparation");
  });

  test("permite fechamento com rodada 'ready'", async () => {
    const runId = randomUUID().slice(0, 8);
    const tabRes = await api("/tabs", { method: "POST", body: { kind: "table", label: `h02-ready-${runId}` } });
    const tabId = tabRes.body.id;

    const roundRes = await api(`/tabs/${tabId}/rounds`, {
      method: "POST",
      headers: { "Idempotency-Key": `h02-r1-${runId}` },
      body: { items: [{ sku: `sku-${runId}`, name: "Teste", quantity: 1, price: 100, preparationMode: "direct_handoff" }] }
    });
    
    await api(`/tabs/${tabId}/payments`, {
      method: "POST",
      headers: { "Idempotency-Key": `h02-p1-${runId}` },
      body: { paymentMethod: "cash", amountCents: 10000 }
    });

    const closeRes = await api(`/tabs/${tabId}/close`, { method: "POST", body: {} });
    assert.equal(closeRes.status, 201);
    assert.equal(closeRes.body.status, "closed");
    
    const orderCheck = await pool.query("SELECT status FROM orders WHERE id = $1", [roundRes.body.id]);
    assert.equal(orderCheck.rows[0].status, "completed");
  });
}
