import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  ADD_ONS,
  buildKitchenTicket,
  CATALOG_CAPTURED_AT,
  CATALOG_SOURCE_URL,
  calculateOrderTotal,
  calculateStockRequirements,
  closeCashShift,
  confirmOrder,
  createCancellationOrder,
  createCashShift,
  createOrder,
  normalizeStandaloneOrderDto,
  transitionOrder,
} from "@camoburguer/domain";
import {
  buildEntriesFromOrder,
  buildEntryFromAdjustment,
  buildEntryFromTabPayment,
  buildOpeningEntry,
  filterEntries,
  summarizeFinance,
} from "@camoburguer/finance-core";
import { toMoney } from "@camoburguer/shared-types";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { runSeedDemo } from "../../../scripts/seed-demo.mjs";
import {
  authenticate,
  canRoleTransitionOrderStatus,
  changePassword,
  ensureBootstrapAdmin,
  hasPermission,
  login,
  permissionForRequest,
  revokeSession,
  validateCsrf,
} from "./auth.js";
import {
  archiveCatalogItem,
  getCatalogItem,
  insertCatalogItem,
  listCatalogItems,
  lockCatalogItems,
  updateCatalogItem,
} from "./catalog-repository.js";
import { assertSafeAutoSeed, config } from "./config.js";
import { createDb, mapFinanceEntry, mapOrder, mapShift, mapTab, mapTabPayment } from "./db.js";
import { mapPostgresError } from "./error-mapper.js";
import {
  cancellationFingerprintPayload,
  claimIdempotency,
  completeIdempotency,
  fingerprint,
  moneyCents,
  orderFingerprintPayload,
} from "./idempotency.js";
import integrationRoutes from "./integrations/integration-routes.js";
import { startIntegrationPolling } from "./integrations/polling-runner.js";
import {
  normalizeTabAssignmentPayload,
  sameTabAssignment,
  tabAssignmentEligibility,
} from "./order-tab-assignment.js";
import {
  assertBridgeStatus,
  assertPrintPayloadSize,
  classifyPrintFailure,
  PRINT_MAX_ATTEMPTS,
  printBackoffMs,
  printPayload,
} from "./print-queue.js";
import { createSseHub } from "./sse.js";
import { createUserSchema, updateUserSchema } from "./user-schema.js";

assertSafeAutoSeed(process.env.AUTO_SEED);

const app = Fastify({ logger: true });
const db = createDb(config.databaseUrl);
const sse = createSseHub();
const TAB_PAYMENT_METHODS = ["cash", "pix", "credit_card", "debit_card", "app_paid"];
const STOCK_CATEGORIES = ["xis", "dog", "hamburguer"];
const PREPARATION_MODES = ["kitchen", "direct_handoff"];
const OPS_WEB_DIR = fileURLToPath(new URL("../../ops-web-legacy/", import.meta.url));
const PUBLIC_UI_PATHS = new Set([
  "/",
  "/app",
  "/app/",
  "/app/login",
  "/app/main.js",
  "/app/styles.css",
  "/app/legacy",
  "/app/legacy/",
]);
const DEMO_ROLES = new Set(["admin", "operator", "kitchen"]);

await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  global: true,
});

await app.register(rateLimit, {
  max: 1000,
  timeWindow: "1 minute",
});

await app.register(cors, {
  origin(origin, callback) {
    callback(null, !origin || config.corsOrigins.includes(origin));
  },
  credentials: true,
  strictPreflight: true,
});

function requireDemoAdmin(request, reply) {
  if (request.auth?.user?.role === "admin") return true;
  reply.code(403).send({ error: "Permissao insuficiente" });
  return false;
}

function requireDemoDirectAccess(reply) {
  if (config.appEnvironment === "demo") return true;
  reply.code(403).send({
    code: "demo_access_disabled",
    error: "Acesso rapido disponivel somente no ambiente demo.",
  });
  return false;
}

async function ensureDemoUsers() {
  return db.transaction(async (client) => {
    const adminResult = await client.query(
      "SELECT id, username, role, password_hash FROM users WHERE username = 'admin' LIMIT 1",
    );
    const admin = adminResult.rows[0];
    if (!admin) {
      const error = new Error("Administrador bootstrap ausente.");
      error.code = "bootstrap_admin_missing";
      error.statusCode = 503;
      throw error;
    }

    for (const role of ["operator", "kitchen"]) {
      const email = `${role}@camoburguer.local`;
      const name = role === "operator" ? "Operador" : "Cozinha";
      await client.query(
        `INSERT INTO users (id, name, email, username, role, password_hash)
         VALUES ($1, $2, $3, $4, $4, $5)
         ON CONFLICT (username) DO UPDATE
         SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, credential_changed_at = NOW()`,
        [randomUUID(), name, email, role, admin.password_hash],
      );
    }

    const { rows } = await client.query(
      "SELECT id, username, role FROM users WHERE username IN ('admin', 'operator', 'kitchen')",
    );
    return Object.fromEntries(rows.map((row) => [row.role, row]));
  });
}

function sendIdempotencyConflict(reply, code) {
  return reply.code(409).send({
    code,
    message:
      code === "legacy_idempotency_unverifiable"
        ? "Chave idempotente legada sem fingerprint verificavel"
        : code === "idempotency_version_mismatch"
          ? "Versão do fingerprint idempotente defasada; refaça a requisição"
          : "Idempotency-Key ja usada com outra operacao, recurso ou payload",
  });
}

