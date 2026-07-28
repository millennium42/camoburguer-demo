import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SESSION_IDLE_MS = 8 * 60 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_FAILURE = { error: "Credenciais invalidas" };
const revokedTokens = new Set();

export const ROLE_PERMISSIONS = Object.freeze({
  admin: ["*"],
  operator: ["orders", "tabs", "cash", "finance", "catalog:read", "stock:read", "print:read", "sse:orders", "sse:finance"],
  kitchen: ["orders:read", "orders:prepare", "sse:orders"]
});

const loginAttempts = new Map();

function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const derived = await scrypt(String(password), salt, 64);
  return `scrypt-v1$${salt}$${Buffer.from(derived).toString("base64url")}`;
}

export async function verifyPassword(password, stored) {
  const [version, salt, encoded] = String(stored || "").split("$");
  if (version !== "scrypt-v1" || !salt || !encoded) return false;
  const derived = await scrypt(String(password), salt, 64);
  return safeEqual(Buffer.from(derived).toString("base64url"), encoded);
}

export function permissionForRequest(method, path) {
  if (path === "/events/orders") return "sse:orders";
  if (path === "/events/finance") return "sse:finance";
  if (path === "/kitchen/queue") return "orders:read";
  if (path === "/scenario-rules") return "orders:read";
  if (path.startsWith("/integrations") || path.startsWith("/demo") || path.startsWith("/lgpd")) return "admin";
  if (/^\/orders\/[^/]+\/(accept|cancel|start-preparation|ready|cancellation-reasons)$/.test(path)) return "admin";
  if (/^\/orders\/[^/]+\/reprint$/.test(path)) return "admin";
  if (/^\/print-jobs\/[^/]+\/reprocess$/.test(path)) return "admin";
  if (path.startsWith("/catalog")) return method === "GET" ? "catalog:read" : "admin";
  if (path.startsWith("/stock") || path.startsWith("/inventory")) return method === "GET" ? "stock:read" : "admin";
  if (path.startsWith("/cash-shifts")) return "cash";
  if (path.startsWith("/finance")) return "finance";
  if (path.startsWith("/tabs")) return "tabs";
  if (method === "PATCH" && /^\/orders\/[^/]+\/status$/.test(path)) return "orders:prepare";
  if (path.startsWith("/orders")) return method === "GET" ? "orders:read" : "orders";
  if (path.startsWith("/print")) return "print:read";
  return null;
}

export function hasPermission(role, permission) {
  const granted = ROLE_PERMISSIONS[role] || [];
  return granted.includes("*") || granted.includes(permission)
    || (permission.startsWith("orders:") && granted.includes("orders"));
}

export function canRoleTransitionOrderStatus(role, previousStatus, nextStatus) {
  if (role !== "kitchen") return true;
  if (previousStatus === "confirmed" && nextStatus === "in_preparation") return true;
  if (previousStatus === "in_preparation" && nextStatus === "ready") return true;
  if (previousStatus === nextStatus && (nextStatus === "in_preparation" || nextStatus === "ready")) return true;
  return false;
}

export async function ensureBootstrapAdmin(db, bootstrapPassword) {
  if (!bootstrapPassword) return;
  await db.transaction(async (client) => {
    await client.query("LOCK TABLE users IN EXCLUSIVE MODE");
    const existing = await client.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    if (existing.rowCount) return;
    await client.query(
      "INSERT INTO users (id, username, role, password_hash) VALUES ($1, 'admin', 'admin', $2)",
      [randomBytes(16).toString("hex"), await hashPassword(bootstrapPassword)]
    );
  });
}

function loginKey(ip, username) {
  return `${ip || "unknown"}:${String(username || "").trim().toLowerCase()}`;
}

function allowedLogin(key, now) {
  const values = (loginAttempts.get(key) || []).filter((at) => now - at < LOGIN_WINDOW_MS);
  loginAttempts.set(key, values);
  return values.length < LOGIN_MAX_ATTEMPTS;
}

function recordFailure(key, now) {
  const values = (loginAttempts.get(key) || []).filter((at) => now - at < LOGIN_WINDOW_MS);
  values.push(now);
  loginAttempts.set(key, values);
}

export async function login(db, { username, password, ip, now = new Date() }) {
  const key = loginKey(ip, username);
  if (!allowedLogin(key, now.getTime())) return { ok: false, rateLimited: true, body: LOGIN_FAILURE };
  const result = await db.query("SELECT id, username, role, password_hash FROM users WHERE username = $1", [String(username || "").trim().toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    recordFailure(key, now.getTime());
    return { ok: false, body: LOGIN_FAILURE };
  }
  loginAttempts.delete(key);
  const token = randomBytes(32).toString("base64url");
  const csrfToken = createCsrfToken();
  const createdAt = now;
  const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);
  const idleExpiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
  await db.query(
    `INSERT INTO auth_sessions (id, token_hash, csrf_hash, user_id, created_at, last_seen_at, idle_expires_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $5, $6, $7)`,
    [randomBytes(16).toString("hex"), hashToken(token), hashToken(csrfToken), user.id, createdAt, idleExpiresAt, expiresAt]
  );
  return { ok: true, token, csrfToken, user: { id: user.id, username: user.username, role: user.role }, expiresAt };
}

export async function authenticate(db, token, now = new Date()) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  if (revokedTokens.has(tokenHash)) return null;
  const result = await db.query(
    `SELECT s.id, s.user_id, s.csrf_hash, s.expires_at, s.idle_expires_at, u.username, u.role
     FROM auth_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL`, [tokenHash]
  );
  const session = result.rows[0];
  if (!session || new Date(session.expires_at) <= now || new Date(session.idle_expires_at) <= now) return null;
  const idleExpiresAt = new Date(Math.min(now.getTime() + SESSION_IDLE_MS, new Date(session.expires_at).getTime()));
  await db.query("UPDATE auth_sessions SET last_seen_at = $2, idle_expires_at = $3 WHERE id = $1", [session.id, now, idleExpiresAt]);
  return {
    sessionId: session.id,
    csrfHash: session.csrf_hash,
    expiresAt: new Date(session.expires_at),
    idleExpiresAt,
    user: { id: session.user_id, username: session.username, role: session.role }
  };
}

export async function revokeSession(db, token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  revokedTokens.add(tokenHash);
  await db.query("UPDATE auth_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL", [tokenHash]);
}

export function validateCsrf(session, token) {
  return Boolean(session?.csrfHash && token && safeEqual(session.csrfHash, hashToken(token)));
}

export async function changePassword(db, userId, currentPassword, nextPassword) {
  if (String(nextPassword || "").length < 12) {
    const error = new Error("A nova senha deve ter ao menos 12 caracteres");
    error.statusCode = 400;
    throw error;
  }
  await db.transaction(async (client) => {
    const result = await client.query("SELECT password_hash FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (!result.rows[0] || !(await verifyPassword(currentPassword, result.rows[0].password_hash))) {
      const error = new Error("Credenciais invalidas");
      error.statusCode = 401;
      throw error;
    }
    await client.query(
      "UPDATE users SET password_hash = $2, credential_changed_at = NOW() WHERE id = $1",
      [userId, await hashPassword(nextPassword)]
    );
    await client.query("UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL", [userId]);
  });
}

export function createCsrfToken() {
  return randomBytes(24).toString("base64url");
}
