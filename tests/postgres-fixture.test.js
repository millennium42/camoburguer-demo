import assert from "node:assert/strict";
import test from "node:test";
import { createPostgresFixture } from "./helpers/postgres-fixture.js";

const controlDatabase = "camoburguer_migrations_test";
const url = `postgres://test:test@127.0.0.1:55432/${controlDatabase}`;

function fakePools({ failCreate = false, wrongIdentity = false } = {}) {
  const pools = [];
  class Pool {
    constructor(options) {
      this.options = options;
      this.calls = [];
      this.ended = false;
      pools.push(this);
    }
    async query(sql) {
      this.calls.push(sql);
      if (sql.startsWith("CREATE DATABASE") && failCreate) throw new Error("already exists");
      if (sql.startsWith("SELECT")) {
        return {
          rows: [
            {
              database: wrongIdentity
                ? "wrong_database"
                : new URL(this.options.connectionString).pathname.slice(1),
              version: "16.14",
            },
          ],
        };
      }
      return { rows: [] };
    }
    async end() {
      this.ended = true;
    }
  }
  return { Pool, pools };
}

test("fixture rejects unsafe targets before opening any connection", async () => {
  const { Pool, pools } = fakePools();
  for (const invalid of [
    url.replace("127.0.0.1", "db.example.com"),
    url.replace(controlDatabase, "production"),
    url.replace("55432", "5434"),
    `${url}?host=remote`,
    url.replace("postgres:", "https:"),
  ]) {
    await assert.rejects(
      createPostgresFixture(invalid, { controlDatabase, Pool }),
      /unsafe test database/,
    );
  }
  assert.equal(pools.length, 0);
});

test("fixture never drops a database when creation or identity validation fails", async () => {
  for (const options of [{ failCreate: true }, { wrongIdentity: true }]) {
    const { Pool, pools } = fakePools(options);
    await assert.rejects(createPostgresFixture(url, { controlDatabase, Pool }));
    assert.equal(
      pools[0].calls.some((sql) => sql.startsWith("DROP")),
      false,
    );
    assert.equal(pools[0].ended, true);
  }
});

test("fixture cleanup owns one random test database and is idempotent", async () => {
  const { Pool, pools } = fakePools();
  const fixture = await createPostgresFixture(url, { controlDatabase, Pool });
  assert.match(fixture.databaseName, /^camoburguer_fixture_[a-f0-9]{24}_test$/);
  assert.equal(new URL(fixture.connectionString).pathname, `/${fixture.databaseName}`);
  await Promise.all([fixture.close(), fixture.close()]);
  assert.deepEqual(
    pools[0].calls.filter((sql) => sql.startsWith("DROP")),
    [`DROP DATABASE "${fixture.databaseName}"`],
  );
  assert.ok(pools.every((pool) => pool.ended));
});
