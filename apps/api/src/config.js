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

export const config = {
  port: positiveNumber(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL || "postgres://camoburguer:camoburguer@127.0.0.1:5432/camoburguer",
  printBridgeUrl: httpUrl(process.env.PRINT_BRIDGE_URL, "127.0.0.1:3100"),
  printBridgeToken: String(process.env.PRINT_BRIDGE_TOKEN || "").trim(),
  defaultPrinter: process.env.DEFAULT_PRINTER || "cozinha-principal",
  autoSeed: process.env.AUTO_SEED === "true",
  demoAdminToken: String(process.env.DEMO_ADMIN_TOKEN || "").trim(),
  corsOrigins: csv(process.env.CORS_ORIGINS, [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "https://camoburguer-ops-web.onrender.com"
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
