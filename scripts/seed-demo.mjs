import crypto from "crypto";
import { createRequire } from "node:module";

async function seedDemo(dbClient) {
  await dbClient.query(`
    TRUNCATE TABLE channel_mappings, channel_events, channel_commands, 
    stock_movements, finance_entries, orders, service_tabs, cash_shifts CASCADE;
  `);

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
    { id: crypto.randomUUID(), sku: 'x-bacon', name: 'X-BACON', quantity: 2, price: 36.00, addons: [] },
    { id: crypto.randomUUID(), sku: 'refrigerante-lata', name: 'Refrigerante lata', quantity: 1, price: 6.00, addons: [] }
  ])]);

  // Pedidos na Comanda 102
  const o2 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, tab_id, round_number, source, status, customer_name, fulfillment_mode, total, items)
    VALUES ($1, $2, 1, 'counter', 'in_preparation', 'Pessoa Demo 02', 'local', 27.00, $3::jsonb)
  `, [o2, tab2, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'dog-frango', name: 'DOG FRANGO', quantity: 1, price: 27.00, addons: [] }
  ])]);

  // 3. Pedidos Delivery Externos Aguardando Autorização (iFood / Delivery Much)
  const o3 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, payment_method, total, delivery_address, items)
    VALUES ($1, 'ifood', 'received', 'Cliente iFood Demo', 'delivery', 'app_paid', 41.00, 'Rua Exemplo, 123', $2::jsonb)
  `, [o3, JSON.stringify([
    { id: crypto.randomUUID(), sku: '01-camobuger', name: '01 CAMOBUGER + BATATA FRITA', quantity: 1, price: 35.00, addons: [] },
    { id: crypto.randomUUID(), sku: 'refrigerante-lata', name: 'Refrigerante lata', quantity: 1, price: 6.00, addons: [] }
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
    { id: crypto.randomUUID(), sku: 'x-simples', name: 'X-SIMPLES', quantity: 1, price: 24.00, addons: [] }
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
    { id: crypto.randomUUID(), sku: 'x-completo', name: 'X-COMPLETO', quantity: 1, price: 27.00, addons: [], notes: 'Sem ervilha' },
    { id: crypto.randomUUID(), sku: 'batata-p', name: 'Batata frita P 200g', quantity: 1, price: 15.00, addons: [] }
  ])]);

  return true;
}

export async function runSeedDemo(dbClient) {
  if (typeof dbClient.transaction === "function") {
    return dbClient.transaction((client) => seedDemo(client));
  }

  await dbClient.query("BEGIN");
  try {
    const result = await seedDemo(dbClient);
    await dbClient.query("COMMIT");
    return result;
  } catch (error) {
    await dbClient.query("ROLLBACK");
    throw error;
  }
}

// Suporte para execução direta via CLI `node scripts/seed-demo.mjs`
if (process.argv[1] && process.argv[1].endsWith("seed-demo.mjs")) {
  const requireFromApi = createRequire(new URL("../apps/api/package.json", import.meta.url));
  const pg = requireFromApi("pg");
  const dbUrl = process.env.DATABASE_URL || "postgres://camoburguer:camoburguer@127.0.0.1:5432/camoburguer";
  const client = new pg.Client({ connectionString: dbUrl });
  client.connect().then(async () => {
    console.log("Conectado ao banco de dados.");
    await runSeedDemo(client);
    console.log("✅ Banco de dados preenchido com dados de demonstração!");
    await client.end();
  }).catch(err => {
    console.error("Erro ao inserir dados:", err);
    process.exit(1);
  });
}
