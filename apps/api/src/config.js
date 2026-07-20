import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || "postgres://camoburguer:camoburguer@127.0.0.1:5432/camoburguer",
  printBridgeUrl: process.env.PRINT_BRIDGE_URL || "http://127.0.0.1:3100",
  defaultPrinter: process.env.DEFAULT_PRINTER || "cozinha-principal",
  deliveryMuch: {
    enabled: process.env.DELIVERYMUCH_ENABLED === "true",
    authUrl: process.env.DELIVERYMUCH_AUTH_URL || "",
    apiUrl: process.env.DELIVERYMUCH_API_URL || "",
    clientId: process.env.DELIVERYMUCH_CLIENT_ID || "",
    clientSecret: process.env.DELIVERYMUCH_CLIENT_SECRET || "",
    username: process.env.DELIVERYMUCH_USERNAME || "",
    password: process.env.DELIVERYMUCH_PASSWORD || "",
    companyUuid: process.env.DELIVERYMUCH_COMPANY_UUID || "",
    pollIntervalMs: Number(process.env.DELIVERYMUCH_POLL_INTERVAL_MS || 15000),
  },
  ifood: {
    enabled: process.env.IFOOD_ENABLED === "true",
    apiUrl: process.env.IFOOD_API_URL || "https://merchant-api.ifood.com.br",
    clientId: process.env.IFOOD_CLIENT_ID || "",
    clientSecret: process.env.IFOOD_CLIENT_SECRET || "",
    merchantId: process.env.IFOOD_MERCHANT_ID || "",
    pollIntervalMs: Number(process.env.IFOOD_POLL_INTERVAL_MS || 30000),
  },
};
