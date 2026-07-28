import crypto from "crypto";
import { CATALOG, CATALOG_CAPTURED_AT } from "@camoburguer/domain";

export const PROTECTED_TABLES = Object.freeze([
  "service_tabs",
  "catalog_items",
  "orders",
  "order_tab_assignments",
  "print_jobs",
  "stock_balances",
  "stock_movements",
  "cash_shifts",
  "tab_payments",
  "finance_entries",
  "channel_mappings",
  "channel_events",
  "channel_commands"
]);

const OPERATIONAL_TABLES = PROTECTED_TABLES.filter(
  (table) => table !== "catalog_items" && table !== "stock_balances"
);

export class DemoSeedRefusal extends Error {
  constructor(code, message, statusCode, details = {}) {
    super(message);
    this.name = "DemoSeedRefusal";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function normalizedCatalogItem(item) {
  const persisted = Object.hasOwn(item, "source_version");
  return {
    sku: String(item.sku),
    name: String(item.name),
    category: String(item.category),
    price: Number(item.price),
    description: String(item.description || ""),
    stockCategory: item.stock_category ?? item.stockCategory ?? null,
    allowsAddons: item.allows_addons ?? item.allowsAddons ?? false,
    preparationMode: item.preparation_mode ?? item.preparationMode ?? "kitchen",
    available: item.available !== false,
    origin: Object.hasOwn(item, "origin") ? item.origin : "olaclick_snapshot",
    sourceVersion: persisted ? item.source_version : CATALOG_CAPTURED_AT,
    archivedAt: item.archived_at ?? null
  };
}

const CANONICAL_CATALOG = CATALOG
  .map((item) => normalizedCatalogItem(item))
  .sort((left, right) => left.sku.localeCompare(right.sku));

function sameCatalog(actual) {
  const normalized = actual
    .map((item) => normalizedCatalogItem(item))
    .sort((left, right) => left.sku.localeCompare(right.sku));
  return JSON.stringify(normalized) === JSON.stringify(CANONICAL_CATALOG);
}

export function sanitizeTarget({ address, port, database }) {
  const host = String(address || "").trim();
  const dbName = String(database || "").trim();
  const dbPort = Number(port);
  if (!host || !dbName || !Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new DemoSeedRefusal(
      "target_unresolved",
      "Não foi possível resolver a identidade do banco de demonstração.",
      422
    );
  }
  return `${host}:${dbPort}/${dbName}`;
}

function isSanitizedTarget(value) {
  const target = String(value || "");
  return Boolean(target) &&
    !target.includes("@") &&
    !target.includes("://") &&
    !/\s/.test(target) &&
    /^.+:\d{1,5}\/[^/]+$/.test(target);
}

async function resolveTarget(client) {
  const { rows } = await client.query(`
    SELECT current_database() AS database,
           COALESCE(host(inet_server_addr()), 'local-socket') AS address,
           inet_server_port() AS port
  `);
  return sanitizeTarget(rows[0] || {});
}

async function lockProtectedTables(client) {
  await client.query(
    `LOCK TABLE ${PROTECTED_TABLES.join(", ")} IN ACCESS EXCLUSIVE MODE`
  );
}

async function runPreflight(client) {
  const blockers = [];
  for (const table of OPERATIONAL_TABLES) {
    const { rows } = await client.query(`SELECT EXISTS (SELECT 1 FROM ${table}) AS present`);
    if (rows[0]?.present === true) blockers.push(table);
  }

  const stock = await client.query(
    "SELECT category, quantity FROM stock_balances ORDER BY category"
  );
  const stockIsBaseline =
    stock.rows.length === 3 &&
    ["dog", "hamburguer", "xis"].every((category, index) =>
      stock.rows[index]?.category === category && Number(stock.rows[index]?.quantity) === 0
    );
  if (!stockIsBaseline) blockers.push("stock_balances");

  const catalog = await client.query(`
    SELECT sku, name, category, price, description, stock_category, allows_addons,
           preparation_mode, available, origin, source_version, archived_at
    FROM catalog_items
    ORDER BY sku
  `);
  if (!sameCatalog(catalog.rows)) blockers.push("catalog_items");
  return blockers;
}

async function seedDemoContent(dbClient, { injectFailureAfterFirstMutation = false } = {}) {
  await dbClient.query(`
    TRUNCATE TABLE channel_mappings, channel_events, channel_commands, 
    stock_movements, finance_entries, orders, service_tabs, cash_shifts CASCADE;
  `);
  if (injectFailureAfterFirstMutation) {
    throw new Error("Falha de teste injetada após a primeira mutação.");
  }

  await dbClient.query("UPDATE stock_balances SET quantity = 0, updated_at = NOW()");

  // 1. Abrir um turno
  const shiftId = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO cash_shifts (id, opened_at, expected_amount, opening_amount, status, notes)
    VALUES ($1, NOW() - INTERVAL '4 hours', 150.00, 150.00, 'open', 'Seed demonstrativo')
  `, [shiftId]);

  // Abertura do caixa. Valores financeiros são armazenados em reais, não centavos.
  await dbClient.query(`
    INSERT INTO finance_entries (id, shift_id, type, amount, payment_method, source, label, occurred_at)
    VALUES ($1, $2, 'opening', 150.00, 'cash', 'counter', 'Abertura do caixa', NOW() - INTERVAL '4 hours')
  `, [crypto.randomUUID(), shiftId]);

  // 2. Criar comandas e mesas
  const tab1 = crypto.randomUUID();
  const tab2 = crypto.randomUUID();
  
  await dbClient.query(`
    INSERT INTO service_tabs (id, kind, label, customer_name, status, opened_at)
    VALUES 
      ($1, 'table', 'Mesa 04', 'Pessoa Demo 01', 'open', NOW() - INTERVAL '1 hour'),
      ($2, 'tab', 'Comanda 102', 'Pessoa Demo 02', 'open', NOW() - INTERVAL '30 minutes')
  `, [tab1, tab2]);

  // Pedidos na Mesa 04
  const o1 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, tab_id, round_number, source, status, customer_name, fulfillment_mode, total, items)
    VALUES ($1, $2, 1, 'counter', 'ready', 'Pessoa Demo 01', 'local', 78.00, $3::jsonb)
  `, [o1, tab1, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'x-bacon', name: 'X-BACON', category: 'Xis tradicionais', stockCategory: 'xis', preparationMode: 'kitchen', quantity: 2, price: 36.00, addons: [] },
    { id: crypto.randomUUID(), sku: 'refrigerante-lata', name: 'Refrigerante lata', category: 'Refrigerantes', stockCategory: null, preparationMode: 'direct_handoff', quantity: 1, price: 6.00, addons: [] }
  ])]);

  // Pedidos na Comanda 102
  const o2 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, tab_id, round_number, source, status, customer_name, fulfillment_mode, total, items)
    VALUES ($1, $2, 1, 'counter', 'in_preparation', 'Pessoa Demo 02', 'local', 27.00, $3::jsonb)
  `, [o2, tab2, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'dog-frango', name: 'DOG FRANGO', category: 'Dogs', stockCategory: 'dog', preparationMode: 'kitchen', quantity: 1, price: 27.00, addons: [] }
  ])]);

  // 3. Pedidos Delivery Externos Aguardando Autorização (iFood / Delivery Much)
  const o3 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, payment_method, total, delivery_address, items)
    VALUES ($1, 'ifood', 'received', 'Cliente iFood Demo', 'delivery', 'app_paid', 41.00, 'Rua Exemplo, 123', $2::jsonb)
  `, [o3, JSON.stringify([
    { id: crypto.randomUUID(), sku: '01-camobuger', name: '01 CAMOBUGER + BATATA FRITA', category: 'Lanches', stockCategory: 'hamburguer', preparationMode: 'kitchen', quantity: 1, price: 35.00, addons: [] },
    { id: crypto.randomUUID(), sku: 'refrigerante-lata', name: 'Refrigerante lata', category: 'Refrigerantes', stockCategory: null, preparationMode: 'direct_handoff', quantity: 1, price: 6.00, addons: [] }
  ])]);

  await dbClient.query(`
    INSERT INTO channel_mappings (id, order_id, channel, merchant_id, external_id, sync_status)
    VALUES ($1, $2, 'ifood', 'DEMO_MERCHANT', 'IF-999123', 'synchronized')
  `, [crypto.randomUUID(), o3]);

  const o4 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, payment_method, total, items)
    VALUES ($1, 'deliverymuch', 'received', 'Cliente Delivery Much Demo', 'pickup', 'app_paid', 24.00, $2::jsonb)
  `, [o4, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'x-simples', name: 'X-SIMPLES', category: 'Xis tradicionais', stockCategory: 'xis', preparationMode: 'kitchen', quantity: 1, price: 24.00, addons: [] }
  ])]);

  await dbClient.query(`
    INSERT INTO channel_mappings (id, order_id, channel, merchant_id, external_id, sync_status)
    VALUES ($1, $2, 'deliverymuch', 'DEMO_COMPANY', 'DM-444555', 'synchronized')
  `, [crypto.randomUUID(), o4]);

  // 4. Pedidos Delivery Normais
  const o5 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, payment_method, total, delivery_address, items)
    VALUES ($1, 'whatsapp', 'in_preparation', 'Cliente WhatsApp Demo', 'delivery', 'pix', 42.00, 'Av. Exemplo, 400', $2::jsonb)
  `, [o5, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'x-completo', name: 'X-COMPLETO', category: 'Xis tradicionais', stockCategory: 'xis', preparationMode: 'kitchen', quantity: 1, price: 27.00, addons: [], notes: 'Sem ervilha' },
    { id: crypto.randomUUID(), sku: 'batata-p', name: 'Batata frita P 200g', category: 'Batatas fritas', stockCategory: null, preparationMode: 'kitchen', quantity: 1, price: 15.00, addons: [] }
  ])]);

  return true;
}