function abortTransaction(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function readCookie(request, name) {
  const pair = String(request.headers.cookie || "")
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
}

function setSessionCookies(reply, token, csrfToken) {
  const base = `Path=/; SameSite=Strict${config.authCookieSecure ? "; Secure" : ""}`;
  reply.header("set-cookie", [
    `camoburguer_session=${encodeURIComponent(token)}; ${base}; HttpOnly`,
    `camoburguer_csrf=${encodeURIComponent(csrfToken)}; ${base}`,
  ]);
}

function clearSessionCookies(reply) {
  const secure = config.authCookieSecure ? "; Secure" : "";
  reply.header("set-cookie", [
    `camoburguer_session=; Path=/; SameSite=Strict${secure}; HttpOnly; Max-Age=0`,
    `camoburguer_csrf=; Path=/; SameSite=Strict${secure}; Max-Age=0`,
  ]);
}

function isPublicRequest(request) {
  const path = request.url.split("?")[0];
  const preflight =
    request.method === "OPTIONS" &&
    config.corsOrigins.includes(String(request.headers.origin || "")) &&
    Boolean(request.headers["access-control-request-method"]);
  const publicUi =
    (request.method === "GET" || request.method === "HEAD") && PUBLIC_UI_PATHS.has(path);
  return (
    preflight ||
    publicUi ||
    path === "/health" ||
    (request.method === "POST" && (path === "/auth/login" || path === "/demo/access"))
  );
}

function isMutation(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(method);
}

app.addHook("preHandler", async (request, reply) => {
  if (isPublicRequest(request)) return;
  const path = request.url.split("?")[0];
  const session = await authenticate(db, readCookie(request, "camoburguer_session"));
  if (!session) return reply.code(401).send({ error: "Nao autorizado" });
  request.auth = session;
  if (isMutation(request.method)) {
    const suppliedCsrf = String(request.headers["x-csrf-token"] || "");
    if (
      suppliedCsrf !== readCookie(request, "camoburguer_csrf") ||
      !validateCsrf(session, suppliedCsrf)
    ) {
      return reply.code(403).send({ error: "CSRF invalido" });
    }
  }
  if (path === "/auth/logout" || path === "/auth/password") return;
  const permission = permissionForRequest(request.method, path);
  if (!permission) return reply.code(401).send({ error: "Rota nao classificada" });
  if (!hasPermission(session.user.role, permission)) {
    return reply.code(403).send({ error: "Permissao insuficiente" });
  }
});

function sanitizeForAudit(data) {
  if (!data) return null;
  const clone = structuredClone(data);
  const sanitizeRec = (obj) => {
    if (Array.isArray(obj)) obj.forEach(sanitizeRec);
    else if (obj && typeof obj === "object") {
      const redacts = [
        "password",
        "token",
        "csrfToken",
        "secret",
        "customerName",
        "customerPhone",
        "bearer",
      ];
      for (const key of Object.keys(obj)) {
        if (redacts.includes(key)) obj[key] = "[REDACTED]";
        else sanitizeRec(obj[key]);
      }
    }
  };
  sanitizeRec(clone);
  return clone;
}

async function auditMutation(client, request, action, stateBefore, stateAfter, result = "success") {
  if (!request?.auth?.user) return;
  const idempotencyKey = request.headers
    ? request.headers["idempotency-key"] || request.body?.idempotencyKey || null
    : null;
  const path = request.url ? request.url.split("?")[0] : "internal";
  await client.query(
    `INSERT INTO audit_events 
     (id, actor_id, action, resource_path, idempotency_key, correlation_id, state_before, state_after, result) 
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)`,
    [
      randomUUID(),
      request.auth.user.id,
      action,
      path,
      idempotencyKey,
      idempotencyKey || null,
      JSON.stringify(sanitizeForAudit(stateBefore)),
      JSON.stringify(sanitizeForAudit(stateAfter)),
      result,
    ],
  );
}

app.addHook("onResponse", async (request, reply) => {
  if (!request.auth?.user || isMutation(request.method) || reply.statusCode >= 400) return;
  const path = request.url.split("?")[0];
  if (path.startsWith("/auth/") || path.startsWith("/audit")) return;
  await db.query(
    "INSERT INTO audit_events (id, actor_id, action, resource_path, result) VALUES ($1, $2, $3, $4, $5)",
    [
      randomUUID(),
      request.auth.user.id,
      `telemetry.${request.method.toLowerCase()}`,
      path,
      "success",
    ],
  );
});

app.get("/audit", async (request, reply) => {
  if (!requireDemoAdmin(request, reply)) return reply;
  const limit = Math.max(1, Math.min(100, Number(request.query.limit) || 50));
  const page = Math.max(1, Number(request.query.page) || 1);
  const offset = (page - 1) * limit;

  const { rows } = await db.query(
    "SELECT * FROM audit_events ORDER BY occurred_at DESC LIMIT $1 OFFSET $2",
    [limit, offset],
  );
  return { items: rows };
});
app.post("/auth/login", async (request, reply) => {
  const result = await login(db, {
    username: request.body?.username,
    password: request.body?.password,
    ip: request.ip,
  });
  if (!result.ok) return reply.code(result.rateLimited ? 429 : 401).send(result.body);
  setSessionCookies(reply, result.token, result.csrfToken);
  return {
    user: result.user,
    csrfToken: result.csrfToken,
    expiresAt: result.expiresAt.toISOString(),
    idleExpiresAt: result.idleExpiresAt.toISOString(),
  };
});

app.post("/demo/access", async (request, reply) => {
  if (!requireDemoDirectAccess(reply)) return reply;

  const role = String(request.body?.role || "admin")
    .trim()
    .toLowerCase();
  if (!DEMO_ROLES.has(role)) {
    return reply.code(400).send({
      code: "invalid_demo_role",
      error: "Perfil demo invalido.",
    });
  }

  try {
    let demoPrepared = "skipped";
    if (request.body?.prepare !== false) {
      try {
        console.log(
          "DEMO SEED REQUEST! APP_ENV IS:",
          config.appEnvironment,
          "process.env.APP_ENV:",
          process.env.APP_ENV,
        );
        await runSeedDemo(db, {
          authenticated: true,
          environment: config.appEnvironment,
          enabled: config.demoSeedEnabled,
          expectedTarget: config.demoSeedTarget,
          confirmedTarget: config.demoSeedTarget,
          onDecision({ decision, target, blockers }) {
            app.log.info({
              event: "demo_access_seed",
              decision,
              role,
              target,
              blockers,
            });
          },
        });
        demoPrepared = "seeded";
      } catch (error) {
        if (error.code === "preflight_conflict") demoPrepared = "preserved";
        else throw error;
      }
    }

    const demoUsers = await ensureDemoUsers();
    const result = await login(db, {
      username: demoUsers[role]?.username,
      password: config.adminBootstrapPassword,
      ip: request.ip,
    });
    if (!result.ok) {
      const error = new Error("Credenciais demo indisponiveis.");
      error.code = result.rateLimited ? "demo_login_rate_limited" : "demo_login_failed";
      error.statusCode = result.rateLimited ? 429 : 503;
      throw error;
    }

    setSessionCookies(reply, result.token, result.csrfToken);
    return {
      user: result.user,
      csrfToken: result.csrfToken,
      expiresAt: result.expiresAt.toISOString(),
      idleExpiresAt: result.idleExpiresAt.toISOString(),
      demoPrepared,
    };
  } catch (error) {
    const statusCode = Number(error.statusCode) || 500;
    app.log[statusCode === 500 ? "error" : "warn"](
      {
        event: "demo_access",
        role,
        code: error.code || "internal_error",
        target: error.details?.target || null,
        blockers: error.details?.blockers || null,
      },
      error.message,
    );
    return reply.code(statusCode).send({
      code: error.code || "demo_access_failed",
      error: error.message,
    });
  }
});

app.get("/auth/me", async (request) => ({
  user: request.auth.user,
  csrfToken: readCookie(request, "camoburguer_csrf"),
  expiresAt: request.auth.expiresAt.toISOString(),
  idleExpiresAt: request.auth.idleExpiresAt.toISOString(),
}));

app.post("/auth/logout", async (request, reply) => {
  try {
    await revokeSession(db, readCookie(request, "camoburguer_session"));
  } finally {
    clearSessionCookies(reply);
  }
  return reply.code(204).send();
});

app.post("/auth/password", async (request, reply) => {
  await changePassword(
    db,
    request.auth.user.id,
    request.body?.currentPassword,
    request.body?.newPassword,
  );
  await db.query(
    "INSERT INTO audit_events (id, actor_id, action, resource_path) VALUES ($1, $2, $3, $4)",
    [randomUUID(), request.auth.user.id, "CREDENTIAL_CHANGE", "/auth/password"],
  );
  clearSessionCookies(reply);
  return reply.code(204).send();
});

app.post("/users", async (request, reply) => {
  const { error, value } = createUserSchema.validate(request.body);
  if (error) return reply.code(400).send({ error: error.details[0].message });
  const { name, email, username, role, password } = value;
  const password_hash = await hashPassword(password);
  const id = randomUUID();
  try {
    await db.query(
      "INSERT INTO users (id, name, email, username, role, password_hash) VALUES ($1, $2, $3, $4, $5, $6)",
      [id, name, email, username, role, password_hash],
    );
    await db.query(
      "INSERT INTO audit_events (id, actor_id, action, resource_path) VALUES ($1, $2, $3, $4)",
      [randomUUID(), request.auth.user.id, "USER_CREATED", `/users/${id}`],
    );
    return reply.code(201).send({ id, name, email, username, role });
  } catch (err) {
    if (err.code === "23505") return reply.code(409).send({ error: "Username ou email ja existe" });
    throw err;
  }
});

app.put("/users/:id", async (request, reply) => {
  const { error, value } = updateUserSchema.validate(request.body);
  if (error) return reply.code(400).send({ error: error.details[0].message });

  const userId = request.params.id;
  const updates = [];
  const values = [];
  let index = 1;

  if (value.name) {
    updates.push(`name = $${index++}`);
    values.push(value.name);
  }
  if (value.email) {
    updates.push(`email = $${index++}`);
    values.push(value.email);
  }
  if (value.role) {
    updates.push(`role = $${index++}`);
    values.push(value.role);
  }
  if (value.password) {
    updates.push(`password_hash = $${index++}`);
    values.push(await hashPassword(value.password));
    updates.push(`credential_changed_at = NOW()`);
  }

  if (updates.length === 0) return reply.code(400).send({ error: "Nenhum campo para atualizar" });

  values.push(userId);
  const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = $${index} RETURNING id, name, email, username, role`;

  try {
    const result = await db.query(sql, values);
    if (result.rowCount === 0) return reply.code(404).send({ error: "Usuario nao encontrado" });

    await db.query(
      "INSERT INTO audit_events (id, actor_id, action, resource_path) VALUES ($1, $2, $3, $4)",
      [randomUUID(), request.auth.user.id, "USER_UPDATED", `/users/${userId}`],
    );

    if (value.password || value.role) {
      await db.query(
        "UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
        [userId],
      );
    }

    return result.rows[0];
  } catch (err) {
    if (err.code === "23505") return reply.code(409).send({ error: "Email ja existe" });
    throw err;
  }
});

app.get("/users", async (request) => {
  const result = await db.query(
    "SELECT id, name, email, username, role, created_at FROM users ORDER BY created_at DESC",
  );
  return result.rows;
});

app.get("/app", async (_request, reply) => reply.redirect("/app/"));
app.get("/app/", async (_request, reply) => {
  reply.type("text/html; charset=utf-8");
  return readFile(`${OPS_WEB_DIR}/index.html`);
});
app.get("/app/main.js", async (_request, reply) => {
  reply.type("text/javascript; charset=utf-8");
  return readFile(`${OPS_WEB_DIR}/main.js`);
});
app.get("/app/styles.css", async (_request, reply) => {
  reply.type("text/css; charset=utf-8");
  return readFile(`${OPS_WEB_DIR}/styles.css`);
});
app.get("/app/legacy", async (_request, reply) => reply.redirect("/app/"));
app.get("/app/legacy/", async (_request, reply) => reply.redirect("/app/"));

function normalizeCatalogItem(input, current = null) {
  for (const field of ["allowsAddons", "available"]) {
    if (Object.hasOwn(input || {}, field) && typeof input[field] !== "boolean") {
      throw new Error(`${field} deve ser booleano`);
    }
  }
  const value = { ...(current || {}), ...(input || {}) };
  const sku = String(current?.sku || value.sku || "")
    .trim()
    .toLowerCase();
  const name = String(value.name || "").trim();
  const category = String(value.category || "").trim();
  const price = Number(value.price);
  const description = String(value.description || "").trim();
  const stockCategory =
    value.stockCategory == null || value.stockCategory === "" ? null : String(value.stockCategory);
  const preparationMode = String(value.preparationMode || "kitchen");
  const allowsAddons = value.allowsAddons === true;
  const available = value.available !== false;
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(sku)) throw new Error("SKU inválido");
  if (!name || !category) throw new Error("Nome e categoria são obrigatórios");
  if (!Number.isFinite(price) || price < 0) throw new Error("Preço inválido");
  if (stockCategory && !STOCK_CATEGORIES.includes(stockCategory))
    throw new Error("Categoria de estoque inválida");
  if (!PREPARATION_MODES.includes(preparationMode)) throw new Error("Modo de preparo inválido");
  if (preparationMode === "direct_handoff" && stockCategory) {
    throw new Error("Entrega direta não controla estoque de cozinha");
  }
  return {
    sku,
    name,
    category,
    price: toMoney(price),
    description,
    stockCategory,
    allowsAddons,
    preparationMode,
    available,
  };
}

app.setErrorHandler((error, request, reply) => {
  const { statusCode, payload } = mapPostgresError(error, request.log);
  return reply.code(statusCode).send(payload);
});

async function insertOrder(order, executor = db) {
  const { rows } = await executor.query(
    `INSERT INTO orders (
      id, idempotency_key, tab_id, round_number, round_kind, reverses_order_id, source, status, customer_name, fulfillment_mode, delivery_address,
      promised_at, notes, payment_method, total, discount_percent, items, metadata, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19,$20
    ) RETURNING *`,
    [
      order.id,
      order.idempotencyKey,
      order.tabId,
      order.roundNumber,
      order.roundKind,
      order.reversesOrderId,
      order.source,
      order.status,
      order.customerName,
      order.fulfillmentMode,
      order.deliveryAddress,
      order.promisedAt,
      order.notes,
      order.paymentMethod ||
        (order.tabId
          ? null
          : ["ifood", "deliverymuch"].includes(order.source)
            ? "app_paid"
            : "cash"),
      order.total,
      order.discountPercent,
      JSON.stringify(order.items),
      JSON.stringify(order.metadata),
      order.createdAt,
      order.updatedAt,
    ],
  );
  return mapOrder(rows[0]);
}

async function getOrder(orderId, executor = db, forUpdate = false) {
  const { rows } = await executor.query(
    `SELECT o.*,
       EXISTS (SELECT 1 FROM channel_mappings mapping WHERE mapping.order_id = o.id) AS has_channel_mapping
     FROM orders o
     WHERE o.id = $1${forUpdate ? " FOR UPDATE OF o" : ""}`,
    [orderId],
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}

async function getOrderByIdempotencyKey(idempotencyKey, executor = db) {
  const { rows } = await executor.query(
    `SELECT o.*,
       EXISTS (SELECT 1 FROM channel_mappings mapping WHERE mapping.order_id = o.id) AS has_channel_mapping
     FROM orders o WHERE o.idempotency_key = $1`,
    [idempotencyKey],
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}

async function listOrders() {
  const { rows } = await db.query(`
    SELECT o.*, cm.sync_status, cm.external_id, cm.channel,
      EXISTS (SELECT 1 FROM channel_mappings mapping WHERE mapping.order_id = o.id) AS has_channel_mapping,
      EXISTS (SELECT 1 FROM finance_entries entry WHERE entry.order_id = o.id) AS has_finance_entry
    FROM orders o
    LEFT JOIN channel_mappings cm ON o.id = cm.order_id
    ORDER BY o.created_at DESC
  `);
  return rows.map((row) => {
    const order = mapOrder(row);
    if (row.channel) {
      order.syncStatus = row.sync_status;
      order.externalId = row.external_id;
    }
    order.tabAssignmentEligibility = tabAssignmentEligibility(order, {
      hasChannelMapping: row.has_channel_mapping,
      hasFinanceEntry: row.has_finance_entry,
    });
    return order;
  });
}

function mapOrderTabAssignment(row) {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    orderId: row.order_id,
    tabId: row.tab_id,
    roundNumber: row.round_number,
    normalizedPayload: row.normalized_payload,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function getOrderTabAssignmentByKey(idempotencyKey, executor = db) {
  const { rows } = await executor.query(
    "SELECT * FROM order_tab_assignments WHERE idempotency_key = $1",
    [idempotencyKey],
  );
  return rows[0] ? mapOrderTabAssignment(rows[0]) : null;
}

async function orderAssignmentFlags(orderId, executor = db) {
  const { rows } = await executor.query(
    `SELECT
      EXISTS (SELECT 1 FROM channel_mappings WHERE order_id = $1) AS has_channel_mapping,
      EXISTS (SELECT 1 FROM finance_entries WHERE order_id = $1) AS has_finance_entry`,
    [orderId],
  );
  return {
    hasChannelMapping: rows[0].has_channel_mapping,
    hasFinanceEntry: rows[0].has_finance_entry,
  };
}

async function getTab(tabId, executor = db, forUpdate = false) {
  const { rows } = await executor.query(
    `SELECT * FROM service_tabs WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`,
    [tabId],
  );
  return rows[0] ? mapTab(rows[0]) : null;
}

async function tabView(tab, executor = db) {
  const [ordersResult, paymentsResult] = await Promise.all([
    executor.query("SELECT * FROM orders WHERE tab_id = $1 ORDER BY round_number, created_at", [
      tab.id,
    ]),
    executor.query("SELECT * FROM tab_payments WHERE tab_id = $1 ORDER BY created_at, id", [
      tab.id,
    ]),
  ]);
  const rounds = ordersResult.rows.map(mapOrder);
  const payments = paymentsResult.rows.map(mapTabPayment);
  const total = toMoney(
    tab.finalTotal ??
      rounds
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + Number(order.total), 0),
  );
  const totalCents = Math.round(total * 100);
  const paidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const methodBalances = payments.reduce((balances, payment) => {
    balances[payment.paymentMethod] = (balances[payment.paymentMethod] || 0) + payment.amountCents;
    return balances;
  }, {});
  const activeMethods = Object.entries(methodBalances)
    .filter(([, amount]) => amount > 0)
    .map(([method]) => method);
  return {
    ...tab,
    rounds,
    payments,
    total,
    totalCents,
    paid: toMoney(paidCents / 100),
    paidCents,
    balance: toMoney((totalCents - paidCents) / 100),
    balanceCents: totalCents - paidCents,
    paymentMethod: activeMethods.length > 1 ? "mixed" : activeMethods[0] || null,
  };
}

async function listTabs(status = null) {
  const values = status ? [status] : [];
  const { rows } = await db.query(
    `SELECT * FROM service_tabs${status ? " WHERE status = $1" : ""} ORDER BY opened_at DESC`,
    values,
  );
  return Promise.all(rows.map((row) => tabView(mapTab(row))));
}

async function getTabPayment(paymentId, executor = db, forUpdate = false) {
  const { rows } = await executor.query(
    `SELECT * FROM tab_payments WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`,
    [paymentId],
  );
  return rows[0] ? mapTabPayment(rows[0]) : null;
}

async function getTabPaymentByIdempotencyKey(idempotencyKey, executor = db) {
  const { rows } = await executor.query("SELECT * FROM tab_payments WHERE idempotency_key = $1", [
    idempotencyKey,
  ]);
  return rows[0] ? mapTabPayment(rows[0]) : null;
}

async function insertTabPayment(payment, executor = db) {
  const { rows } = await executor.query(
    `INSERT INTO tab_payments (
      id, tab_id, shift_id, kind, reverses_payment_id, payment_method,
      amount_cents, idempotency_key, metadata, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10) RETURNING *`,
    [
      payment.id,
      payment.tabId,
      payment.shiftId,
      payment.kind,
      payment.reversesPaymentId,
      payment.paymentMethod,
      payment.amountCents,
      payment.idempotencyKey,
      JSON.stringify(payment.metadata || {}),
      payment.createdAt,
    ],
  );
  return mapTabPayment(rows[0]);
}

function sameTabPayment(payment, expected) {
  return (
    payment.tabId === expected.tabId &&
    payment.kind === expected.kind &&
    payment.paymentMethod === expected.paymentMethod &&
    payment.amountCents === expected.amountCents &&
    payment.reversesPaymentId === (expected.reversesPaymentId || null)
  );
}

async function changeStock(order, multiplier, reason, executor, sourceOrderId = order.id) {
  const requirements = calculateStockRequirements(order.items);
  const movements = [];
  for (const category of Object.keys(requirements).sort()) {
    const rawDelta = Number(requirements[category]) * multiplier;
    const isLoss = reason === "cancellation_loss";
    const delta = isLoss ? 0 : rawDelta;

    if (reason === "cancellation" || isLoss) {
      const sale = await executor.query(
        "SELECT 1 FROM stock_movements WHERE order_id = $1 AND category = $2 AND reason = 'sale'",
        [sourceOrderId, category],
      );
      if (!sale.rows[0]) continue;
    }

    let currentQuantity = 0;
    if (!isLoss) {
      const { rows } = await executor.query(
        "SELECT * FROM stock_balances WHERE category = $1 FOR UPDATE",
        [category],
      );
      currentQuantity = Number(rows[0]?.quantity || 0);
    }

    const metadata = { roundKind: order.roundKind };
    if (isLoss) metadata.lostQuantity = Math.abs(rawDelta);

    const inserted = await executor.query(
      `INSERT INTO stock_movements (id, category, delta, reason, order_id, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) ON CONFLICT DO NOTHING RETURNING *`,
      [
        randomUUID(),
        category,
        delta,
        reason,
        order.id,
        JSON.stringify(metadata),
        new Date().toISOString(),
      ],
    );
    if (!inserted.rows[0]) continue;

    if (!isLoss) {
      const nextQuantity = currentQuantity + delta;
      if (nextQuantity < 0) {
        const error = new Error(`Estoque insuficiente para ${category}`);
        error.statusCode = 409;
        throw error;
      }
      await executor.query(
        "UPDATE stock_balances SET quantity = $2, updated_at = NOW() WHERE category = $1",
        [category, nextQuantity],
      );
    }
    movements.push(inserted.rows[0]);
  }
  return movements;
}

async function inventoryView() {
  const [balances, movements] = await Promise.all([
    db.query("SELECT * FROM stock_balances ORDER BY category"),
    db.query("SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 100"),
  ]);
  return {
    balances: balances.rows.map((row) => ({
      category: row.category,
      quantity: Number(row.quantity),
      updatedAt: new Date(row.updated_at).toISOString(),
    })),
    movements: movements.rows.map((row) => ({
      id: row.id,
      category: row.category,
      delta: Number(row.delta),
      reason: row.reason,
      orderId: row.order_id,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at).toISOString(),
    })),
  };
}

async function updateOrder(order, expectedStatus, executor = db) {
  const { rows } = await executor.query(
    `UPDATE orders SET
      source = $2,
      status = $3,
      customer_name = $4,
      fulfillment_mode = $5,
      delivery_address = $6,
      promised_at = $7,
      notes = $8,
      payment_method = $9,
      total = $10,
      discount_percent = $11,
      items = $12::jsonb,
      metadata = $13::jsonb,
      updated_at = $14
    WHERE id = $1 AND status = $15
    RETURNING *`,
    [
      order.id,
      order.source,
      order.status,
      order.customerName,
      order.fulfillmentMode,
      order.deliveryAddress,
      order.promisedAt,
      order.notes,
      order.paymentMethod,
      order.total,
      order.discountPercent,
      JSON.stringify(order.items),
      JSON.stringify(order.metadata),
      order.updatedAt,
      expectedStatus,
    ],
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}

async function listEntries() {
  const { rows } = await db.query("SELECT * FROM finance_entries ORDER BY occurred_at DESC");
  return rows.map(mapFinanceEntry);
}

async function insertEntries(entries, executor = db) {
  const inserted = [];
  for (const entry of entries) {
    const { rows } = await executor.query(
      `INSERT INTO finance_entries (
        id, order_id, tab_id, payment_id, shift_id, type, amount, payment_method,
        source, label, metadata, occurred_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12
      ) ON CONFLICT DO NOTHING
      RETURNING *`,
      [
        entry.id,
        entry.orderId || null,
        entry.tabId || null,
        entry.paymentId || null,
        entry.shiftId || null,
        entry.type,
        entry.amount,
        entry.paymentMethod,
        entry.source,
        entry.label,
        JSON.stringify(entry.metadata || {}),
        entry.occurredAt,
      ],
    );
    if (rows[0]) inserted.push(mapFinanceEntry(rows[0]));
  }
  return inserted;
}

async function listShifts() {
  const { rows } = await db.query("SELECT * FROM cash_shifts ORDER BY opened_at DESC");
  return rows.map(mapShift);
}

async function getShift(shiftId, executor = db, forUpdate = false) {
  const { rows } = await executor.query(
    `SELECT * FROM cash_shifts WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`,
    [shiftId],
  );
  return rows[0] ? mapShift(rows[0]) : null;
}

async function insertShift(shift, executor = db) {
  const { rows } = await executor.query(
    `INSERT INTO cash_shifts (
      id, status, opening_amount, expected_amount,
      declared_amount, difference_amount, notes, opened_at, closed_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9
    ) RETURNING *`,
    [
      shift.id,
      shift.status,
      shift.openingAmount,
      shift.expectedAmount,
      shift.declaredAmount,
      shift.differenceAmount,
      shift.notes,
      shift.openedAt,
      shift.closedAt,
    ],
  );
  return mapShift(rows[0]);
}

async function updateShift(shift, expectedStatus, executor = db) {
  const { rows } = await executor.query(
    `UPDATE cash_shifts SET
      status = $2,
      opening_amount = $3,
      expected_amount = $4,
      declared_amount = $5,
      difference_amount = $6,
      notes = $7,
      opened_at = $8,
      closed_at = $9
    WHERE id = $1 AND status = $10
    RETURNING *`,
    [
      shift.id,
      shift.status,
      shift.openingAmount,
      shift.expectedAmount,
      shift.declaredAmount,
      shift.differenceAmount,
      shift.notes,
      shift.openedAt,
      shift.closedAt,
      expectedStatus,
    ],
  );
  return rows[0] ? mapShift(rows[0]) : null;
}

function mapPrintJob(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    reason: row.reason,
    status: row.status,
    printerName: row.printer_name,
    content: row.content,
    attempts: row.attempts,
    error: row.error,
    errorClass: row.error_class,
    lastErrorCode: row.last_error_code,
    nextAttemptAt: row.next_attempt_at ? new Date(row.next_attempt_at).toISOString() : null,
    printedAt: row.printed_at ? new Date(row.printed_at).toISOString() : null,
    deadLetteredAt: row.dead_lettered_at ? new Date(row.dead_lettered_at).toISOString() : null,
    metadata: row.metadata || {},
    history: row.history || [],
  };
}

async function reservePrintJob(order, reason = "confirmed", executor = db) {
  const pending = {
    id: randomUUID(),
    orderId: order.id,
    reason,
    printerName: config.defaultPrinter,
    content: buildKitchenTicket(order, { timeZone: config.businessTimeZone }),
  };
  assertPrintPayloadSize(pending);
  const { rows } = await executor.query(
    `INSERT INTO print_jobs (
      id, order_id, reason, status, printer_name, content, attempts, error, metadata
    ) VALUES ($1,$2,$3,'pending',$4,$5,0,NULL,$6::jsonb)
    ON CONFLICT DO NOTHING
    RETURNING *`,
    [
      pending.id,
      pending.orderId,
      pending.reason,
      pending.printerName,
      pending.content,
      JSON.stringify({ reason }),
    ],
  );
  return rows[0] ? mapPrintJob(rows[0]) : null;
}

async function getPrimaryPrintJob(orderId, executor = db) {
  const { rows } = await executor.query(
    "SELECT * FROM print_jobs WHERE order_id = $1 AND reason IN ('confirmed', 'cancellation') ORDER BY created_at LIMIT 1",
    [orderId],
  );
  return rows[0] ? mapPrintJob(rows[0]) : null;
}

async function reserveReprintJob(original, executor = db) {
  const pending = {
    id: randomUUID(),
    orderId: original.orderId,
    reason: "reprint",
    printerName: original.printerName,
    content: original.content,
  };
  assertPrintPayloadSize(pending);
  const { rows } = await executor.query(
    `INSERT INTO print_jobs (
      id, order_id, reason, status, printer_name, content, attempts, error, metadata
    ) VALUES ($1,$2,'reprint','pending',$3,$4,0,NULL,$5::jsonb)
    RETURNING *`,
    [
      pending.id,
      pending.orderId,
      pending.printerName,
      pending.content,
      JSON.stringify({ reason: "reprint", sourceJobId: original.id }),
    ],
  );
  return mapPrintJob(rows[0]);
}

const printWorkerId = `api-${randomUUID()}`;

async function claimPrintJob(jobId = null) {
  const { rows } = await db.query(
    `WITH candidate AS (
       SELECT id FROM print_jobs
       WHERE ($1::text IS NULL OR id = $1)
         AND (
           status = 'pending'
           OR (status = 'retry_wait' AND next_attempt_at <= NOW())
           OR (status = 'sending' AND lease_expires_at < NOW())
         )
       ORDER BY next_attempt_at, created_at, id
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE print_jobs job
     SET status = 'sending',
         attempts = attempts + 1,
         lease_owner = $2,
         lease_expires_at = NOW() + INTERVAL '30 seconds',
         last_attempt_at = NOW(),
         error = NULL
     FROM candidate
     WHERE job.id = candidate.id
     RETURNING job.*`,
    [jobId, printWorkerId],
  );
  return rows[0] ? mapPrintJob(rows[0]) : null;
}

function bridgeHeaders() {
  return {
    "content-type": "application/json",
    ...(config.printBridgeToken ? { authorization: `Bearer ${config.printBridgeToken}` } : {}),
  };
}

async function readBridgeJson(response, action) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    const error = new Error(`Print bridge retornou JSON inválido ao ${action}`);
    error.permanent = true;
    error.code = "PRINT_BRIDGE_INVALID_JSON";
    throw error;
  }
}

async function finalizePrintedJob(job, payload, reconciled = false) {
  assertBridgeStatus(payload?.status);
  const { rows } = await db.query(
    `UPDATE print_jobs
     SET status = 'printed', printer_name = $3, error = NULL, error_class = NULL,
         last_error_code = NULL, lease_owner = NULL, lease_expires_at = NULL,
         printed_at = NOW(),
         metadata = $4::jsonb,
         history = history || jsonb_build_array(jsonb_build_object(
           'at', NOW(), 'event', $5::text, 'attempt', attempts
         ))
     WHERE id = $1 AND lease_owner = $2
     RETURNING *`,
    [
      job.id,
      printWorkerId,
      payload.printerName || job.printerName,
      JSON.stringify({
        ...(job.metadata || {}),
        ...(payload.metadata || {}),
        bridgeJobId: payload.id || job.id,
        receipt: payload.receipt || null,
        reason: job.reason,
        reconciled,
      }),
      reconciled ? "reconciled" : "spooled",
    ],
  );
  return rows[0] ? mapPrintJob(rows[0]) : job;
}

async function reconcilePrintJob(job) {
  const response = await fetch(
    `${config.printBridgeUrl}/print-jobs/${encodeURIComponent(job.orderId)}/${encodeURIComponent(job.id)}`,
    {
      headers: bridgeHeaders(),
      signal: AbortSignal.timeout(5000),
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`Print bridge respondeu ${response.status} ao reconciliar`);
    error.statusCode = response.status;
    throw error;
  }
  const payload = await readBridgeJson(response, "reconciliar");
  assertBridgeStatus(payload?.status);
  return payload;
}

async function failPrintJob(job, error) {
  const errorClass = classifyPrintFailure(error);
  const deadLetter = errorClass === "permanent" || job.attempts >= PRINT_MAX_ATTEMPTS;
  const nextAttempt = new Date(Date.now() + printBackoffMs(job.attempts, job.id)).toISOString();
  const { rows } = await db.query(
    `UPDATE print_jobs
     SET status = $3,
         error = $4,
         error_class = $5,
         last_error_code = $6,
         next_attempt_at = $7,
         dead_lettered_at = CASE WHEN $3 = 'dead_letter' THEN NOW() ELSE NULL END,
         lease_owner = NULL,
         lease_expires_at = NULL,
         history = history || jsonb_build_array(jsonb_build_object(
           'at', NOW(), 'event', $3::text, 'attempt', attempts,
           'class', $5::text, 'code', $6::text
         ))
     WHERE id = $1 AND lease_owner = $2
     RETURNING *`,
    [
      job.id,
      printWorkerId,
      deadLetter ? "dead_letter" : "retry_wait",
      String(error.message || "Falha de impressão").slice(0, 1000),
      errorClass,
      String(error.code || error.statusCode || "PRINT_BRIDGE_UNAVAILABLE").slice(0, 128),
      nextAttempt,
    ],
  );
  return rows[0] ? mapPrintJob(rows[0]) : job;
}

async function dispatchPrintJob(candidate) {
  const job = await claimPrintJob(candidate?.id || null);
  if (!job) return candidate || null;

  try {
    assertPrintPayloadSize(job);
    if (job.attempts > 1) {
      const receipt = await reconcilePrintJob(job);
      if (receipt) return finalizePrintedJob(job, receipt, true);
    }
    const response = await fetch(`${config.printBridgeUrl}/print-jobs`, {
      method: "POST",
      headers: bridgeHeaders(),
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify(printPayload(job)),
    });
    if (!response.ok) {
      const error = new Error(`Print bridge respondeu ${response.status}`);
      error.statusCode = response.status;
      throw error;
    }
    const payload = await readBridgeJson(response, "imprimir");
    return finalizePrintedJob(job, payload, payload?.status === "already_printed");
  } catch (error) {
    return failPrintJob(job, error);
  }
}

let printRecoveryInFlight = false;
async function recoverPrintJobs() {
  if (printRecoveryInFlight) return;
  printRecoveryInFlight = true;
  try {
    for (let index = 0; index < 20; index += 1) {
      const result = await dispatchPrintJob();
      if (!result) break;
    }
  } finally {
    printRecoveryInFlight = false;
  }
}

async function getOpenShift(executor = db) {
  const { rows } = await executor.query(
    "SELECT * FROM cash_shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1 FOR UPDATE",
  );
  return rows[0] ? mapShift(rows[0]) : null;
}

function emitOrderEvent(type, payload) {
  sse.publish("orders", { type, payload, at: new Date().toISOString() });
}

function emitFinanceEvent(type, payload) {
  sse.publish("finance", { type, payload, at: new Date().toISOString() });
}

app.get("/health", async (_request, reply) => {
  try {
    await db.query("SELECT 1");
    return { ok: true, service: "api", database: "reachable" };
  } catch (error) {
    app.log.error(error, "Database health check failed");
    return reply.code(503).send({ ok: false, service: "api", database: "unreachable" });
  }
});
app.get("/", async (_request, reply) => reply.redirect("/app/"));
// HEAD route removed – Fastify automatically supports HEAD for GET routes
app.get("/catalog", async (request, reply) => {
  const includeArchived = request.query?.includeArchived === "true";
  if (includeArchived && !requireDemoAdmin(request, reply)) return reply;
  return {
    sourceUrl: CATALOG_SOURCE_URL,
    capturedAt: CATALOG_CAPTURED_AT,
    addOns: ADD_ONS,
    items: await listCatalogItems(db, { includeArchived }),
  };
});

app.post("/catalog/items", async (request, reply) => {
  if (!requireDemoAdmin(request, reply)) return reply;
  const item = normalizeCatalogItem(request.body);
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim() || null;
  const requestFingerprint = idempotencyKey
    ? fingerprint({ operation: "catalog-item:create", item })
    : null;
  try {
    const result = await db.transaction(async (client) => {
      if (idempotencyKey) {
        const claim = await claimIdempotency(client, {
          key: idempotencyKey,
          operation: "catalog-item:create",
          resource: `catalog-item:${item.sku}`,
          requestFingerprint,
        });
        if (claim.conflict) return { idempotencyConflict: claim.conflict };
        if (claim.repeated) {
          const saved = await getCatalogItem(claim.resultId, client);
          return saved
            ? { saved, repeated: true, responseStatus: claim.responseStatus }
            : { idempotencyConflict: "idempotency_result_missing" };
        }
      }
      const saved = await insertCatalogItem(item, client);
      await auditMutation(client, request, "catalog.item_added", null, saved);
      if (idempotencyKey) {
        await completeIdempotency(client, idempotencyKey, {
          resultType: "catalog_item",
          resultId: saved.sku,
          responseStatus: 201,
        });
      }
      return { saved, repeated: false, responseStatus: 201 };
    });
    if (result.idempotencyConflict)
      return sendIdempotencyConflict(reply, result.idempotencyConflict);
    if (!result.repeated)
      emitOrderEvent("catalog.changed", { action: "created", item: result.saved });
    return reply.code(result.responseStatus).send(result.saved);
  } catch (error) {
    if (error.code === "23505")
      return reply.code(409).send({ message: "SKU já existe e não pode ser reutilizado" });
    throw error;
  }
});

app.patch("/catalog/items/:sku", async (request, reply) => {
  if (!requireDemoAdmin(request, reply)) return reply;
  const expectedUpdatedAt = String(request.headers["if-match"] || "").trim();
  if (
    request.body?.sku != null &&
    String(request.body.sku).trim().toLowerCase() !== request.params.sku
  ) {
    return reply.code(400).send({ message: "SKU é imutável" });
  }
  const result = await db.transaction(async (client) => {
    const existing = await getCatalogItem(request.params.sku, client, { forUpdate: true });
    if (!existing || existing.archivedAt) return { notFound: true };
    if (expectedUpdatedAt && existing.updatedAt !== expectedUpdatedAt) return { stale: true };
    const saved = await updateCatalogItem(
      existing.sku,
      normalizeCatalogItem(request.body, existing),
      client,
    );
    await auditMutation(client, request, "catalog.item_updated", existing, saved);
    return { saved };
  });
  if (result.notFound) return reply.code(404).send({ message: "Item de catálogo não encontrado" });
  if (result.stale)
    return reply
      .code(412)
      .send({ message: "Item alterado por outra operação; recarregue antes de salvar" });
  const saved = result.saved;
  emitOrderEvent("catalog.changed", {
    action: saved.available ? "updated" : "paused",
    item: saved,
  });
  return saved;
});

app.delete("/catalog/items/:sku", async (request, reply) => {
  if (!requireDemoAdmin(request, reply)) return reply;
  const expectedUpdatedAt = String(request.headers["if-match"] || "").trim();
  const result = await db.transaction(async (client) => {
    const existing = await getCatalogItem(request.params.sku, client, { forUpdate: true });
    if (!existing) return { notFound: true };
    if (existing.archivedAt) return { saved: existing, repeated: true };
    if (expectedUpdatedAt && existing.updatedAt !== expectedUpdatedAt) return { stale: true };
    const saved = await archiveCatalogItem(existing.sku, client);
    await auditMutation(client, request, "catalog.item_archived", existing, saved);
    return { saved, repeated: false };
  });
  if (result.notFound) return reply.code(404).send({ message: "Item de catálogo não encontrado" });
  if (result.stale)
    return reply
      .code(412)
      .send({ message: "Item alterado por outra operação; recarregue antes de arquivar" });
  if (result.repeated) return result.saved;
  const saved = result.saved;
  emitOrderEvent("catalog.changed", { action: "archived", item: saved });
  return saved;
});
app.get("/scenario-rules", async () => ({
  items: [
    {
      id: "ticket-destaque-retirada",
      name: "Retirada destacada",
      event: "order.confirmed",
      active: true,
      condition: { fulfillmentMode: "pickup" },
      action: { priority: "high", label: "RETIRADA" },
    },
    {
      id: "ticket-whatsapp",
      name: "Origem WhatsApp no ticket",
      event: "order.confirmed",
      active: true,
      condition: { source: "whatsapp" },
      action: { emphasizeSource: true },
    },
  ],
}));

app.get("/inventory", async () => inventoryView());

app.post("/inventory/:category/adjustments", async (request, reply) => {
  const category = request.params.category;
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  const delta = Number(request.body?.delta);
  const note = String(request.body?.reason || "").trim();
  if (!["xis", "dog", "hamburguer"].includes(category))
    return reply.code(400).send({ message: "Categoria de estoque inválida" });
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });
  if (!Number.isInteger(delta) || delta === 0)
    return reply.code(400).send({ message: "Ajuste deve ser um inteiro diferente de zero" });
  if (!note) return reply.code(400).send({ message: "Motivo do ajuste é obrigatório" });

  const result = await db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [idempotencyKey]);
    const { rows: repeatedRows } = await client.query(
      "SELECT * FROM stock_movements WHERE idempotency_key = $1",
      [idempotencyKey],
    );
    if (repeatedRows[0]) {
      const original = repeatedRows[0];
      const samePayload =
        original.category === category &&
        Number(original.delta) === delta &&
        String(original.metadata?.note || "") === note;
      if (!samePayload) {
        const error = new Error("Idempotency-Key já usada com outro ajuste de estoque");
        error.statusCode = 409;
        throw error;
      }
      return { movement: original, repeated: true };
    }
    const { rows: balanceRows } = await client.query(
      "SELECT * FROM stock_balances WHERE category = $1 FOR UPDATE",
      [category],
    );
    const nextQuantity = Number(balanceRows[0].quantity) + delta;
    if (nextQuantity < 0) {
      const error = new Error("Ajuste deixaria o estoque negativo");
      error.statusCode = 409;
      throw error;
    }
    await client.query(
      "UPDATE stock_balances SET quantity = $2, updated_at = NOW() WHERE category = $1",
      [category, nextQuantity],
    );
    const { rows } = await client.query(
      `INSERT INTO stock_movements (id, category, delta, reason, idempotency_key, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,
      [
        randomUUID(),
        category,
        delta,
        delta > 0 ? "manual_entry" : "manual_withdrawal",
        idempotencyKey,
        JSON.stringify({ note }),
        new Date().toISOString(),
      ],
    );
    return { movement: rows[0], repeated: false };
  });
  return reply.code(result.repeated ? 200 : 201).send({
    ...(await inventoryView()),
    repeated: result.repeated,
  });
});

