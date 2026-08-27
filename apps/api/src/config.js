import { DEFAULT_BUSINESS_TIME_ZONE } from "@camoburguer/finance-core";
import "dotenv/config";

function csv(value, fallback = []) {
  const items = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

function httpUrl(value, fallback) {
  const normalized = String(value || fallback).trim();
  return /^https?:\/\//i.test(normalized) ? normalized : `http://${normalized}`;
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseListenPort(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return 3001;
  const port = Number(normalized);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT must be an integer between 0 and 65535");
  }
  return port;
}

export function validateTimeZone(value) {
  const normalized = String(value || DEFAULT_BUSINESS_TIME_ZONE).trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(new Date(0));
  } catch {
    throw new Error(`BUSINESS_TIME_ZONE inválido: ${normalized}`);
  }
  return normalized;
}

function runtimeBusinessTimeZone(value) {
  const normalized = String(value ?? DEFAULT_BUSINESS_TIME_ZONE).trim();
  if (normalized !== DEFAULT_BUSINESS_TIME_ZONE) {
    throw new Error(`BUSINESS_TIME_ZONE must be ${DEFAULT_BUSINESS_TIME_ZONE}`);
  }
  return DEFAULT_BUSINESS_TIME_ZONE;
}

export function assertSafeAutoSeed(value) {
  if (value != null && value !== "false") {
    throw new Error(
      `AUTO_SEED=${value} é proibido: a API não executa seed durante o boot. ` +
        "Use AUTO_SEED=false e a operação administrativa explícita documentada.",
    );
  }
}

const appEnvironment = String(process.env.APP_ENV || "").trim();
const authCookieSecure = process.env.AUTH_COOKIE_SECURE !== "false";
if (!authCookieSecure && !["development", "test"].includes(appEnvironment)) {
  throw new Error("AUTH_COOKIE_SECURE=false so e permitido em development/test local");
}

export const config = {
  port: parseListenPort(process.env.PORT),
  databaseUrl:
    process.env.DATABASE_URL || "postgres://camoburguer:camoburguer@127.0.0.1:5432/camoburguer",
  printBridgeUrl: httpUrl(process.env.PRINT_BRIDGE_URL, "127.0.0.1:3100"),
  printBridgeToken: String(process.env.PRINT_BRIDGE_TOKEN || "").trim(),
  defaultPrinter: process.env.DEFAULT_PRINTER || "cozinha-principal",
  adminBootstrapPassword: String(process.env.ADMIN_BOOTSTRAP_PASSWORD || ""),
  appEnvironment,
  authCookieSecure,
  businessTimeZone: runtimeBusinessTimeZone(process.env.BUSINESS_TIME_ZONE),
  demoSeedEnabled: process.env.DEMO_SEED_ENABLED === "true",
  demoSeedTarget: String(process.env.DEMO_SEED_TARGET || "").trim(),
  corsOrigins: csv(process.env.CORS_ORIGINS, [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://camoburguer-api.onrender.com",
  ]),
  deliveryMuch: {
    enabled: process.env.DELIVERYMUCH_ENABLED === "true",
    authUrl: process.env.DELIVERYMUCH_AUTH_URL || "",
    apiUrl: process.env.DELIVERYMUCH_API_URL || "",
    clientId: process.env.DELIVERYMUCH_CLIENT_ID || "",
    clientSecret: process.env.DELIVERYMUCH_CLIENT_SECRET || "",
    username: process.env.DELIVERYMUCH_USERNAME || "",
    password: process.env.DELIVERYMUCH_PASSWORD || "",
    companyUuid: process.env.DELIVERYMUCH_COMPANY_UUID || "",
    pollIntervalMs: positiveNumber(process.env.DELIVERYMUCH_POLL_INTERVAL_MS, 15000),
  },
  ifood: {
    enabled: process.env.IFOOD_ENABLED === "true",
    apiUrl: process.env.IFOOD_API_URL || "https://merchant-api.ifood.com.br",
    clientId: process.env.IFOOD_CLIENT_ID || "",
    clientSecret: process.env.IFOOD_CLIENT_SECRET || "",
    merchantId: process.env.IFOOD_MERCHANT_ID || "",
    pollIntervalMs: positiveNumber(process.env.IFOOD_POLL_INTERVAL_MS, 30000),
  },
};
