import assert from "node:assert/strict";
import test from "node:test";
import fastify from "fastify";
import {
  authenticate,
  canRoleTransitionOrderStatus,
  hasPermission,
  hashPassword,
  login,
  permissionForRequest,
  validateCsrf
} from "../apps/api/src/auth.js";

function createMockDb() {
  const users = new Map();
  const sessions = new Map();
  return {
    users,
    sessions,
    async query(sql, values) {
      if (sql.startsWith("SELECT id, username, role, password_hash FROM users")) {
        const username = String(values[0]).toLowerCase();
        for (const user of users.values()) {
          if (user.username.toLowerCase() === username) {
            return { rows: [user] };
          }
        }
        return { rows: [] };
      }
      if (sql.startsWith("INSERT INTO auth_sessions")) {
        sessions.set(values[0], {
          id: values[0],
          token_hash: values[1],
          csrf_hash: values[2],
          user_id: values[3],
          created_at: values[4],
          last_seen_at: values[4],
          idle_expires_at: values[5],
          expires_at: values[6],
          revoked_at: null
        });
        return { rows: [] };
      }
      if (sql.startsWith("SELECT s.id, s.user_id, s.csrf_hash")) {
        const tokenHash = values[0];
        for (const session of sessions.values()) {
          if (session.token_hash === tokenHash && !session.revoked_at) {
            const user = users.get(session.user_id);
            return {
              rows: [{
                id: session.id,
                user_id: session.user_id,
                csrf_hash: session.csrf_hash,
                expires_at: session.expires_at,
                idle_expires_at: session.idle_expires_at,
                username: user.username,
                role: user.role
              }]
            };
          }
        }
        return { rows: [] };
      }
      if (sql.startsWith("UPDATE auth_sessions SET last_seen_at")) {
        return { rows: [] };
      }
      return { rows: [] };
    }
  };
}