app.get("/tabs", async (request, reply) => {
  const status = request.query?.status || null;
  if (status && !["open", "closed", "cancelled"].includes(status)) {
    return reply.code(400).send({ message: "Status de comanda inválido" });
  }
  return { items: await listTabs(status) };
});

app.post("/tabs", async (request, reply) => {
  const kind = request.body?.kind || "tab";
  const label = String(request.body?.label || "").trim();
  if (!["tab", "table"].includes(kind))
    return reply.code(400).send({ message: "Tipo de comanda inválido" });
  if (!label) return reply.code(400).send({ message: "Identificador da comanda é obrigatório" });
  try {
    const { rows } = await db.query(
      `INSERT INTO service_tabs (id, kind, label, customer_name, status, opened_at)
       VALUES ($1,$2,$3,$4,'open',$5) RETURNING *`,
      [
        randomUUID(),
        kind,
        label,
        String(request.body?.customerName || "").trim() || null,
        new Date().toISOString(),
      ],
    );
    return reply.code(201).send(await tabView(mapTab(rows[0])));
  } catch (error) {
    if (error.code === "23505")
      return reply
        .code(409)
        .send({ message: "Já existe uma comanda aberta com este identificador" });
    throw error;
  }
});

app.get("/tabs/:tabId", async (request, reply) => {
  const tab = await getTab(request.params.tabId);
  return tab ? tabView(tab) : reply.code(404).send({ message: "Comanda não encontrada" });
});

