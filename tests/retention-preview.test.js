import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRetention,
  previewRetention,
  RETENTION_ELIGIBLE_SQL,
} from "../apps/api/src/retention.js";
import { createRetentionFixture, databaseDigest } from "./helpers/retention-fixture.js";

const options = { skip: !process.env.TEST_MIGRATIONS_DATABASE_URL };

test(
  "retention boundary is strictly older than 30 days and requires a delivery",
  options,
  async () => {
    const fixture = await createRetentionFixture();
    try {
      const { rows } = await fixture.pool.query(`WITH orders(id,status,completed_at) AS (VALUES
      ('boundary','completed',CURRENT_TIMESTAMP-INTERVAL '30 days'),
      ('old','completed',CURRENT_TIMESTAMP-INTERVAL '30 days 0.001 seconds'),
      ('recent','completed',CURRENT_TIMESTAMP-INTERVAL '30 days'+INTERVAL '0.001 seconds'),
      ('cancelled-after-delivery','cancelled',CURRENT_TIMESTAMP-INTERVAL '31 days'),
      ('never-delivered','cancelled',NULL),
      ('ready','ready',CURRENT_TIMESTAMP-INTERVAL '31 days'))
      SELECT o.id FROM orders o WHERE ${RETENTION_ELIGIBLE_SQL} ORDER BY o.id`);
      assert.deepEqual(
        rows.map(({ id }) => id),
        ["cancelled-after-delivery", "old"],
      );
    } finally {
      await fixture.close();
    }
  },
);

test(
  "apply uses a guarded transaction, records one ledger row and is idempotent",
  options,
  async () => {
    const fixture = await createRetentionFixture();
    try {
      const first = await applyRetention(fixture.db);
      assert.equal(first.status, "db_completed");
      assert.equal(first.selectedOrders, 4);
      assert.equal(first.deferredOrders, 1);
      assert.equal(first.changes.orders, 4);
      assert.equal(first.changes.service_tabs, 1);
      assert.equal(
        (
          await fixture.pool.query(
            "SELECT customer_name, privacy_anonymized_at FROM orders WHERE id='old-alone'",
          )
        ).rows[0].customer_name,
        "[DADO ANONIMIZADO LGPD]",
      );
      assert.equal(
        (await fixture.pool.query("SELECT customer_name FROM orders WHERE id='recent'")).rows[0]
          .customer_name,
        "Synthetic Customer",
      );
      assert.equal(
        (await fixture.pool.query("SELECT customer_name FROM orders WHERE id='old-sending'"))
          .rows[0].customer_name,
        "Synthetic Customer",
      );
      assert.equal(
        (await fixture.pool.query("SELECT COUNT(*) FROM privacy_requests")).rows[0].count,
        "1",
      );
      const repeated = await applyRetention(fixture.db);
      assert.equal(repeated.status, "no_op");
      assert.equal(
        (await fixture.pool.query("SELECT COUNT(*) FROM privacy_requests")).rows[0].count,
        "1",
      );
    } finally {
      await fixture.close();
    }
  },
);

test(
  "preview is read-only, protects recent/mixed orders and defers active printing",
  options,
  async () => {
    const fixture = await createRetentionFixture();
    try {
      const before = await databaseDigest(fixture.pool);
      let transactionMode;
      const db = {
        transaction: (work) =>
          fixture.db.transaction(async (client) =>
            work({
              async query(sql, values) {
                const result = await client.query(sql, values);
                if (sql.startsWith("SET TRANSACTION")) {
                  transactionMode = (await client.query("SHOW transaction_read_only")).rows[0]
                    .transaction_read_only;
                }
                return result;
              },
            }),
          ),
      };
      const result = await previewRetention(db);
      assert.equal(transactionMode, "on");
      assert.equal(result.dryRun, true);
      assert.equal(result.eligibleOrders, 5);
      assert.equal(result.selectedOrders, 4);
      assert.equal(result.deferredOrders, 1);
      assert.equal(result.changes.orders, 4);
      assert.equal(result.changes.service_tabs, 1);
      assert.doesNotMatch(JSON.stringify(result), /Synthetic|external-1|postgres:|old-alone/);
      assert.equal(await databaseDigest(fixture.pool), before);
      assert.deepEqual(await previewRetention(fixture.db), result);
    } finally {
      await fixture.close();
    }
  },
);
