import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { runMigrations } from "../apps/api/src/migrations.js";
import { restoreFixtureBackup } from "./helpers/backup-restore.js";
import { createPostgresFixture } from "./helpers/postgres-fixture.js";

if (
  process.env.REQUIRE_RECOVERY_TESTS === "true" &&
  (!process.env.TEST_MIGRATIONS_DATABASE_URL || !process.env.TEST_POSTGRES_CONTAINER)
) {
  throw new Error("recovery gate requires explicit database and container identity");
}

test("required recovery gate fails if either identity variable is absent", {
  skip: process.env.CAMOBURGUER_RECOVERY_GATE_PROBE === "true",
}, () => {
  for (const missing of ["TEST_POSTGRES_CONTAINER", "TEST_MIGRATIONS_DATABASE_URL"]) {
    const env = {
      ...process.env,
      REQUIRE_RECOVERY_TESTS: "true",
      CAMOBURGUER_RECOVERY_GATE_PROBE: "true",
    };
    delete env[missing];
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ["--test", "tests/backup-restore.test.js"], {
      env,
      encoding: "utf8",
      timeout: 10000,
    });
    assert.ifError(result.error);
    assert.notEqual(result.status, 0, `${missing} must fail, never silently skip`);
  }
});

test("logical restore refuses non-fixture or identical targets before running Docker", async () => {
  const source = { databaseName: `camoburguer_fixture_${"a".repeat(24)}_test` };
  for (const target of [{ databaseName: "production" }, source]) {
    await assert.rejects(restoreFixtureBackup("unused", source, target), /unsafe restore/);
  }
});

test("logical restore refuses a populated target without changing it", async () => {
  const source = { databaseName: `camoburguer_fixture_${"a".repeat(24)}_test` };
  const target = {
    databaseName: `camoburguer_fixture_${"b".repeat(24)}_test`,
    pool: { query: async () => ({ rows: [{ populated: true }] }) },
  };
  await assert.rejects(restoreFixtureBackup("unused", source, target), /target is not empty/);
});

test("pg_dump/pg_restore preserves ledger, relationships, hashes and financial values", {
  skip: !process.env.TEST_MIGRATIONS_DATABASE_URL || !process.env.TEST_POSTGRES_CONTAINER,
}, async () => {
  let source;
  let target;
  try {
    const control = process.env.TEST_MIGRATIONS_DATABASE_URL;
    source = await createPostgresFixture(control, {
      controlDatabase: "camoburguer_migrations_test",
    });
    target = await createPostgresFixture(control, {
      controlDatabase: "camoburguer_migrations_test",
    });
    await runMigrations(source.pool);
    await source.pool.query(`
      INSERT INTO users (id,name,email,username,role,password_hash)
        VALUES ('backup-admin','Synthetic','backup@example.test','backup','admin','security-hash');
      INSERT INTO service_tabs (id,kind,label,status,final_total,closed_at)
        VALUES ('backup-tab','tab','Synthetic','closed',42.35,NOW());
      INSERT INTO orders (id,tab_id,round_number,source,status,customer_name,fulfillment_mode,total)
        VALUES ('backup-order','backup-tab',1,'counter','completed','Synthetic','local',42.35);
      INSERT INTO finance_entries (id,order_id,tab_id,type,amount,payment_method,source,label,occurred_at)
        VALUES ('backup-sale','backup-order','backup-tab','sale',42.35,'pix','counter','Synthetic',NOW());
      INSERT INTO idempotency_records (idempotency_key,operation,resource,fingerprint,canonical_version)
        VALUES ('backup-key','order.create','backup-order',repeat('a',64),'v1');
    `);
    const snapshot = async (pool) => {
      const result = {};
      for (const table of [
        "schema_migrations",
        "users",
        "service_tabs",
        "orders",
        "finance_entries",
        "idempotency_records",
      ]) {
        result[table] = (
          await pool.query(`SELECT to_jsonb(t) AS data FROM ${table} t ORDER BY to_jsonb(t)::text`)
        ).rows;
      }
      return result;
    };
    const original = await snapshot(source.pool);
    const restored = await restoreFixtureBackup(
      process.env.TEST_POSTGRES_CONTAINER,
      source,
      target,
      (file, args, options) =>
        execFileSync(
          file,
          args[0] === "exec"
            ? [
                "exec",
                "-e",
                "PGSERVICE=nonexistent-backup-test-service",
                "-e",
                "PGHOSTADDR=192.0.2.1",
                ...args.slice(1),
              ]
            : args,
          options,
        ),
    );
    assert.ok(restored.archiveBytes > 0);
    assert.deepEqual(await snapshot(target.pool), original);
    assert.deepEqual(await snapshot(source.pool), original, "restore must never change the source");
  } finally {
    try {
      await target?.close();
    } finally {
      await source?.close();
    }
  }
});