app.post("/tabs/:tabId/rounds", async (request, reply) => {
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });
  const requestFingerprint = fingerprint(
    orderFingerprintPayload(request.body || {}, {
      source: "counter",
      fulfillmentMode: "local",
      paymentMethod: null,
      tabId: request.params.tabId,
    }),
  );
  const result = await db.transaction(async (client) => {
    const claim = await claimIdempotency(client, {
      key: idempotencyKey,
      operation: "tab-round:create",
      resource: `tab:${request.params.tabId}`,
      requestFingerprint,
    });
    if (claim.conflict) return { idempotencyConflict: claim.conflict };
    if (claim.repeated) {
      const saved = await getOrder(claim.resultId, client);
      return saved
        ? { saved, repeated: true, responseStatus: claim.responseStatus }
        : { idempotencyConflict: "idempotency_result_missing" };
    }
    const tab = await getTab(request.params.tabId, client, true);
    if (!tab) abortTransaction(404, "Comanda não encontrada");
    if (tab.status !== "open") abortTransaction(409, "Comanda não está aberta");
    const { rows } = await client.query(
      "SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round FROM orders WHERE tab_id = $1",
      [tab.id],
    );
    const catalog = await lockCatalogItems(request.body?.items, client);
    const order = confirmOrder(
      createOrder(
        {
          ...(request.body || {}),
          idempotencyKey,
          tabId: tab.id,
          roundNumber: Number(rows[0].next_round),
          source: "counter",
          fulfillmentMode: "local",
          paymentMethod: null,
          customerName: request.body?.customerName || tab.customerName || tab.label,
          metadata: { ...(request.body?.metadata || {}), tabLabel: tab.label },
        },
        { catalog },
      ),
    );
    const saved = await insertOrder(order, client);
    await auditMutation(client, request, "tab.round_added", null, saved);
    await changeStock(saved, -1, "sale", client);
    const printJob = await reservePrintJob(saved, "confirmed", client);
    await auditMutation(client, request, "order.created", null, saved);
    await completeIdempotency(client, idempotencyKey, {
      resultType: "order",
      resultId: saved.id,
      responseStatus: 201,
    });
    return { saved, printJob, repeated: false, responseStatus: 201 };
  });
  if (result.idempotencyConflict) return sendIdempotencyConflict(reply, result.idempotencyConflict);
  if (result.notFound) return reply.code(404).send({ message: "Comanda não encontrada" });
  if (result.conflict) return reply.code(409).send({ message: "Comanda não está aberta" });
  if (result.productionPending)
    return reply.code(409).send({
      code: "TAB_PRODUCTION_PENDING",
      message: "Aguarde a finalizacao dos itens na cozinha",
      pendingRounds: result.pendingRounds,
    });
  if (!result.repeated) emitOrderEvent("tab.round.created", result.saved);
  if (!result.repeated && result.saved.status === "ready") {
    emitOrderEvent("order.status.changed", {
      orderId: result.saved.id,
      previousStatus: "confirmed",
      nextStatus: "ready",
      order: result.saved,
    });
  }
  if (!result.repeated && result.printJob) await dispatchPrintJob(result.printJob);
  return reply.code(result.responseStatus).send(result.saved);
});

