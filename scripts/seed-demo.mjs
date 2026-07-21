import pg from "pg";
import crypto from "crypto";

export async function runSeedDemo(dbClient) {
  // Limpar tabelas principais (cuidado: apaga tudo)
  await dbClient.query(`
    TRUNCATE TABLE channel_mappings, channel_events, channel_commands, 
    stock_movements, finance_entries, orders, service_tabs, cash_shifts CASCADE;
  `);

  // 1. Abrir um turno
  const shiftId = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO cash_shifts (id, opened_at, expected_amount, opening_amount, status, notes)
    VALUES ($1, NOW() - INTERVAL '4 hours', 150.00, 150.00, 'open', 'Opened by Admin')
  `, [shiftId]);

  // Suprimento inicial
  await dbClient.query(`
    INSERT INTO finance_entries (id, shift_id, type, amount, payment_method, source, label, occurred_at)
    VALUES ($1, $2, 'cash_reinforcement', 15000, 'cash', 'counter', 'Troco inicial', NOW())
  `, [crypto.randomUUID(), shiftId]);

  // 2. Criar comandas e mesas
  const tab1 = crypto.randomUUID();
  const tab2 = crypto.randomUUID();
  
  await dbClient.query(`
    INSERT INTO service_tabs (id, kind, label, customer_name, status, opened_at)
    VALUES 
      ($1, 'table', 'Mesa 04', 'João Paulo', 'open', NOW() - INTERVAL '1 hour'),
      ($2, 'tab', 'Comanda 102', 'Maria', 'open', NOW() - INTERVAL '30 minutes')
  `, [tab1, tab2]);

  // Pedidos na Mesa 04
  const o1 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, tab_id, round_number, source, status, customer_name, fulfillment_mode, total, items)
    VALUES ($1, $2, 1, 'counter', 'ready', 'João Paulo', 'local', 56.50, $3::jsonb)
  `, [o1, tab1, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'x-bacon', name: 'X-BACON', quantity: 2, price: 24.00, addons: [] },
    { id: crypto.randomUUID(), sku: 'coca-lata', name: 'COCA COLA LATA', quantity: 1, price: 8.50, addons: [] }
  ])]);

  // Pedidos na Comanda 102
  const o2 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, tab_id, round_number, source, status, customer_name, fulfillment_mode, total, items)
    VALUES ($1, $2, 1, 'counter', 'in_preparation', 'Maria', 'local', 30.00, $3::jsonb)
  `, [o2, tab2, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'dog-duplo', name: 'DOG DUPLO', quantity: 1, price: 30.00, addons: [] }
  ])]);

  // 3. Pedidos Delivery Externos Aguardando Autorização (iFood / Delivery Much)
  const o3 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, payment_method, total, delivery_address, items)
    VALUES ($1, 'ifood', 'received', 'Carlos iFood', 'delivery', 'app_paid', 42.00, 'Rua das Flores, 123', $2::jsonb)
  `, [o3, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'hamburguer-artesanal', name: 'HAMBÚRGUER ARTESANAL', quantity: 1, price: 35.00, addons: [] },
    { id: crypto.randomUUID(), sku: 'guarana-lata', name: 'GUARANÁ LATA', quantity: 1, price: 7.00, addons: [] }
  ])]);

  await dbClient.query(`
    INSERT INTO channel_mappings (id, order_id, channel, merchant_id, external_id, sync_status)
    VALUES ($1, $2, 'ifood', 'DEMO_MERCHANT', 'IF-999123', 'accept_pending')
  `, [crypto.randomUUID(), o3]);

  const o4 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, payment_method, total, items)
    VALUES ($1, 'deliverymuch', 'received', 'Ana Delivery Much', 'pickup', 'app_paid', 28.00, $2::jsonb)
  `, [o4, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'x-salada', name: 'X-SALADA', quantity: 1, price: 28.00, addons: [] }
  ])]);

  await dbClient.query(`
    INSERT INTO channel_mappings (id, order_id, channel, merchant_id, external_id, sync_status)
    VALUES ($1, $2, 'deliverymuch', 'DEMO_COMPANY', 'DM-444555', 'accept_pending')
  `, [crypto.randomUUID(), o4]);

  // 4. Pedidos Delivery Normais
  const o5 = crypto.randomUUID();
  await dbClient.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, payment_method, total, delivery_address, items)
    VALUES ($1, 'whatsapp', 'in_preparation', 'Pedro (WhatsApp)', 'delivery', 'pix', 65.00, 'Av. Brasil, 400', $2::jsonb)
  `, [o5, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'x-tudo', name: 'X-TUDO', quantity: 1, price: 35.00, addons: [] },
    { id: crypto.randomUUID(), sku: 'x-tudo', name: 'X-TUDO', quantity: 1, price: 30.00, addons: [{ name: 'Sem ervilha' }] }
  ])]);

  return true;
}

// Suporte para execução direta via CLI `node scripts/seed-demo.mjs`
if (process.argv[1] && process.argv[1].endsWith("seed-demo.mjs")) {
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