async function createTestApp(db, ordersStore = {}) {
  const app = fastify({ logger: false });

  function readCookie(request, name) {
    const header = request.headers.cookie || "";
    const match = header.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function isMutation(method) {
    return !["GET", "HEAD", "OPTIONS"].includes(method);
  }

  app.addHook("preHandler", async (request, reply) => {
    const path = request.url.split("?")[0];
    if (path === "/auth/login") return;
    const session = await authenticate(db, readCookie(request, "camoburguer_session"));
    if (!session) return reply.code(401).send({ error: "Nao autorizado" });
    request.auth = session;
    if (isMutation(request.method)) {
      const suppliedCsrf = String(request.headers["x-csrf-token"] || "");
      if (suppliedCsrf !== readCookie(request, "camoburguer_csrf") || !validateCsrf(session, suppliedCsrf)) {
        return reply.code(403).send({ error: "CSRF invalido" });
      }
    }
    const permission = permissionForRequest(request.method, path);
    if (!permission) return reply.code(401).send({ error: "Rota nao classificada" });
    if (!hasPermission(session.user.role, permission)) {
      return reply.code(403).send({ error: "Permissao insuficiente" });
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const res = await login(db, {
      username: request.body.username,
      password: request.body.password,
      ip: "127.0.0.1",
      now: new Date("2026-07-28T14:00:00Z")
    });
    if (!res.ok) return reply.code(401).send(res.body);
    reply.header("set-cookie", [
      `camoburguer_session=${res.token}; Path=/; HttpOnly`,
      `camoburguer_csrf=${res.csrfToken}; Path=/`
    ]);
    return reply.send({ user: res.user, csrfToken: res.csrfToken });
  });

  app.patch("/orders/:orderId/discount", async () => ({ ok: true }));

  app.patch("/orders/:orderId/status", async (request, reply) => {
    const orderId = request.params.orderId;
    const nextStatus = request.body?.status;
    const order = ordersStore[orderId];
    if (!order) return reply.code(404).send({ message: "Pedido não encontrado" });
    if (!canRoleTransitionOrderStatus(request.auth?.user?.role, order.status, nextStatus)) {
      return reply.code(403).send({ error: "Permissao insuficiente" });
    }
    order.status = nextStatus;
    return reply.code(200).send(order);
  });

  app.post("/orders", async () => ({ ok: true }));
  app.post("/orders/:orderId/tab-assignment", async () => ({ ok: true }));
  app.post("/orders/:orderId/reprint", async () => ({ ok: true }));
  app.post("/integrations/ifood/accept", async () => ({ ok: true }));
  app.get("/rota-nova-nao-classificada", async () => ({ ok: true }));

  return app;
}

test("suíte HTTP de integração valida bloqueio de exploit da cozinha, transições granulares e RBAC", async () => {
  const db = createMockDb();
  const pwdHash = await hashPassword("senha-segura-123");
  db.users.set("ukitchen", { id: "ukitchen", username: "kitchen", role: "kitchen", password_hash: pwdHash });
  db.users.set("uoperator", { id: "uoperator", username: "operator", role: "operator", password_hash: pwdHash });
  db.users.set("uadmin", { id: "uadmin", username: "admin", role: "admin", password_hash: pwdHash });

  const ordersStore = {
    "o1": { id: "o1", status: "confirmed" },
    "o2": { id: "o2", status: "in_preparation" },
    "o3": { id: "o3", status: "confirmed" }
  };

  const app = await createTestApp(db, ordersStore);

  async function loginAs(username) {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username, password: "senha-segura-123" }
    });
    assert.equal(res.statusCode, 200);
    const setCookies = res.headers["set-cookie"] || [];
    const cookieString = (Array.isArray(setCookies) ? setCookies : [setCookies])
      .map(c => c.split(";")[0])
      .join("; ");
    const body = JSON.parse(res.payload);
    return { cookie: cookieString, csrfToken: body.csrfToken };
  }

  const kitchenAuth = await loginAs("kitchen");
  const operatorAuth = await loginAs("operator");
  const adminAuth = await loginAs("admin");

  // 1) Teste de regressão do exploit: cozinha tenta aplicar desconto enviando status "in_preparation" ou "ready" no corpo
  const exploitRes = await app.inject({
    method: "PATCH",
    url: "/orders/o1/discount",
    headers: { cookie: kitchenAuth.cookie, "x-csrf-token": kitchenAuth.csrfToken },
    payload: { discountPercent: 20, status: "in_preparation" }
  });
  assert.equal(exploitRes.statusCode, 403);
  assert.deepEqual(JSON.parse(exploitRes.payload), { error: "Permissao insuficiente" });

  // 2) Cozinha tenta rotas proibidas (criação, vínculo de comanda, reimpressão)
  const createRes = await app.inject({
    method: "POST",
    url: "/orders",
    headers: { cookie: kitchenAuth.cookie, "x-csrf-token": kitchenAuth.csrfToken },
    payload: { sku: "burger", quantity: 1 }
  });
  assert.equal(createRes.statusCode, 403);

  const tabRes = await app.inject({
    method: "POST",
    url: "/orders/o1/tab-assignment",
    headers: { cookie: kitchenAuth.cookie, "x-csrf-token": kitchenAuth.csrfToken },
    payload: { tabId: "t1" }
  });
  assert.equal(tabRes.statusCode, 403);

  const reprintRes = await app.inject({
    method: "POST",
    url: "/orders/o1/reprint",
    headers: { cookie: kitchenAuth.cookie, "x-csrf-token": kitchenAuth.csrfToken },
    payload: {}
  });
  assert.equal(reprintRes.statusCode, 403);

  // 3) Cozinha executa transições legítimas de preparo de pedido
  const prepRes = await app.inject({
    method: "PATCH",
    url: "/orders/o1/status",
    headers: { cookie: kitchenAuth.cookie, "x-csrf-token": kitchenAuth.csrfToken },
    payload: { status: "in_preparation" }
  });
  assert.equal(prepRes.statusCode, 200);
  assert.equal(ordersStore.o1.status, "in_preparation");

  const readyRes = await app.inject({
    method: "PATCH",
    url: "/orders/o2/status",
    headers: { cookie: kitchenAuth.cookie, "x-csrf-token": kitchenAuth.csrfToken },
    payload: { status: "ready" }
  });
  assert.equal(readyRes.statusCode, 200);
  assert.equal(ordersStore.o2.status, "ready");

  // 4) Cozinha tenta transição proibida na rota status (ex: cancelar pedido)
  const cancelRes = await app.inject({
    method: "PATCH",
    url: "/orders/o3/status",
    headers: { cookie: kitchenAuth.cookie, "x-csrf-token": kitchenAuth.csrfToken },
    payload: { status: "cancelled" }
  });
  assert.equal(cancelRes.statusCode, 403);
  assert.equal(ordersStore.o3.status, "confirmed");

  // 5) Operador e Admin mantêm acesso normal
  const opDiscountRes = await app.inject({
    method: "PATCH",
    url: "/orders/o3/discount",
    headers: { cookie: operatorAuth.cookie, "x-csrf-token": operatorAuth.csrfToken },
    payload: { discountPercent: 10 }
  });
  assert.equal(opDiscountRes.statusCode, 200);

  const adminReprintRes = await app.inject({
    method: "POST",
    url: "/orders/o3/reprint",
    headers: { cookie: adminAuth.cookie, "x-csrf-token": adminAuth.csrfToken },
    payload: {}
  });
  assert.equal(adminReprintRes.statusCode, 200);

  // 6) Negação por padrão em rota não classificada
  const unclassifiedRes = await app.inject({
    method: "GET",
    url: "/rota-nova-nao-classificada",
    headers: { cookie: operatorAuth.cookie }
  });
  assert.equal(unclassifiedRes.statusCode, 401);
  assert.deepEqual(JSON.parse(unclassifiedRes.payload), { error: "Rota nao classificada" });

  await app.close();
});
