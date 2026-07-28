import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticate,
  canRoleTransitionOrderStatus,
  hasPermission,
  hashPassword,
  login,
  permissionForRequest,
  revokeSession,
  validateCsrf,
  verifyPassword
} from "../apps/api/src/auth.js";

test("senha scrypt e verificavel sem aceitar senha diferente", async () => {
  const hash = await hashPassword("senha-de-teste-segura");
  assert.match(hash, /^scrypt-v1\$/);
  assert.equal(await verifyPassword("senha-de-teste-segura", hash), true);
  assert.equal(await verifyPassword("outra-senha", hash), false);
});

test("matriz RBAC limita cozinha e operador e veda permissao generica orders a cozinha", () => {
  assert.equal(hasPermission("admin", "admin"), true);
  assert.equal(hasPermission("operator", "cash"), true);
  assert.equal(hasPermission("operator", "orders"), true);
  assert.equal(hasPermission("operator", "admin"), false);
  assert.equal(hasPermission("kitchen", "orders:read"), true);
  assert.equal(hasPermission("kitchen", "orders:prepare"), true);
  assert.equal(hasPermission("kitchen", "orders"), false);
  assert.equal(hasPermission("kitchen", "finance"), false);
});

test("classificacao centralizada designa PATCH status para orders:prepare e deixa rota desconhecida sem permissao", () => {
  assert.equal(permissionForRequest("GET", "/orders"), "orders:read");
  assert.equal(permissionForRequest("PATCH", "/orders/123/status"), "orders:prepare");
  assert.equal(permissionForRequest("PATCH", "/orders/123/discount"), "orders");
  assert.equal(permissionForRequest("POST", "/orders"), "orders");
  assert.equal(permissionForRequest("POST", "/orders/123/tab-assignment"), "orders");
  assert.equal(permissionForRequest("GET", "/events/orders"), "sse:orders");
  assert.equal(permissionForRequest("POST", "/integrations/ifood/accept"), "admin");
  assert.equal(permissionForRequest("GET", "/kitchen/queue"), "orders:read");
  assert.equal(permissionForRequest("POST", "/orders/abc/accept"), "admin");
  assert.equal(permissionForRequest("POST", "/orders/abc/reprint"), "admin");
  assert.equal(permissionForRequest("GET", "/rota-nova-sem-classificacao"), null);
});

test("CSRF emitido no login fica vinculado a sessao", async () => {
  const passwordHash = await hashPassword("senha-de-teste-segura");
  let insertValues;
  const db = {
    async query(sql, values) {
      if (sql.startsWith("SELECT id")) {
        return { rows: [{ id: "u1", username: "admin", role: "admin", password_hash: passwordHash }] };
      }
      insertValues = values;
      return { rows: [] };
    }
  };
  const result = await login(db, {
    username: "admin",
    password: "senha-de-teste-segura",
    ip: "127.0.0.1",
    now: new Date("2026-07-28T12:00:00Z")
  });
  assert.equal(result.ok, true);
  assert.equal(validateCsrf({ csrfHash: insertValues[2] }, result.csrfToken), true);
  assert.equal(validateCsrf({ csrfHash: insertValues[2] }, "csrf-de-outra-sessao"), false);
});

test("login limita cinco falhas por IP e identificador em 15 minutos", async () => {
  const db = { query: async () => ({ rows: [] }) };
  const now = new Date("2026-07-28T13:00:00Z");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await login(db, {
      username: "ausente-rate-test",
      password: "incorreta",
      ip: "127.0.0.77",
      now
    });
    assert.equal(result.ok, false);
    assert.equal(result.rateLimited, undefined);
  }
  const limited = await login(db, {
    username: "ausente-rate-test",
    password: "incorreta",
    ip: "127.0.0.77",
    now
  });
  assert.equal(limited.rateLimited, true);
  assert.deepEqual(limited.body, { error: "Credenciais invalidas" });
});

test("sessao expirada por inatividade ou limite absoluto e recusada", async () => {
  const now = new Date("2026-07-28T14:00:00Z");
  const db = {
    query: async () => ({
      rows: [{
        id: "s1",
        user_id: "u1",
        csrf_hash: "hash",
        username: "admin",
        role: "admin",
        idle_expires_at: new Date(now.getTime() - 1),
        expires_at: new Date(now.getTime() + 60_000)
      }]
    })
  };
  assert.equal(await authenticate(db, "token", now), null);
});

test("limite absoluto expirado e recusado mesmo com inatividade valida", async () => {
  const now = new Date("2026-07-28T14:00:00Z");
  const db = {
    query: async () => ({
      rows: [{
        id: "s-absolute",
        user_id: "u1",
        csrf_hash: "hash",
        username: "admin",
        role: "admin",
        idle_expires_at: new Date(now.getTime() + 60_000),
        expires_at: new Date(now.getTime() - 1)
      }]
    })
  };
  assert.equal(await authenticate(db, "absolute-token", now), null);
});

test("falha de persistencia ao revogar fecha a sessao no processo", async () => {
  const token = "token-com-falha-de-revogacao";
  const validSession = {
    id: "s-revoke",
    user_id: "u1",
    csrf_hash: "hash",
    username: "admin",
    role: "admin",
    idle_expires_at: new Date(Date.now() + 60_000),
    expires_at: new Date(Date.now() + 120_000)
  };
  const db = {
    async query(sql) {
      if (sql.startsWith("UPDATE auth_sessions SET revoked_at")) throw new Error("db write failed");
      return { rows: [validSession] };
    }
  };
  await assert.rejects(revokeSession(db, token), /db write failed/);
  assert.equal(await authenticate(db, token), null);
});

test("transicoes de status para cozinha são restritas a preparo e pronto", () => {
  assert.equal(canRoleTransitionOrderStatus("kitchen", "confirmed", "in_preparation"), true);
  assert.equal(canRoleTransitionOrderStatus("kitchen", "in_preparation", "ready"), true);
  assert.equal(canRoleTransitionOrderStatus("kitchen", "in_preparation", "in_preparation"), true);
  assert.equal(canRoleTransitionOrderStatus("kitchen", "ready", "ready"), true);
  assert.equal(canRoleTransitionOrderStatus("kitchen", "confirmed", "ready"), false);
  assert.equal(canRoleTransitionOrderStatus("kitchen", "confirmed", "cancelled"), false);
  assert.equal(canRoleTransitionOrderStatus("kitchen", "in_preparation", "completed"), false);
  assert.equal(canRoleTransitionOrderStatus("operator", "confirmed", "completed"), true);
  assert.equal(canRoleTransitionOrderStatus("admin", "confirmed", "cancelled"), true);
});