export async function runSeedDemo(db, options = {}) {
  const {
    authenticated = false,
    environment,
    enabled = false,
    expectedTarget,
    confirmedTarget,
    onDecision = () => {},
    injectFailureAfterFirstMutation = false
  } = options;

  if (!authenticated) {
    throw new DemoSeedRefusal("admin_auth_invalid", "Identidade administrativa inválida.", 403);
  }
  if (environment !== "demo") {
    throw new DemoSeedRefusal("environment_not_demo", "Seed permitido somente em ambiente demo.", 403);
  }
  if (enabled !== true) {
    throw new DemoSeedRefusal("seed_disabled", "Seed de demonstração não está habilitado.", 403);
  }
  if (!String(expectedTarget || "").trim()) {
    throw new DemoSeedRefusal("expected_target_missing", "Alvo esperado não foi configurado.", 422);
  }
  if (!isSanitizedTarget(expectedTarget)) {
    throw new DemoSeedRefusal(
      "expected_target_invalid",
      "O alvo esperado deve usar o formato sanitizado endereço:porta/banco.",
      422
    );
  }

  return db.transaction(async (client) => {
    const target = await resolveTarget(client);
    if (target !== expectedTarget) {
      throw new DemoSeedRefusal(
        "target_mismatch",
        "O banco resolvido difere do alvo demo esperado.",
        422,
        { target }
      );
    }
    if (confirmedTarget !== target) {
      throw new DemoSeedRefusal(
        "confirmation_mismatch",
        "A confirmação humana não corresponde ao alvo resolvido.",
        422,
        { target }
      );
    }

    await lockProtectedTables(client);
    const blockers = await runPreflight(client);
    await onDecision({ decision: blockers.length ? "blocked" : "allowed", target, blockers });
    if (blockers.length) {
      throw new DemoSeedRefusal(
        "preflight_conflict",
        "O banco contém estado operacional e não pode receber o seed.",
        409,
        { target, blockers }
      );
    }

    return seedDemoContent(client, { injectFailureAfterFirstMutation });
  });
}

