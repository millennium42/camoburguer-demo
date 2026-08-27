import assert from "node:assert/strict";
import test from "node:test";
import { migrationManifest, runMigrations } from "../apps/api/src/migrations.js";
import { createPostgresFixture } from "./helpers/postgres-fixture.js";

const canary = "RETENTION-PRIVATE-CANARY";
const fingerprint = "a".repeat(64);
const payload = {
  customer: {
    id: "customer-id",
    name: canary,
    phone: 51999998888,
    address: { street: canary, number: 123, coordinates: [1, 2] },
  },
  customerName: canary,
  notes: canary,
  fingerprint,
  items: [{ id: "line-id", sku: "xis", name: "Product", quantity: 2, price: 20, notes: canary }],
  externalPayments: [{ id: "payment-id", type: "online", method: "pix", amount: 40 }],
};

test("retention has one versioned JSON policy", () => {
  assert.ok(migrationManifest.some(({ version }) => version === 3));
});

test("JSON redaction and retained-order/ticket guards preserve transaction data", {
  skip: !process.env.TEST_MIGRATIONS_DATABASE_URL,
}, async (t) => {
  const fixture = await createPostgresFixture(process.env.TEST_MIGRATIONS_DATABASE_URL, {
    controlDatabase: "camoburguer_migrations_test",
  });
  const { pool } = fixture;
  try {
    await runMigrations(pool);
    for (const [name, input, expected] of [
      [
        "flat coordinates are personal data",
        { coordinates: [1, 2] },
        { coordinates: ["[DADO ANONIMIZADO LGPD]", "[DADO ANONIMIZADO LGPD]"] },
      ],
      [
        "string monetary values remain exact",
        { amount: "40.00", quantity: "2", total: "40.00" },
        { amount: "40.00", quantity: "2", total: "40.00" },
      ],
      [
        "contact fields ending in Id are not transaction identifiers",
        { emailId: canary, phoneId: 51999998888, orderId: "order-id" },
        {
          emailId: "[DADO ANONIMIZADO LGPD]",
          phoneId: "[DADO ANONIMIZADO LGPD]",
          orderId: "order-id",
        },
      ],
      [
        "real reprint, bridge and merchant identifiers remain intact",
        { sourceJobId: "source-job", bridgeJobId: "bridge-job", externalMerchantId: "merchant" },
        { sourceJobId: "source-job", bridgeJobId: "bridge-job", externalMerchantId: "merchant" },
      ],
    ]) {
      await t.test(name, async () => {
        const result = (
          await pool.query("SELECT retention_redact_json($1::jsonb) AS value", [
            JSON.stringify(input),
          ])
        ).rows[0].value;
        assert.deepEqual(result, expected);
      });
    }
    const sanitized = (
      await pool.query("SELECT retention_redact_json($1::jsonb) AS value", [
        JSON.stringify(payload),
      ])
    ).rows[0].value;
    assert.doesNotMatch(JSON.stringify(sanitized), /RETENTION-PRIVATE-CANARY|51999998888/);
    assert.equal(sanitized.customer.address.number, "[DADO ANONIMIZADO LGPD]");
    assert.deepEqual(sanitized.customer.address.coordinates, [
      "[DADO ANONIMIZADO LGPD]",
      "[DADO ANONIMIZADO LGPD]",
    ]);
    assert.equal(sanitized.customer.id, "customer-id");
    assert.equal(sanitized.fingerprint, fingerprint);
    assert.deepEqual(sanitized.externalPayments, payload.externalPayments);
    assert.equal(sanitized.items[0].sku, "xis");
    assert.equal(sanitized.items[0].name, "Product");
    assert.equal(sanitized.items[0].price, 20);
    assert.equal(sanitized.items[0].quantity, 2);
    assert.deepEqual(
      (
        await pool.query("SELECT retention_redact_json($1::jsonb) AS value", [
          JSON.stringify(sanitized),
        ])
      ).rows[0].value,
      sanitized,
    );

    await pool.query(
      `INSERT INTO orders (id,source,status,customer_name,fulfillment_mode,delivery_address,total,items,metadata)
      VALUES ('retained','counter','completed',$1,'delivery',$1,40,$2::jsonb,$3::jsonb),
             ('recent','counter','completed',$1,'delivery',$1,40,$2::jsonb,$3::jsonb)`,
      [canary, JSON.stringify(payload.items), JSON.stringify(payload)],
    );
    await pool.query("UPDATE orders SET privacy_anonymized_at=NOW() WHERE id='retained'");
    await pool.query(
      "UPDATE orders SET customer_name=$1,delivery_address=$1,notes=$1,metadata=$2::jsonb WHERE id='retained'",
      [canary, JSON.stringify(payload)],
    );
    const order = (await pool.query("SELECT * FROM orders WHERE id='retained'")).rows[0];
    assert.doesNotMatch(JSON.stringify(order), /RETENTION-PRIVATE-CANARY|51999998888/);
    assert.equal(Number(order.total), 40);
    assert.equal(order.metadata.fingerprint, fingerprint);
    assert.equal(
      (await pool.query("SELECT customer_name FROM orders WHERE id='recent'")).rows[0]
        .customer_name,
      canary,
    );

    await pool.query(
      `INSERT INTO print_jobs (id,order_id,status,printer_name,content,metadata)
      VALUES ('retained-print','retained','printed','test',$1,$2::jsonb)`,
      [canary, JSON.stringify({ receipt: fingerprint, customerName: canary })],
    );
    await pool.query("UPDATE print_jobs SET content=$1 WHERE id='retained-print'", [canary]);
    const job = (await pool.query("SELECT * FROM print_jobs WHERE id='retained-print'")).rows[0];
    assert.equal(job.content, "[TICKET ANONIMIZADO]");
    assert.equal(job.metadata.receipt, fingerprint);
    assert.doesNotMatch(JSON.stringify(job), /RETENTION-PRIVATE-CANARY/);

    const holder = await pool.connect();
    const writer = await pool.connect();
    let insert;
    try {
      const pid = (await writer.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      await holder.query("BEGIN");
      await holder.query("UPDATE orders SET privacy_anonymized_at=NOW() WHERE id='recent'");
      insert = writer.query(
        "INSERT INTO print_jobs (id,order_id,status,printer_name,content) VALUES ('late-print','recent','pending','test',$1)",
        [canary],
      );
      let blocked = false;
      const deadline = Date.now() + 3000;
      while (!blocked && Date.now() < deadline) {
        blocked = (
          await pool.query(
            "SELECT wait_event_type='Lock' AS blocked FROM pg_stat_activity WHERE pid=$1",
            [pid],
          )
        ).rows[0]?.blocked;
        if (!blocked) await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.equal(blocked, true, "stale ticket must wait even for a non-key order update");
      await holder.query("COMMIT");
      await insert;
      assert.equal(
        (await pool.query("SELECT content FROM print_jobs WHERE id='late-print'")).rows[0].content,
        "[TICKET ANONIMIZADO]",
      );
    } finally {
      await holder.query("ROLLBACK");
      await insert?.catch(() => {});
      holder.release();
      writer.release();
    }
  } finally {
    await fixture.close();
  }
});
