import assert from "node:assert/strict";
import test from "node:test";
import { migrationManifest, runMigrations } from "../apps/api/src/migrations.js";
import { createPostgresFixture } from "./helpers/postgres-fixture.js";

const controlUrl = process.env.TEST_MIGRATIONS_DATABASE_URL;

test("down refuses unconfirmed, remote and non-test targets before connecting", async () => {
  const safeUrl = "postgres://test:test@127.0.0.1:55432/camoburguer_rollback_test";
  for (const overrides of [
    { environment: "production" },
    { confirmDatabase: "other_test" },
    { url: safeUrl.replace("127.0.0.1", "remote.example.com") },
    { url: `${safeUrl}?host=remote` },
  ]) {
    const pool = {
      options: { connectionString: overrides.url || safeUrl },
      connect() {
        assert.fail("must refuse before connection");
      },
    };
    await assert.rejects(
      runMigrations(pool, {
        direction: "down",
        environment: "test",
        confirmDatabase: "camoburguer_rollback_test",
        ...overrides,
      }),
      /unsafe rollback/,
    );
  }
});

test("down/up roundtrip is transactional and refuses data", { skip: !controlUrl }, async () => {
  const fixture = await createPostgresFixture(controlUrl, {
    controlDatabase: "camoburguer_migrations_test",
  });
  const { pool, databaseName } = fixture;
  const down = (extra = {}) =>
    runMigrations(pool, {
      direction: "down",
      environment: "test",
      confirmDatabase: databaseName,
      ...extra,
    });
  try {
    await runMigrations(pool);
    const before = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );
    const badManifest = migrationManifest.map((item) => ({
      ...item,
      down: "DROP TABLE privacy_requests; SELECT no_such_function();",
    }));
    await assert.rejects(down({ migrations: badManifest }), /no_such_function/);
    assert.equal(
      (await pool.query("SELECT count(*)::int AS n FROM schema_migrations")).rows[0].n,
      migrationManifest.length,
    );
    assert.ok((await pool.query("SELECT to_regclass('privacy_requests') AS name")).rows[0].name);

    for (let i = 0; i < migrationManifest.length; i += 1) {
      const result = await down();
      assert.equal(result.rolledBack.length, 1);
    }
    assert.equal((await pool.query("SELECT to_regclass('orders') AS name")).rows[0].name, null);
    await runMigrations(pool);
    assert.deepEqual(
      (
        await pool.query(
          "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
        )
      ).rows,
      before.rows,
    );

    await pool.query(
      "INSERT INTO users (id, name, email, username, role, password_hash) VALUES ('keep', 'Keep', 'keep@example.test', 'keep', 'admin', 'hash')",
    );
    await assert.rejects(down(), /contains data/);
    assert.equal(
      (await pool.query("SELECT password_hash FROM users WHERE id = 'keep'")).rows[0].password_hash,
      "hash",
    );
  } finally {
    await fixture.close();
  }
});