export async function requestDemoSeed({
  apiBase = "http://127.0.0.1:3001",
  token,
  confirmedTarget,
  fetchImpl = fetch
}) {
  const response = await fetchImpl(`${String(apiBase).replace(/\/+$/, "")}/demo/seed`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${String(token || "")}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ confirmTarget: String(confirmedTarget || "") })
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text };
  }
  if (!response.ok) {
    const error = new Error(payload?.error || `Seed recusado pela API com HTTP ${response.status}.`);
    error.statusCode = response.status;
    error.code = payload?.code || "http_error";
    throw error;
  }
  return payload;
}

// O CLI é apenas cliente HTTP; nunca abre conexão direta com PostgreSQL.
if (process.argv[1] && process.argv[1].endsWith("seed-demo.mjs")) {
  const confirmation = process.argv
    .find((argument) => argument.startsWith("--confirm-target="))
    ?.slice("--confirm-target=".length);
  requestDemoSeed({
    apiBase: process.env.DEMO_API_URL || process.env.API_BASE_URL,
    token: process.env.DEMO_ADMIN_TOKEN,
    confirmedTarget: confirmation
  }).then((payload) => {
    console.log(payload?.message || "Banco de dados preenchido com dados de demonstração.");
  }).catch((err) => {
    console.error("Seed recusado:", err.code || "internal_error", err.message);
    process.exit(1);
  });
}
