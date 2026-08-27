import { createHash } from "node:crypto";
import { createDb } from "../../apps/api/src/db.js";
import { migrationManifest, runMigrations } from "../../apps/api/src/migrations.js";
import { createPostgresFixture } from "./postgres-fixture.js";

export async function createRetentionFixture() {
  const fixture = await createPostgresFixture(process.env.TEST_MIGRATIONS_DATABASE_URL, {
    controlDatabase: "camoburguer_migrations_test",
  });
  const { pool } = fixture;
  let db;
  try {
    await runMigrations(pool, { migrations: migrationManifest.slice(0, 1) });
    await pool.query(`INSERT INTO service_tabs (id,kind,label,customer_name,status,final_total,closed_at)
      VALUES ('old-tab','tab','Synthetic Customer','Synthetic Customer','closed',40,NOW()-INTERVAL '31 days'),
        ('mixed-tab','tab','Synthetic Customer','Synthetic Customer','closed',80,NOW()-INTERVAL '1 day');
      INSERT INTO orders (id,source,status,customer_name,fulfillment_mode,delivery_address,notes,
        total,items,metadata,created_at,updated_at,tab_id,round_number)
      SELECT id,source,status,'Synthetic Customer','delivery','Synthetic address','Synthetic note',40,
        '[{"sku":"burger","name":"Burger","quantity":1,"unitPrice":40,"notes":"Synthetic note"}]'::jsonb,
        '{"customer":{"name":"Synthetic Customer","phone":"5550000"},"externalOrderId":"external-1","fingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","amount":"40.00","opaqueNumber":9007199254740993}'::jsonb,
        NOW()-INTERVAL '40 days',NOW()-(age * INTERVAL '1 day'),tab_id,round_number
      FROM (VALUES
        ('old-alone','ifood','completed',31,NULL::text,NULL::integer),
        ('old-closed','counter','completed',31,'old-tab',1),
        ('old-mixed','counter','completed',31,'mixed-tab',1),
        ('old-sending','counter','completed',31,NULL,NULL),
        ('old-cancelled','counter','completed',31,NULL,NULL),
        ('recent','delivery_much','completed',1,NULL,NULL),
        ('recent-mixed','ifood','completed',1,'mixed-tab',2),
        ('never-delivered','counter','cancelled',31,NULL,NULL),
        ('old-ready','counter','ready',31,NULL,NULL)
      ) AS seed(id,source,status,age,tab_id,round_number);`);
    await runMigrations(pool);
    await pool.query(`UPDATE orders SET status='cancelled',updated_at=NOW() WHERE id='old-cancelled';
      INSERT INTO print_jobs (id,order_id,status,printer_name,content,lease_owner,lease_expires_at)
        VALUES ('sending-print','old-sending','sending','synthetic','Synthetic Customer','test-worker',NOW()+INTERVAL '10 minutes');`);
    db = createDb(fixture.connectionString);
    return {
      ...fixture,
      db,
      async close() {
        await db.close();
        await fixture.close();
      },
    };
  } catch (error) {
    await db?.close();
    await fixture.close();
    throw error;
  }
}

export async function databaseDigest(pool) {
  const { rows } = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
  );
  const hash = createHash("sha256");
  for (const { tablename } of rows) {
    const name = tablename.replaceAll('"', '""');
    const result = await pool.query(
      `SELECT to_jsonb(t)::text AS row FROM public."${name}" t ORDER BY to_jsonb(t)::text`,
    );
    hash.update(JSON.stringify([tablename, result.rows]));
  }
  return hash.digest("hex");
}
