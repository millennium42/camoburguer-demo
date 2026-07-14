import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || "postgres://camoburguer:camoburguer@127.0.0.1:5432/camoburguer",
  printBridgeUrl: process.env.PRINT_BRIDGE_URL || "http://127.0.0.1:3100",
  defaultPrinter: process.env.DEFAULT_PRINTER || "cozinha-principal"
};
