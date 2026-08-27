import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { migrationManifest } from "../apps/api/src/migrations.js";
import { createPostgresFixture } from "./helpers/postgres-fixture.js";

const command = "apps/api/src/migrate-cli.js";
function run(args, env = {}) {
  const childEnv = { ...process.env, ...env };
  if (!("DATABASE_URL" in env)) delete childEnv.DATABASE_URL;
  return spawnSync(process.execPath, [command, ...args], { env: childEnv, encoding: "utf8" });
}

test("migration CLI fails closed without DATABASE_URL or with unknown arguments", () => {
  const missing = run(["up"]);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /DATABASE_URL is required/);
  const invalid = run(["erase"], { DATABASE_URL: "postgres://unused" });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Usage:/);
});

test("migration CLI rejects production rollback without disclosing credentials", () => {
  const result = run(["down", "--confirm-database=camoburguer_demo_test"], {
    DATABASE_URL: "postgres://user:never-log-this@remote.invalid:5432/camoburguer_demo_test",
    APP_ENV: "production",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unsafe rollback/);
  assert.doesNotMatch(result.stderr + result.stdout, /never-log-this|postgres:\/\//);
});

test("migration CLI performs an actual up/down/up roundtrip", {
  skip: !process.env.TEST_MIGRATIONS_DATABASE_URL,
}, async () => {
  const fixture = await createPostgresFixture(process.env.TEST_MIGRATIONS_DATABASE_URL, {
    controlDatabase: "camoburguer_migrations_test",
  });
  try {
    const env = { DATABASE_URL: fixture.connectionString, APP_ENV: "test" };
    for (const args of [
      ["up"],
      ...migrationManifest.map(() => ["down", `--confirm-database=${fixture.databaseName}`]),
    ]) {
      const result = run(args, env);
      assert.equal(result.status, 0, result.stderr);
      assert.doesNotThrow(() => JSON.parse(result.stdout));
    }
    assert.equal(
      (await fixture.pool.query("SELECT to_regclass('orders') AS name")).rows[0].name,
      null,
    );
    const up = run(["up"], env);
    assert.equal(up.status, 0, up.stderr);
    assert.ok((await fixture.pool.query("SELECT to_regclass('orders') AS name")).rows[0].name);
  } finally {
    await fixture.close();
  }
});
