import pg from "pg";
import crypto from "crypto";

const dbUrl = process.env.DATABASE_URL || "postgres://camoburguer:camoburguer@127.0.0.1:5432/camoburguer";
const db = new pg.Client({ connectionString: dbUrl });

async function seed() {
  await db.connect();
  console.log("Conectado ao banco de dados.");

  // Limpar tabelas principais (cuidado: apaga tudo)
  await db.query(`
    TRUNCATE TABLE channel_mappings, channel_events, channel_commands, 
    stock_movements, finance_entries, orders, service_tabs, cash_shifts CASCADE;
  `);
  console.log("Tabelas limpas.");

  // 1. Abrir um turno
  const shiftId = crypto.randomUUID();
  await db.query(`
    INSERT INTO cash_shifts (id, opened_at, expected_amount, opening_amount, status, notes)
    VALUES ($1, NOW() - INTERVAL '4 hours', 150.00, 150.00, 'open', 'Opened by Admin')
  `, [shiftId]);

  // Suprimento inicial
  await db.query(`
    INSERT INTO finance_entries (id, shift_id, type, amount, payment_method, source, label, occurred_at)
    VALUES ($1, $2, 'cash_reinforcement', 15000, 'cash', 'counter', 'Troco inicial', NOW())
  `, [crypto.randomUUID(), shiftId]);

  console.log("Turno criado.");

  // 2. Criar comandas e mesas
  const tab1 = crypto.randomUUID();
  const tab2 = crypto.randomUUID();
  
  await db.query(`
    INSERT INTO service_tabs (id, kind, label, customer_name, status, opened_at)
    VALUES 
      ($1, 'table', 'Mesa 04', 'João Paulo', 'open', NOW() - INTERVAL '1 hour'),
      ($2, 'tab', 'Comanda 102', 'Maria', 'open', NOW() - INTERVAL '30 minutes')
  `, [tab1, tab2]);

  // Pedidos na Mesa 04
  const o1 = crypto.randomUUID();
  await db.query(`
    INSERT INTO orders (id, tab_id, round_number, source, status, customer_name, fulfillment_mode, total, items)
    VALUES ($1, $2, 1, 'counter', 'ready', 'João Paulo', 'local', 56.50, $3::jsonb)
  `, [o1, tab1, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'x-bacon', name: 'X-BACON', quantity: 2, price: 24.00, addons: [] },
    { id: crypto.randomUUID(), sku: 'coca-lata', name: 'COCA COLA LATA', quantity: 1, price: 8.50, addons: [] }
  ])]);

  // Pedidos na Comanda 102
  const o2 = crypto.randomUUID();
  await db.query(`
    INSERT INTO orders (id, tab_id, round_number, source, status, customer_name, fulfillment_mode, total, items)
    VALUES ($1, $2, 1, 'counter', 'in_preparation', 'Maria', 'local', 30.00, $3::jsonb)
  `, [o2, tab2, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'dog-duplo', name: 'DOG DUPLO', quantity: 1, price: 30.00, addons: [] }
  ])]);

  console.log("Comandas e mesas locais criadas.");

  // 3. Pedidos Delivery Externos Aguardando Autorização (iFood / Delivery Much)
  const o3 = crypto.randomUUID();
  await db.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, total, delivery_address, items)
    VALUES ($1, 'ifood', 'received', 'Carlos iFood', 'delivery', 42.00, 'Rua das Flores, 123', $2::jsonb)
  `, [o3, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'hamburguer-artesanal', name: 'HAMBÚRGUER ARTESANAL', quantity: 1, price: 35.00, addons: [] },
    { id: crypto.randomUUID(), sku: 'guarana-lata', name: 'GUARANÁ LATA', quantity: 1, price: 7.00, addons: [] }
  ])]);

  await db.query(`
    INSERT INTO channel_mappings (id, order_id, channel, merchant_id, external_id, sync_status)
    VALUES ($1, $2, 'ifood', 'DEMO_MERCHANT', 'IF-999123', 'accept_pending')
  `, [crypto.randomUUID(), o3]);

  const o4 = crypto.randomUUID();
  await db.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, total, items)
    VALUES ($1, 'deliverymuch', 'received', 'Ana Delivery Much', 'pickup', 28.00, $2::jsonb)
  `, [o4, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'x-salada', name: 'X-SALADA', quantity: 1, price: 28.00, addons: [] }
  ])]);

  await db.query(`
    INSERT INTO channel_mappings (id, order_id, channel, merchant_id, external_id, sync_status)
    VALUES ($1, $2, 'deliverymuch', 'DEMO_COMPANY', 'DM-444555', 'accept_pending')
  `, [crypto.randomUUID(), o4]);

  console.log("Fila de autorização de integrações criada.");

  // 4. Pedidos Delivery Normais
  const o5 = crypto.randomUUID();
  await db.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, total, delivery_address, items)
    VALUES ($1, 'whatsapp', 'in_preparation', 'Pedro (WhatsApp)', 'delivery', 65.00, 'Av. Brasil, 400', $2::jsonb)
  `, [o5, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'x-tudo', name: 'X-TUDO', quantity: 1, price: 35.00, addons: [] },
    { id: crypto.randomUUID(), sku: 'x-tudo', name: 'X-TUDO', quantity: 1, price: 30.00, addons: [{ name: 'Sem ervilha' }] }
  ])]);

  console.log("Pedidos de WhatsApp criados.");

  await db.end();
  console.log("✅ Banco de dados preenchido com dados de demonstração!");
}

seed().catch(err => {
  console.error("Erro ao inserir dados:", err);
  process.exit(1);
});