app.post("/tabs/:tabId/rounds/:orderId/cancellations", async (request, reply) => {
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });
  const requestFingerprint = fingerprint(
    cancellationFingerprintPayload({
      tabId: request.params.tabId,
      orderId: request.params.orderId,
      body: request.body || {},
    }),
  );
  const result = await db.transaction(async (client) => {
    const claim = await claimIdempotency(client, {
      key: idempotencyKey,
      operation: "tab-round:cancel",
      resource: `tab:${request.params.tabId}/order:${request.params.orderId}`,
      requestFingerprint,
    });
    if (claim.conflict) return { idempotencyConflict: claim.conflict };
    if (claim.repeated) {
      const saved = await getOrder(claim.resultId, client);
      return saved
        ? { saved, repeated: true, responseStatus: claim.responseStatus }
        : { idempotencyConflict: "idempotency_result_missing" };
    }
    const tab = await getTab(request.params.tabId, client, true);
    if (!tab) abortTransaction(404, "Comanda não encontrada");
    if (tab.status !== "open") abortTransaction(409, "Comanda não está aberta");
    const original = await getOrder(request.params.orderId, client, true);
    if (!original || original.tabId !== tab.id || original.roundKind !== "production") {
      abortTransaction(409, "Rodada original inválida");
    }
    const { rows: cancellationRows } = await client.query(
      "SELECT items FROM orders WHERE reverses_order_id = $1 AND round_kind = 'cancellation'",
      [original.id],
    );
    const previouslyCancelled = cancellationRows.flatMap((row) => row.items || []);
    const requested = request.body?.items;
    if (!Array.isArray(requested) || !requested.length)
      abortTransaction(400, "Informe ao menos um item para cancelar");
    if (new Set(requested.map((item) => item.itemId)).size !== requested.length) {
      abortTransaction(400, "Item de cancelamento duplicado");
    }
    const items = [];
    for (const requestedItem of requested) {
      const originalItem = original.items.find((item) => item.id === requestedItem.itemId);
      const quantity = Number(requestedItem.quantity);
      const cancelledQuantity = previouslyCancelled
        .filter((item) => item.reversesItemId === requestedItem.itemId)
        .reduce((sum, item) => sum + Number(item.quantity), 0);
      if (
        !originalItem ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        quantity > originalItem.quantity - cancelledQuantity
      ) {
        abortTransaction(400, "Quantidade de cancelamento inválida");
      }
      items.push({
        ...originalItem,
        id: undefined,
        quantity,
        reversesItemId: originalItem.id,
      });
    }
    const { rows } = await client.query(
      "SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round FROM orders WHERE tab_id = $1",
      [tab.id],
    );
    const cancellation = confirmOrder(
      createCancellationOrder({
        idempotencyKey,
        tabId: tab.id,
        roundNumber: Number(rows[0].next_round),
        reversesOrderId: original.id,
        source: "counter",
        fulfillmentMode: "local",
        paymentMethod: null,
        customerName: original.customerName,
        discountPercent: original.discountPercent,
        items,
        notes: String(request.body?.reason || "").trim(),
        metadata: {
          tabLabel: tab.label,
          originalStatusAtCancellation: original.status,
        },
      }),
    );
    const saved = await insertOrder(cancellation, client);
    if (original.status === "confirmed") {
      await changeStock(saved, 1, "cancellation", client, original.id);
    } else if (["in_preparation", "ready"].includes(original.status)) {
      await changeStock(saved, 1, "cancellation_loss", client, original.id);
    }
    const printJob = await reservePrintJob(saved, "cancellation", client);
    await auditMutation(client, request, "order.cancelled", original, saved);
    await completeIdempotency(client, idempotencyKey, {
      resultType: "order",
      resultId: saved.id,
      responseStatus: 201,
    });
    return { saved, printJob, repeated: false, responseStatus: 201 };
  });
  if (result.idempotencyConflict) return sendIdempotencyConflict(reply, result.idempotencyConflict);
  if (result.notFound) return reply.code(404).send({ message: "Comanda não encontrada" });
  if (result.conflict) return reply.code(409).send({ message: result.conflict });
  if (result.productionPending)
    return reply.code(409).send({
      code: "TAB_PRODUCTION_PENDING",
      message: "Aguarde a finalizacao dos itens na cozinha",
      pendingRounds: result.pendingRounds,
    });
  if (result.invalid) return reply.code(400).send({ message: result.invalid });
  if (!result.repeated) emitOrderEvent("tab.round.cancelled", result.saved);
  if (!result.repeated && result.printJob) await dispatchPrintJob(result.printJob);
  return reply.code(result.responseStatus).send(result.saved);
});

app.post("/tabs/:tabId/payments", async (request, reply) => {
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  const paymentMethod = String(request.body?.paymentMethod || "").trim();
  const amountCents = Number(request.body?.amountCents);
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });
  if (!TAB_PAYMENT_METHODS.includes(paymentMethod))
    return reply.code(400).send({ message: "Forma de pagamento inválida" });
  if (!Number.isInteger(amountCents) || amountCents <= 0)
    return reply.code(400).send({ message: "Valor em centavos deve ser um inteiro positivo" });

  const result = await db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [idempotencyKey]);
    const existing = await getTabPaymentByIdempotencyKey(idempotencyKey, client);
    const expected = {
      tabId: request.params.tabId,
      kind: "payment",
      paymentMethod,
      amountCents,
      reversesPaymentId: null,
    };
    if (existing)
      return sameTabPayment(existing, expected)
        ? {
            saved: existing,
            repeated: true,
            tab: await tabView(await getTab(request.params.tabId, client), client),
          }
        : { idempotencyConflict: true };

    const tab = await getTab(request.params.tabId, client, true);
    if (!tab) return { notFound: true };
    if (tab.status !== "open") return { closed: true };
    const view = await tabView(tab, client);
    if (amountCents > view.balanceCents)
      return { overpayment: true, balanceCents: view.balanceCents };
    const shift = await getOpenShift(client);
    if (!shift) return { noOpenShift: true };
    const saved = await insertTabPayment(
      {
        id: randomUUID(),
        tabId: tab.id,
        shiftId: shift?.id || null,
        kind: "payment",
        reversesPaymentId: null,
        paymentMethod,
        amountCents,
        idempotencyKey,
        metadata: {},
        createdAt: new Date().toISOString(),
      },
      client,
    );
    await insertEntries([buildEntryFromTabPayment({ payment: saved, tab })], client);
    if (shift && paymentMethod === "cash") {
      await updateShift(
        { ...shift, expectedAmount: toMoney(shift.expectedAmount + amountCents / 100) },
        "open",
        client,
      );
    }
    return { saved, repeated: false, tab: await tabView(tab, client) };
  });
  if (result.notFound) return reply.code(404).send({ message: "Comanda não encontrada" });
  if (result.closed) return reply.code(409).send({ message: "Comanda não está aberta" });
  if (result.noOpenShift)
    return reply.code(409).send({ message: "Abra o turno de caixa antes de registrar pagamentos" });
  if (result.idempotencyConflict)
    return reply.code(409).send({ message: "Idempotency-Key já usada com outro pagamento" });
  if (result.overpayment)
    return reply.code(409).send({
      code: "TAB_PAYMENT_EXCEEDS_BALANCE",
      message: "Pagamento ultrapassa o saldo restante",
      balanceCents: result.balanceCents,
    });
  emitFinanceEvent("tab.payment.recorded", result.saved);
  return reply.code(result.repeated ? 200 : 201).send(result);
});

