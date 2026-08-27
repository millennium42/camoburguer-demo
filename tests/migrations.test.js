import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { createDb } from "../apps/api/src/db.js";
import { migrationManifest, runMigrations } from "../apps/api/src/migrations.js";
import { createPostgresFixture } from "./helpers/postgres-fixture.js";

const connectionString = process.env.TEST_MIGRATIONS_DATABASE_URL;
const enabled = Boolean(connectionString);
let fixture;
let scopedConnection;
let pool;

async function query(text, values = []) {
  return pool.query(text, values);
}

async function withDb(work) {
  const db = createDb(scopedConnection);
  try {
    return await work(db);
  } finally {
    await db.close();
  }
}

before(async () => {
  if (!enabled) return;
  fixture = await createPostgresFixture(connectionString, {
    controlDatabase: "camoburguer_migrations_test",
  });
  scopedConnection = fixture.connectionString;
  pool = fixture.pool;
});

after(async () => fixture?.close());

test("invalid manifests are rejected before connecting", async () => {
  const noConnection = {
    connect() {
      assert.fail("must reject before connection");
    },
  };
  for (const migrations of [
    [{ version: 0, name: "invalid", sql: "SELECT 1" }],
    [migrationManifest[0], migrationManifest[0]],
    [{ version: 2, name: "b", sql: "SELECT 1" }, migrationManifest[0]],
  ])
    await assert.rejects(runMigrations(noConnection, { migrations }), /version|ordered|duplicate/);
});

test("fresh up creates schema and records every migration", { skip: !enabled }, async () => {
  await withDb(async (db) => {
    await Promise.all([runMigrations(pool), runMigrations(pool), runMigrations(pool)]);
    await db.init();
    const ledger = await query(
      "SELECT version, name, checksum FROM schema_migrations ORDER BY version",
    );
    assert.deepEqual(
      ledger.rows.map(({ version, name }) => ({ version, name })),
      migrationManifest.map(({ version, name }) => ({ version, name })),
    );
    assert.match(ledger.rows[0].checksum, /^[0-9a-f]{64}$/);
    assert.equal(
      (await query("SELECT COUNT(*)::int AS count FROM stock_balances")).rows[0].count,
      3,
    );
  });
});

test("rerun is a no-op and concurrent runners do not duplicate ledger", {
  skip: !enabled,
}, async () => {
  await withDb(async (db) => {
    await Promise.all([db.init(), db.init(), db.init()]);
    const ledger = await query("SELECT version FROM schema_migrations ORDER BY version");
    assert.deepEqual(
      ledger.rows.map((row) => row.version),
      migrationManifest.map(({ version }) => version),
    );
  });
});

test("adoption reapplies the real 001 schema without losing operational sentinels", {
  skip: !enabled,
}, async () => {
  await query(
    "INSERT INTO users (id, name, email, username, role, password_hash) VALUES ($1, $2, $3, $4, $5, $6)",
    ["sentinel-user", "Sentinel", "sentinel@example.test", "sentinel", "operator", "hash"],
  );
  await query(
    "INSERT INTO service_tabs (id, kind, label, customer_name) VALUES ($1, 'tab', $2, $3)",
    ["sentinel-tab", "Sentinel tab", "Cliente legado"],
  );
  await query(
    "INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, tab_id, round_number) VALUES ($1, $2, $3, $4, 'local', $5, 1)",
    ["sentinel-order", "operator", "confirmed", "Cliente legado", "sentinel-tab"],
  );
  await query("DELETE FROM schema_migrations");
  await withDb(async (db) => db.init());
  assert.equal(
    (await query("SELECT name FROM users WHERE id = 'sentinel-user'")).rows[0].name,
    "Sentinel",
  );
  assert.equal(
    (await query("SELECT customer_name FROM orders WHERE id = 'sentinel-order'")).rows[0]
      .customer_name,
    "Cliente legado",
  );
  assert.equal(
    (await query("SELECT customer_name FROM service_tabs WHERE id = 'sentinel-tab'")).rows[0]
      .customer_name,
    "Cliente legado",
  );
  assert.equal(
    (await query("SELECT password_hash FROM users WHERE id = 'sentinel-user'")).rows[0]
      .password_hash,
    "hash",
  );
  assert.equal((await query("SELECT version FROM schema_migrations")).rows[0].version, 1);
});

test("checksum drift and unknown versions are refused", { skip: !enabled }, async () => {
  await assert.rejects(
    runMigrations(pool, {
      migrations: [{ ...migrationManifest[0], sql: "SELECT 1" }, ...migrationManifest.slice(1)],
    }),
    /checksum|altered|diverg/i,
  );
  await query(
    "INSERT INTO schema_migrations (version, name, checksum) VALUES (99, '099_unknown.up.sql', repeat('0', 64))",
  );
  await assert.rejects(runMigrations(pool), /unknown|desconhecida|prefix/i);
  await query("DELETE FROM schema_migrations WHERE version = 99");
});

test("failed DDL rolls back without a partial ledger row", { skip: !enabled }, async () => {
  const nextVersion = migrationManifest.at(-1).version + 1;
  await assert.rejects(
    runMigrations(pool, {
      migrations: [
        ...migrationManifest,
        {
          version: nextVersion,
          name: "test_invalid.up.sql",
          sql: "CREATE TABLE migration_partial (id text primary key); SELECT no_such_function();",
        },
      ],
    }),
    /no_such_function|does not exist/i,
  );
  assert.equal(
    (await query("SELECT 1 FROM pg_class WHERE relname = 'migration_partial'")).rows.length,
    0,
  );
  assert.equal(
    (await query("SELECT 1 FROM schema_migrations WHERE version = $1", [nextVersion])).rows.length,
    0,
  );
});
