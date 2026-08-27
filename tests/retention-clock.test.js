import assert from "node:assert/strict";
import test from "node:test";
import { migrationManifest, runMigrations } from "../apps/api/src/migrations.js";
import { createPostgresFixture } from "./helpers/postgres-fixture.js";

test("retention clock is introduced by a new version, not by rewriting schema 001", () => {
  assert.ok(
    migrationManifest.some(
      ({ version, name }) => version === 2 && name === "002_order_retention_clock.up.sql",
    ),
  );
  assert.doesNotMatch(migrationManifest[0].sql, /privacy_anonymized_at/);
});

test("delivery clock adopts legacy conservatively and survives replay/cancellation", {
  skip: !process.env.TEST_MIGRATIONS_DATABASE_URL,
}, async () => {
  const fixture = await createPostgresFixture(process.env.TEST_MIGRATIONS_DATABASE_URL, {
    controlDatabase: "camoburguer_migrations_test",
  });
  const { pool } = fixture;
  try {
    await runMigrations(pool, { migrations: migrationManifest.slice(0, 1) });
    await pool.query(`INSERT INTO orders (id,source,status,customer_name,fulfillment_mode,created_at,updated_at)
      VALUES ('legacy-delivered','counter','completed','Synthetic','local',NOW()-INTERVAL '40 days',NOW()-INTERVAL '31 days'),
             ('legacy-cancelled','counter','cancelled','Synthetic','local',NOW()-INTERVAL '40 days',NOW()-INTERVAL '31 days')`);
    const expected = (await pool.query("SELECT updated_at FROM orders WHERE id='legacy-delivered'"))
      .rows[0].updated_at;
    await runMigrations(pool);
    const read = async (id) =>
      (await pool.query("SELECT completed_at, privacy_anonymized_at FROM orders WHERE id=$1", [id]))
        .rows[0];
    assert.deepEqual((await read("legacy-delivered")).completed_at, expected);
    assert.equal((await read("legacy-cancelled")).completed_at, null);
    assert.equal((await read("legacy-delivered")).privacy_anonymized_at, null);

    await pool.query(`INSERT INTO orders (id,source,status,customer_name,fulfillment_mode,completed_at)
      VALUES ('new-order','counter','ready','Synthetic','local',NOW()-INTERVAL '40 days')`);
    assert.equal(
      (await read("new-order")).completed_at,
      null,
      "a caller cannot invent an earlier delivery",
    );
    const before = Date.now();
    await pool.query("UPDATE orders SET status='completed' WHERE id='new-order'");
    const delivered = (await read("new-order")).completed_at;
    assert.ok(delivered.getTime() >= before - 1000 && delivered.getTime() <= Date.now() + 1000);
    await pool.query(
      "UPDATE orders SET status='completed', updated_at=NOW(), completed_at=NULL WHERE id='new-order'",
    );
    assert.deepEqual((await read("new-order")).completed_at, delivered);
    await pool.query(
      "UPDATE orders SET status='cancelled', completed_at=NOW()+INTERVAL '40 days' WHERE id='new-order'",
    );
    assert.deepEqual((await read("new-order")).completed_at, delivered);

    await pool.query(`INSERT INTO orders (id,source,status,customer_name,fulfillment_mode,completed_at)
      VALUES ('direct-completed','counter','completed','Synthetic','local',NOW()-INTERVAL '40 days')`);
    assert.ok((await read("direct-completed")).completed_at.getTime() >= before - 1000);
    await pool.query("UPDATE orders SET privacy_anonymized_at=NOW() WHERE id='new-order'");
    const marked = (await read("new-order")).privacy_anonymized_at;
    await pool.query("UPDATE orders SET privacy_anonymized_at=NULL WHERE id='new-order'");
    assert.deepEqual((await read("new-order")).privacy_anonymized_at, marked);
  } finally {
    await fixture.close();
  }
});