app.post("/tabs/:tabId/payments/:paymentId/reversals", async (request, reply) => {
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });

  const result = await db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [idempotencyKey]);
    const existing = await getTabPaymentByIdempotencyKey(idempotencyKey, client);
    if (existing)
      return existing.tabId === request.params.tabId &&
        existing.kind === "reversal" &&
        existing.reversesPaymentId === request.params.paymentId
        ? {
            saved: existing,
            repeated: true,
            tab: await tabView(await getTab(request.params.tabId, client), client),
          }
        : { idempotencyConflict: true };

    const tab = await getTab(request.params.tabId, client, true);
    if (!tab) return { notFound: true };
    if (tab.status !== "open") return { closed: true };
    const original = await getTabPayment(request.params.paymentId, client, true);
    if (!original || original.tabId !== tab.id || original.kind !== "payment")
      return { paymentNotFound: true };
    const reversed = await client.query(
      "SELECT 1 FROM tab_payments WHERE reverses_payment_id = $1",
      [original.id],
    );
    if (reversed.rows[0]) return { alreadyReversed: true };
    const shift = await getOpenShift(client);
    if (!shift) return { noOpenShift: true };
    const saved = await insertTabPayment(
      {
        id: randomUUID(),
        tabId: tab.id,
        shiftId: shift?.id || null,
        kind: "reversal",
        reversesPaymentId: original.id,
        paymentMethod: original.paymentMethod,
        amountCents: -original.amountCents,
        idempotencyKey,
        metadata: { originalShiftId: original.shiftId },
        createdAt: new Date().toISOString(),
      },
      client,
    );
    await insertEntries([buildEntryFromTabPayment({ payment: saved, tab })], client);
    if (original.paymentMethod === "cash" && shift) {
      await updateShift(
        { ...shift, expectedAmount: toMoney(shift.expectedAmount - original.amountCents / 100) },
        "open",
        client,
      );
    }
    await client.query(
      `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, payload_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        randomUUID(),
        request.auth.user.id,
        "ESTORNO",
        "tab_payments",
        saved.id,
        JSON.stringify(saved),
      ],
    );
    return { saved, repeated: false, tab: await tabView(tab, client) };
  });
  if (result.notFound) return reply.code(404).send({ message: "Comanda não encontrada" });
  if (result.paymentNotFound) return reply.code(404).send({ message: "Pagamento não encontrado" });
  if (result.closed) return reply.code(409).send({ message: "Comanda não está aberta" });
  if (result.noOpenShift)
    return reply.code(409).send({ message: "Abra o turno de caixa antes de estornar pagamentos" });
  if (result.alreadyReversed) return reply.code(409).send({ message: "Pagamento já estornado" });
  if (result.idempotencyConflict)
    return reply.code(409).send({ message: "Idempotency-Key já usada com outro estorno" });
  emitFinanceEvent("tab.payment.reversed", result.saved);
  return reply.code(result.repeated ? 200 : 201).send(result);
});

app.post("/tabs/:tabId/close", async (request, reply) => {
  const result = await db.transaction(async (client) => {
    const tab = await getTab(request.params.tabId, client, true);
    if (!tab) return { notFound: true };
    if (tab.status !== "open") return { conflict: true };
    const view = await tabView(tab, client);
    const pendingRounds = view.rounds.filter(
      (r) => r.status === "confirmed" || r.status === "in_preparation",
    );
    if (pendingRounds.length > 0) return { productionPending: true, pendingRounds };
    if (view.balanceCents !== 0) return { balance: view.balance, balanceCents: view.balanceCents };
    const { rows } = await client.query(
      `UPDATE service_tabs SET status = 'closed', final_total = $2, closed_at = $3
       WHERE id = $1 AND status = 'open' RETURNING *`,
      [tab.id, view.total, new Date().toISOString()],
    );
    await client.query(
      `UPDATE orders SET status = 'completed', updated_at = $2
       WHERE tab_id = $1 AND status IN ('confirmed', 'in_preparation', 'ready')`,
      [tab.id, new Date().toISOString()],
    );
    const saved = await tabView(mapTab(rows[0]), client);
    return {
      saved,
      event: {
        eventId: randomUUID(),
        version: 1,
        tabId: saved.id,
        closedAt: saved.closedAt,
        roundOrderIds: saved.rounds.map((round) => round.id),
      },
    };
  });
  if (result.notFound) return reply.code(404).send({ message: "Comanda não encontrada" });
  if (result.conflict) return reply.code(409).send({ message: "Comanda já encerrada" });
  if (result.productionPending)
    return reply.code(409).send({
      code: "TAB_PRODUCTION_PENDING",
      message: "Aguarde a finalizacao dos itens na cozinha",
      pendingRounds: result.pendingRounds,
    });
  if (result.balance != null)
    return reply.code(409).send({
      code: "TAB_BALANCE_PENDING",
      message: "Registre os pagamentos antes de encerrar a comanda",
      balance: result.balance,
      balanceCents: result.balanceCents,
    });
  emitOrderEvent("tab.closed", result.event);
  return result.saved;
});

app.get("/orders", async () => ({ items: await listOrders() }));

app.post("/orders", async (request, reply) => {
  const idempotencyKey =
    String(request.headers["idempotency-key"] || request.body?.idempotencyKey || "").trim() || null;
  if (!idempotencyKey) {
    return reply.code(400).send({ message: "Idempotency-Key e obrigatorio" });
  }
  if (["ifood", "deliverymuch"].includes(request.body?.source)) {
    return reply.code(400).send({
      code: "EXTERNAL_SOURCE_REQUIRES_ADAPTER",
      message: "Pedidos iFood e Delivery Much devem entrar pelo adapter do canal",
    });
  }
  let dto;
  try {
    dto = normalizeStandaloneOrderDto(request.body || {});
  } catch (error) {
    return reply.code(error.statusCode || 400).send({
      code: error.code || "INVALID_ORDER_DTO",
      message: error.message,
    });
  }
  const requestFingerprint = fingerprint(orderFingerprintPayload(dto));
  const result = await db.transaction(async (client) => {
    const claim = await claimIdempotency(client, {
      key: idempotencyKey,
      operation: "order:create",
      resource: "orders",
      requestFingerprint,
    });
    if (claim.conflict) return { idempotencyConflict: claim.conflict };
    if (claim.repeated) {
      const saved = await getOrder(claim.resultId, client);
      return saved
        ? { saved, repeated: true, responseStatus: claim.responseStatus }
        : { idempotencyConflict: "idempotency_result_missing" };
    }
    const catalog = await lockCatalogItems(dto.items, client);
    const order = confirmOrder(createOrder({ ...dto, idempotencyKey }, { catalog }));
    const saved = await insertOrder(order, client);
    await changeStock(saved, -1, "sale", client);
    const printJob = await reservePrintJob(saved, "confirmed", client);
    await completeIdempotency(client, idempotencyKey, {
      resultType: "order",
      resultId: saved.id,
      responseStatus: 201,
    });
    return { saved, printJob, repeated: false, responseStatus: 201 };
  });
  if (result.idempotencyConflict) return sendIdempotencyConflict(reply, result.idempotencyConflict);
  if (!result.repeated) emitOrderEvent("order.created", result.saved);
  if (!result.repeated) emitOrderEvent("order.confirmed", result.saved);
  if (!result.repeated && result.saved.status === "ready") {
    emitOrderEvent("order.status.changed", {
      orderId: result.saved.id,
      previousStatus: "confirmed",
      nextStatus: "ready",
      order: result.saved,
    });
  }

  if (!result.repeated && result.printJob) {
    const printJob = await dispatchPrintJob(result.printJob);
    emitOrderEvent(printJob.status === "printed" ? "ticket.printed" : "ticket.print.failed", {
      orderId: result.saved.id,
      printJob,
    });
  }

  return reply.code(result.responseStatus).send(result.saved);
});

app.patch("/orders/:orderId/status", async (request, reply) => {
  const nextStatus = request.body?.status;
  const cancellationKey =
    nextStatus === "cancelled" ? String(request.headers["idempotency-key"] || "").trim() : null;
  const cancellationRequestFingerprint =
    nextStatus === "cancelled" && cancellationKey
      ? fingerprint({
          orderId: request.params.orderId,
          status: "cancelled",
          reason: String(request.body?.reason || "").trim(),
        })
      : null;
  const result = await db.transaction(async (client) => {
    const order = await getOrder(request.params.orderId, client, true);
    if (!order) return { notFound: true };
    if (!canRoleTransitionOrderStatus(request.auth?.user?.role, order.status, nextStatus)) {
      return { roleTransitionForbidden: true };
    }
    if (order.hasChannelMapping || ["ifood", "deliverymuch"].includes(order.source)) {
      return { integratedFlowRequired: true };
    }
    if (order.tabId && nextStatus === "cancelled") return { tabCancellationForbidden: true };
    if (nextStatus === "cancelled") {
      if (!cancellationKey) return { missingIdempotencyKey: true };
      const claim = await claimIdempotency(client, {
        key: cancellationKey,
        operation: "order:cancel",
        resource: `order:${order.id}`,
        requestFingerprint: cancellationRequestFingerprint,
      });
      if (claim.conflict) return { idempotencyConflict: claim.conflict };
      if (claim.repeated) {
        const saved = await getOrder(claim.resultId, client);
        return saved
          ? { saved, previousStatus: saved.status, entries: [], printJob: null, repeated: true }
          : { idempotencyConflict: "idempotency_result_missing" };
      }
    }
    if (order.status === nextStatus) {
      if (nextStatus === "cancelled") {
        await completeIdempotency(client, cancellationKey, {
          resultType: "order",
          resultId: order.id,
          responseStatus: 200,
        });
      }
      return {
        saved: order,
        previousStatus: order.status,
        entries: [],
        printJob: null,
        repeated: true,
      };
    }

    const previousStatus = order.status;
    let shift = null;
    let financeShiftId = null;
    if (nextStatus === "completed") {
      shift = await getOpenShift(client);
      if (!shift) return { noOpenShift: true };
      financeShiftId = shift.id;
    } else if (previousStatus === "completed" && nextStatus === "cancelled") {
      const { rows: saleRows } = await client.query(
        `SELECT shift_id FROM finance_entries
         WHERE order_id = $1 AND type = 'sale'
         ORDER BY occurred_at LIMIT 1 FOR UPDATE`,
        [order.id],
      );
      financeShiftId = saleRows[0]?.shift_id || null;
      if (financeShiftId) shift = await getShift(financeShiftId, client, true);
    }
    const updated = transitionOrder(order, nextStatus);
    const saved = await updateOrder(updated, previousStatus, client);
    if (!saved) return { conflict: true };
    if (
      !saved.tabId &&
      ["confirmed", "in_preparation", "ready"].includes(previousStatus) &&
      nextStatus === "cancelled"
    ) {
      if (previousStatus === "confirmed") {
        await changeStock(saved, 1, "cancellation", client, saved.id);
      } else {
        await changeStock(saved, 1, "cancellation_loss", client, saved.id);
      }
    }

    const printJob =
      nextStatus === "confirmed" ? await reservePrintJob(saved, "confirmed", client) : null;
    const entries = saved.tabId
      ? []
      : await insertEntries(
          buildEntriesFromOrder({
            order: saved,
            previousStatus,
            nextStatus,
            shiftId: financeShiftId,
          }),
          client,
        );
    const cashDelta = entries
      .filter((entry) => entry.paymentMethod === "cash")
      .reduce((total, entry) => total + Number(entry.amount), 0);
    if (shift?.status === "open" && cashDelta) {
      await updateShift(
        {
          ...shift,
          expectedAmount: shift.expectedAmount + cashDelta,
        },
        "open",
        client,
      );
    }
    if (nextStatus === "cancelled") {
      await completeIdempotency(client, cancellationKey, {
        resultType: "order",
        resultId: saved.id,
        responseStatus: 200,
      });
    }
    return { saved, previousStatus, entries, printJob, repeated: false };
  });

  if (result.notFound) return reply.code(404).send({ message: "Pedido não encontrado" });
  if (result.roleTransitionForbidden) {
    return reply.code(403).send({ error: "Permissao insuficiente" });
  }
  if (result.integratedFlowRequired)
    return reply.code(409).send({
      code: "INTEGRATED_FLOW_REQUIRED",
      message: "Pedido integrado deve ser alterado pelo comando do canal",
    });
  if (result.noOpenShift)
    return reply.code(409).send({
      code: "CASH_SHIFT_REQUIRED",
      message: "Abra o turno de caixa antes de concluir o pedido",
    });
  if (result.missingIdempotencyKey) {
    return reply.code(400).send({ message: "Idempotency-Key é obrigatório para cancelamento" });
  }
  if (result.idempotencyConflict) return sendIdempotencyConflict(reply, result.idempotencyConflict);
  if (result.tabCancellationForbidden)
    return reply
      .code(409)
      .send({ message: "Use um ticket corretivo para cancelar itens da comanda" });
  if (result.conflict)
    return reply.code(409).send({ message: "Pedido foi alterado; atualize a tela" });
  if (result.productionPending)
    return reply.code(409).send({
      code: "TAB_PRODUCTION_PENDING",
      message: "Aguarde a finalizacao dos itens na cozinha",
      pendingRounds: result.pendingRounds,
    });
  if (result.repeated) return result.saved;

  if (result.printJob) {
    const printJob = await dispatchPrintJob(result.printJob);
    emitOrderEvent(printJob.status === "printed" ? "ticket.printed" : "ticket.print.failed", {
      orderId: result.saved.id,
      printJob,
    });
  }
  if (result.entries.length) emitFinanceEvent("finance.entry.created", result.entries);

  emitOrderEvent("order.status.changed", {
    orderId: result.saved.id,
    previousStatus: result.previousStatus,
    nextStatus,
    order: result.saved,
  });

  return result.saved;
});

app.patch("/orders/:orderId/discount", async (request, reply) => {
  const discountPercent = Number(request.body?.discountPercent ?? 0);
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return reply.code(400).send({ message: "Desconto inválido: informe um valor entre 0 e 100" });
  }

  const result = await db.transaction(async (client) => {
    const order = await getOrder(request.params.orderId, client, true);
    if (!order) return { notFound: true };
    if (order.hasChannelMapping || ["ifood", "deliverymuch"].includes(order.source)) {
      return { integratedFlowRequired: true };
    }
    if (order.tabId) return { forbiddenTab: true };
    if (["ifood", "deliverymuch", "olaclick"].includes(order.source)) {
      return { forbiddenApp: true };
    }
    if (["completed", "cancelled"].includes(order.status)) return { financialEffect: true };
    const { rows: financeRows } = await client.query(
      "SELECT 1 FROM finance_entries WHERE order_id = $1 LIMIT 1",
      [order.id],
    );
    if (financeRows[0]) return { financialEffect: true };
    const updated = {
      ...order,
      discountPercent,
      total: calculateOrderTotal(order.items, discountPercent),
      updatedAt: new Date().toISOString(),
    };
    const saved = await updateOrder(updated, order.status, client);
    await client.query(
      `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, payload_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        randomUUID(),
        request.auth?.user?.id ?? "system",
        "APLICACAO_DESCONTO",
        "orders",
        order.id,
        JSON.stringify({ discountPercent, total: updated.total }),
      ],
    );
    return { saved };
  });

  if (result.notFound) return reply.code(404).send({ message: "Pedido não encontrado" });
  if (result.integratedFlowRequired)
    return reply.code(409).send({
      code: "INTEGRATED_FLOW_REQUIRED",
      message: "Pedido integrado deve ser alterado pelo comando do canal",
    });
  if (result.forbiddenTab)
    return reply
      .code(409)
      .send({ message: "Use um ticket corretivo para alterar itens da comanda" });
  if (result.forbiddenApp)
    return reply
      .code(400)
      .send({ message: "Desconto não pode ser alterado em pedidos de aplicativos externos" });
  if (result.financialEffect)
    return reply.code(409).send({
      code: "FINANCIAL_EFFECT_IMMUTABLE",
      message: "Desconto não pode mudar após efeito financeiro ou estado terminal",
    });

  emitOrderEvent("order.updated", result.saved);
  return result.saved;
});

