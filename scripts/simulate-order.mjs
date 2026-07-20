import pg from "pg";
import crypto from "crypto";

const dbUrl = process.env.DATABASE_URL || "postgres://camoburguer:camoburguer@127.0.0.1:5432/camoburguer";
const db = new pg.Client({ connectionString: dbUrl });

async function simulate() {
  const channel = process.argv[2] || "ifood"; // ifood ou deliverymuch
  await db.connect();

  const oId = crypto.randomUUID();
  const customerName = `Simulação ${channel} - ${Math.floor(Math.random() * 1000)}`;
  
  await db.query(`
    INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, total, delivery_address, items)
    VALUES ($1, $2, 'received', $3, 'delivery', 35.00, 'Endereço Simulado, 99', $4::jsonb)
  `, [oId, channel, customerName, JSON.stringify([
    { id: crypto.randomUUID(), sku: 'hamburguer-artesanal', name: 'HAMBÚRGUER ARTESANAL', quantity: 1, price: 35.00, addons: [] }
  ])]);

  await db.query(`
    INSERT INTO channel_mappings (id, order_id, channel, merchant_id, external_id, sync_status)
    VALUES ($1, $2, $3, 'DEMO_MERCHANT', $4, 'accept_pending')
  `, [crypto.randomUUID(), oId, channel, `SIM-${Math.floor(Math.random() * 10000)}`]);

  console.log(`✅ Pedido simulado criado para o canal: ${channel}!`);
  console.log(`Acesse o PDV e aguarde alguns segundos (ou atualize a página) para ele aparecer em "Novos Pedidos"!`);
  
  await db.end();
}

simulate().catch(err => {
  console.error("Erro:", err);
  process.exit(1);
});