app.post("/orders/:orderId/tab-assignment", async (request, reply) => {
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });
  let normalizedPayload;
  try {
    normalizedPayload = normalizeTabAssignmentPayload(request.body);
  } catch (error) {
    return reply.code(400).send({ message: error.message });
  }

  let result;
  try {
    result = await db.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        `order-tab-assignment:${idempotencyKey}`,
      ]);
      const replay = await getOrderTabAssignmentByKey(idempotencyKey, client);
      if (replay) {
        if (!sameTabAssignment(replay, request.params.orderId, normalizedPayload)) {
          return { idempotencyConflict: true };
        }
        return {
          assignment: replay,
          order: await getOrder(replay.orderId, client),
          tab: await tabView(await getTab(replay.tabId, client), client),
          repeated: true,
        };
      }

      let tab = null;
      if (normalizedPayload.tabId) {
        tab = await getTab(normalizedPayload.tabId, client, true);
        if (!tab) return { tabNotFound: true };
        if (tab.status !== "open") return { tabClosed: true };
      }

      const order = await getOrder(request.params.orderId, client, true);
      if (!order) return { orderNotFound: true };
      const eligibility = tabAssignmentEligibility(
        order,
        await orderAssignmentFlags(order.id, client),
      );
      if (!eligibility.eligible) return { ineligible: eligibility };

      const assignedAt = new Date().toISOString();
      if (!tab) {
        const { newTab } = normalizedPayload;
        const { rows } = await client.query(
          `INSERT INTO service_tabs (id, kind, label, customer_name, status, opened_at)
           VALUES ($1,$2,$3,$4,'open',$5) RETURNING *`,
          [randomUUID(), newTab.kind, newTab.label, newTab.customerName, assignedAt],
        );
        tab = mapTab(rows[0]);
      }

      const roundResult = await client.query(
        "SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round FROM orders WHERE tab_id = $1",
        [tab.id],
      );
      const roundNumber = Number(roundResult.rows[0].next_round);
      const assignmentId = randomUUID();
      const auditMetadata = {
        tabLabel: tab.label,
        tabAssignment: {
          assignmentId,
          assignedAt,
          originalPaymentMethod: order.paymentMethod,
        },
      };
      const { rows: orderRows } = await client.query(
        `UPDATE orders
         SET tab_id = $2,
             round_number = $3,
             metadata = metadata || $4::jsonb,
             updated_at = $5
         WHERE id = $1 AND tab_id IS NULL
         RETURNING *`,
        [order.id, tab.id, roundNumber, JSON.stringify(auditMetadata), assignedAt],
      );
      if (!orderRows[0]) return { ineligible: { eligible: false, reason: "already_assigned" } };
      const { rows: assignmentRows } = await client.query(
        `INSERT INTO order_tab_assignments (
          id, idempotency_key, order_id, tab_id, round_number, normalized_payload, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,
        [
          assignmentId,
          idempotencyKey,
          order.id,
          tab.id,
          roundNumber,
          JSON.stringify(normalizedPayload),
          assignedAt,
        ],
      );
      return {
        assignment: mapOrderTabAssignment(assignmentRows[0]),
        order: mapOrder(orderRows[0]),
        tab: await tabView(tab, client),
        repeated: false,
      };
    });
  } catch (error) {
    if (error.code === "23505") {
      const replay = await getOrderTabAssignmentByKey(idempotencyKey);
      if (replay && sameTabAssignment(replay, request.params.orderId, normalizedPayload)) {
        return reply.send({
          assignment: replay,
          order: await getOrder(replay.orderId),
          tab: await tabView(await getTab(replay.tabId)),
          repeated: true,
        });
      }
      return reply
        .code(409)
        .send({ message: "Já existe uma comanda aberta com este identificador" });
    }
    throw error;
  }

  if (result.idempotencyConflict)
    return reply.code(409).send({ message: "Idempotency-Key já usada com outra atribuição" });
  if (result.orderNotFound) return reply.code(404).send({ message: "Pedido não encontrado" });
  if (result.tabNotFound) return reply.code(404).send({ message: "Comanda não encontrada" });
  if (result.tabClosed) return reply.code(409).send({ message: "Comanda não está aberta" });
  if (result.ineligible)
    return reply.code(409).send({
      code: "ORDER_TAB_ASSIGNMENT_INELIGIBLE",
      message: "Pedido não pode ser vinculado a uma comanda",
      reason: result.ineligible.reason,
    });
  if (!result.repeated) emitOrderEvent("order.tab.assigned", result);
  return reply.code(result.repeated ? 200 : 201).send(result);
});

app.post("/orders/:orderId/reprint", async (request, reply) => {
  const result = await db.transaction(async (client) => {
    const order = await getOrder(request.params.orderId, client);
    if (!order) return { notFound: true };
    const original = await getPrimaryPrintJob(order.id, client);
    if (!original) return { missingOriginal: true };
    return { order, printJob: await reserveReprintJob(original, client) };
  });
  if (result.notFound) return reply.code(404).send({ message: "Pedido não encontrado" });
  if (result.missingOriginal)
    return reply.code(409).send({ message: "Ticket original não encontrado" });
  const printJob = await dispatchPrintJob(result.printJob);
  emitOrderEvent(printJob.status === "printed" ? "ticket.printed" : "ticket.print.failed", {
    orderId: result.order.id,
    printJob,
  });
  return { ok: true, printJob };
});

app.get("/print-jobs", async (request, reply) => {
  const status = String(request.query?.status || "").trim();
  const allowed = ["pending", "sending", "retry_wait", "printed", "dead_letter"];
  if (status && !allowed.includes(status)) {
    return reply.code(400).send({ message: "Status de impressão inválido" });
  }
  const { rows } = await db.query(
    `SELECT * FROM print_jobs
     ${status ? "WHERE status = $1" : ""}
     ORDER BY created_at DESC
     LIMIT 100`,
    status ? [status] : [],
  );
  return { items: rows.map(mapPrintJob) };
});

app.post("/print-jobs/:jobId/reprocess", async (request, reply) => {
  const result = await db.transaction(async (client) => {
    const existing = await client.query("SELECT * FROM print_jobs WHERE id = $1 FOR UPDATE", [
      request.params.jobId,
    ]);
    const original = existing.rows[0];
    if (!original) return { notFound: true };
    if (original.status !== "dead_letter") return { conflict: true };
    const { rows } = await client.query(
      `UPDATE print_jobs
       SET status = 'retry_wait',
           attempts = 0,
           next_attempt_at = NOW(),
           error = NULL,
           error_class = NULL,
           last_error_code = NULL,
           dead_lettered_at = NULL,
           lease_owner = NULL,
           lease_expires_at = NULL,
           history = history || jsonb_build_array(jsonb_build_object(
             'at', NOW(), 'event', 'manual_reprocess',
             'actorId', $2::text
           ))
       WHERE id = $1
       RETURNING *`,
      [request.params.jobId, request.auth.user.id],
    );
    const saved = mapPrintJob(rows[0]);
    await auditMutation(client, request, "print_job.reprocessed", original, saved);
    return { saved };
  });
  if (result.notFound) return reply.code(404).send({ message: "Job de impressao nao encontrado" });
  const existing = { rows: [true] };
  if (result.conflict) {
    if (result.productionPending)
      return reply.code(409).send({
        code: "TAB_PRODUCTION_PENDING",
        message: "Aguarde a finalizacao dos itens na cozinha",
        pendingRounds: result.pendingRounds,
      });
    if (!existing.rows[0])
      return reply.code(404).send({ message: "Job de impressão não encontrado" });
    return reply.code(409).send({
      code: "PRINT_JOB_NOT_DEAD_LETTER",
      message: "Somente jobs em dead-letter podem ser reprocessados",
    });
  }
  return reply.code(202).send({ ok: true, printJob: result.saved });
});

app.get("/kitchen/queue", async () => {
  const items = (await listOrders()).filter((order) =>
    ["confirmed", "in_preparation", "ready"].includes(order.status),
  );
  return { items };
});

app.get("/finance/entries", async (request) => {
  const entries = await listEntries();
  return {
    items: filterEntries(entries, request.query || {}, { timeZone: config.businessTimeZone }),
    businessTimeZone: config.businessTimeZone,
  };
});

app.get("/finance/summary", async (request) => {
  const entries = filterEntries(await listEntries(), request.query || {}, {
    timeZone: config.businessTimeZone,
  });
  return summarizeFinance(entries, { timeZone: config.businessTimeZone });
});

app.get("/cash-shifts", async () => ({ items: await listShifts() }));

app.post("/cash-shifts/open", async (request, reply) => {
  const shift = createCashShift(request.body || {});
  let result;
  try {
    result = await db.transaction(async (client) => {
      const saved = await insertShift(shift, client);
      const [openingEntry] = await insertEntries([buildOpeningEntry(saved)], client);
      return { saved, openingEntry };
    });
  } catch (error) {
    if (error.code === "23505") return reply.code(409).send({ message: "O caixa já está aberto" });
    throw error;
  }
  emitFinanceEvent("cash.shift.opened", result.saved);
  return reply.code(201).send(result.saved);
});

app.post("/cash-shifts/:shiftId/adjustments", async (request, reply) => {
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  if (!idempotencyKey) return reply.code(400).send({ message: "Idempotency-Key é obrigatório" });
  const kind = request.body?.kind || "reinforcement";
  const reason = String(request.body?.reason || "").trim();
  const requestFingerprint = fingerprint({
    shiftId: request.params.shiftId,
    kind,
    amountCents: moneyCents(request.body?.amount || 0),
    reason,
  });
  const result = await db.transaction(async (client) => {
    const claim = await claimIdempotency(client, {
      key: idempotencyKey,
      operation: "cash-adjustment:create",
      resource: `cash-shift:${request.params.shiftId}`,
      requestFingerprint,
    });
    if (claim.conflict) return { idempotencyConflict: claim.conflict };
    if (claim.repeated) {
      const { rows } = await client.query("SELECT * FROM finance_entries WHERE id = $1", [
        claim.resultId,
      ]);
      const shift = await getShift(request.params.shiftId, client);
      return rows[0] && shift
        ? { shift, entry: mapFinanceEntry(rows[0]), repeated: true }
        : { idempotencyConflict: "idempotency_result_missing" };
    }
    const shift = await getShift(request.params.shiftId, client, true);
    if (!shift) {
      const error = new Error("Caixa não encontrado");
      error.statusCode = 404;
      throw error;
    }
    if (shift.status !== "open") {
      const error = new Error("O caixa está fechado");
      error.statusCode = 409;
      throw error;
    }

    const entry = buildEntryFromAdjustment({
      shift,
      kind,
      amount: request.body?.amount || 0,
      reason,
    });
    const updatedShift = await updateShift(
      {
        ...shift,
        expectedAmount: shift.expectedAmount + entry.amount,
      },
      "open",
      client,
    );
    if (!updatedShift) return { conflict: true };
    const [savedEntry] = await insertEntries([entry], client);
    await completeIdempotency(client, idempotencyKey, {
      resultType: "finance_entry",
      resultId: savedEntry.id,
      responseStatus: 200,
    });
    if (kind === "withdrawal") {
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, payload_snapshot)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          randomUUID(),
          request.auth?.user?.id ?? "system",
          "SAQUE_CAIXA",
          "finance_entries",
          savedEntry.id,
          JSON.stringify(savedEntry),
        ],
      );
    }
    return { shift: updatedShift, entry: savedEntry, repeated: false };
  });

  if (result.idempotencyConflict) return sendIdempotencyConflict(reply, result.idempotencyConflict);
  if (result.conflict) return reply.code(409).send({ message: "O caixa está fechado" });
  if (result.productionPending)
    return reply.code(409).send({
      code: "TAB_PRODUCTION_PENDING",
      message: "Aguarde a finalizacao dos itens na cozinha",
      pendingRounds: result.pendingRounds,
    });
  if (!result.repeated) emitFinanceEvent("cash.adjustment.created", result);
  return result;
});

app.post("/cash-shifts/:shiftId/close", async (request, reply) => {
  const result = await db.transaction(async (client) => {
    const shift = await getShift(request.params.shiftId, client, true);
    if (!shift) return { notFound: true };
    if (shift.status !== "open") return { conflict: true };

    const { rows } = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS expected_amount
       FROM finance_entries
       WHERE shift_id = $1 AND payment_method = 'cash' AND type <> 'closing_adjustment'`,
      [shift.id],
    );
    const closed = closeCashShift(
      { ...shift, expectedAmount: Number(rows[0].expected_amount) },
      request.body?.declaredAmount || 0,
    );
    const saved = await updateShift(closed, "open", client);
    if (!saved) return { conflict: true };

    if (saved.differenceAmount) {
      await insertEntries(
        [
          {
            id: randomUUID(),
            orderId: null,
            shiftId: saved.id,
            type: "closing_adjustment",
            amount: saved.differenceAmount,
            paymentMethod: "cash",
            source: "counter",
            label: "Diferença de fechamento",
            occurredAt: new Date().toISOString(),
            metadata: {},
          },
        ],
        client,
      );
    }
    return { saved };
  });

  if (result.notFound) return reply.code(404).send({ message: "Caixa não encontrado" });
  if (result.conflict) return reply.code(409).send({ message: "O caixa já está fechado" });
  if (result.productionPending)
    return reply.code(409).send({
      code: "TAB_PRODUCTION_PENDING",
      message: "Aguarde a finalizacao dos itens na cozinha",
      pendingRounds: result.pendingRounds,
    });
  emitFinanceEvent("cash.shift.closed", result.saved);
  return result.saved;
});

app.post("/lgpd/anonymize", async (request, reply) => {
  if (!requireDemoAdmin(request, reply)) return reply;
  const idempotencyKey = String(request.headers["idempotency-key"] || "").trim();
  if (!idempotencyKey) return reply.code(400).send({ error: "Idempotency-Key é obrigatório" });
  const searchTerm = String(request.body?.searchTerm || "").trim();
  if (searchTerm.length < 3) {
    return reply
      .code(400)
      .send({ error: "Termo de busca (min 3 chars) obrigatorio para anonimizacao" });
  }
  let result;
  try {
    result = await db.anonymizeCustomerData(searchTerm, {
      requestId: randomUUID(),
      idempotencyKey,
      requestFingerprint: fingerprint({ searchTerm }),
    });
  } catch (error) {
    if (error.statusCode === 409)
      return reply.code(409).send({
        code: error.code || "idempotency_payload_mismatch",
        error: "Idempotency-Key já usada em outra anonimização",
      });
    throw error;
  }

  const artifacts = result.printArtifacts || [];
  let cleanupComplete = artifacts.length === 0;
  let cleanupError = null;
  if (artifacts.length) {
    try {
      const response = await fetch(`${config.printBridgeUrl}/privacy/anonymize`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.printBridgeToken
            ? { authorization: `Bearer ${config.printBridgeToken}` }
            : {}),
        },
        body: JSON.stringify({ artifacts }),
        signal: AbortSignal.timeout(10_000),
      });
      cleanupComplete = response.ok;
      if (!response.ok) cleanupError = `bridge_http_${response.status}`;
    } catch {
      cleanupError = "print_bridge_unavailable";
    }
  }
  const { printArtifacts: _privateArtifacts, status: _databaseStatus, ...safeResult } = result;
  const publicResult = {
    ...safeResult,
    externalCleanup: cleanupComplete ? "completed" : "pending",
    pendingArtifacts: cleanupComplete ? [] : ["print_spool"],
    backupPolicy: "provider_retention_not_modified",
  };
  await db.completePrivacyRequest(
    result.requestId,
    cleanupComplete ? "completed" : "pending_external_cleanup",
    { ...result, cleanupError },
  );
  return reply.code(cleanupComplete ? 200 : 202).send({
    success: cleanupComplete,
    status: cleanupComplete ? "completed" : "pending_external_cleanup",
    ...publicResult,
  });
});

function openEventStream(request, reply, channel) {
  const origin = request.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    reply.raw.setHeader("access-control-allow-origin", origin);
    reply.raw.setHeader("access-control-allow-credentials", "true");
    reply.raw.setHeader("vary", "Origin");
  }
  reply.raw.setHeader("content-type", "text/event-stream");
  reply.raw.setHeader("cache-control", "no-cache");
  reply.raw.setHeader("connection", "keep-alive");
  reply.raw.setHeader("x-accel-buffering", "no");
  reply.raw.flushHeaders();
  reply.raw.write("retry: 3000\n\n");
  const sessionToken = readCookie(request, "camoburguer_session");
  sse.subscribe(channel, reply, async () => {
    const session = await authenticate(db, sessionToken);
    return Boolean(session && hasPermission(session.user.role, `sse:${channel}`));
  });
  return reply;
}

app.get("/events/orders", async (request, reply) => {
  return openEventStream(request, reply, "orders");
});

app.get("/events/finance", async (request, reply) => {
  return openEventStream(request, reply, "finance");
});

app.post("/demo/seed", async (request, reply) => {
  const confirmedTarget = String(request.body?.confirmTarget || "").trim();
  const logDecision = ({ decision, target, blockers }) =>
    app.log.info({
      event: "demo_seed",
      actorId: request.auth.user.id,
      decision,
      target,
      blockers,
    });
  try {
    await runSeedDemo(db, {
      authenticated: true,
      environment: config.appEnvironment,
      enabled: config.demoSeedEnabled,
      expectedTarget: config.demoSeedTarget,
      confirmedTarget,
      onDecision: logDecision,
    });
    logDecision({
      decision: "seeded",
      target: config.demoSeedTarget,
      blockers: [],
    });
    return {
      ok: true,
      target: config.demoSeedTarget,
      message: "Banco de dados preenchido com dados de demonstração.",
    };
  } catch (error) {
    const statusCode = Number(error.statusCode) || 500;
    app.log[statusCode === 500 ? "error" : "warn"]({
      event: "demo_seed",
      actorId: request.auth.user.id,
      decision: "refused",
      target: error.details?.target || null,
      blockers: error.details?.blockers || [],
      code: error.code || "internal_error",
    });
    return reply.code(statusCode).send({
      code: statusCode === 500 ? "internal_error" : error.code,
      error: statusCode === 500 ? "Falha interna ao executar seed." : error.message,
      ...(error.details?.blockers ? { blockers: error.details.blockers } : {}),
    });
  }
});

await app.register(integrationRoutes, { db, sse, config });

await db.init();
await ensureBootstrapAdmin(db, config.adminBootstrapPassword, {
  resetExisting: config.appEnvironment === "demo",
});
await recoverPrintJobs();
setInterval(() => recoverPrintJobs().catch((error) => app.log.error(error)), 15_000).unref();

db.updateOrder = updateOrder;
db.changeStock = changeStock;
db.reservePrintJob = reservePrintJob;
db.insertOrder = insertOrder;

startIntegrationPolling({ config, db, sse });

await app.listen({ host: "0.0.0.0", port: config.port });
