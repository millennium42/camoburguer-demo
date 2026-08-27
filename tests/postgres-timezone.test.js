import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { businessDate, DEFAULT_BUSINESS_TIME_ZONE } from "@camoburguer/finance-core";
import { createDb } from "../apps/api/src/db.js";
import { createPostgresFixture } from "./helpers/postgres-fixture.js";

const controlUrl = process.env.TEST_MIGRATIONS_DATABASE_URL;
const timezoneOption = `-c timezone=${DEFAULT_BUSINESS_TIME_ZONE}`;
const existingOptions = "-c timezone=UTC -c statement_timeout=2000";

test("PostgreSQL uses the business timezone before init and preserves other session options", {
  skip: controlUrl ? false : "TEST_MIGRATIONS_DATABASE_URL is not set",
}, async (t) => {
  const fixture = await createPostgresFixture(controlUrl, {
    controlDatabase: "camoburguer_migrations_test",
  });
  let db;
  try {
    const url = new URL(fixture.connectionString);
    url.searchParams.set("options", existingOptions);
    db = createDb(url.toString());
    // Deliberately no init: session options must apply on the very first connection.
    await t.test("SHOW TimeZone is Sao Paulo and statement_timeout remains 2000ms", async () => {
      const { rows: timezone } = await db.query("SHOW TimeZone");
      const { rows: timeout } = await db.query("SHOW statement_timeout");
      const { rows: settings } = await db.query(
        "SELECT setting, unit FROM pg_settings WHERE name = 'statement_timeout'",
      );
      assert.equal(timezone[0].TimeZone, DEFAULT_BUSINESS_TIME_ZONE);
      assert.equal(timeout[0].statement_timeout, "2s");
      assert.deepEqual(settings, [{ setting: "2000", unit: "ms" }]);
    });
    await t.test("SQL date agrees with businessDate on both sides of midnight", async () => {
      const instants = ["2026-08-27T02:59:59.999Z", "2026-08-27T03:00:00.000Z"];
      const { rows } = await db.query(
        "SELECT $1::timestamptz::date::text AS before_midnight, $2::timestamptz::date::text AS midnight",
        instants,
      );
      const expected = instants.map((instant) => businessDate(instant));
      assert.deepEqual(expected, ["2026-08-26", "2026-08-27"]);
      assert.deepEqual([rows[0].before_midnight, rows[0].midnight], expected);
    });
  } finally {
    try {
      await db?.close();
    } finally {
      await fixture.close();
    }
  }
});

test("DSN helper preserves credentials, SSL and options, appending timezone last idempotently", async () => {
  const { withBusinessTimeZone } = await import("../apps/api/src/postgres.js");
  for (const protocol of ["postgres:", "postgresql:"]) {
    const original = new URL(`${protocol}//u%40ser:p%40ss%3Aword%2B%2F%25@127.0.0.1:55432/demo`);
    original.searchParams.set("sslmode", "verify-full");
    original.searchParams.set("sslrootcert", "/certs/root cert.pem");
    original.searchParams.set("application_name", "timezone test");
    original.searchParams.set("options", existingOptions);
    const result = withBusinessTimeZone(original.toString());
    const actual = new URL(result);
    for (const property of ["protocol", "username", "password", "hostname", "port", "pathname"]) {
      assert.equal(actual[property], original[property]);
    }
    assert.equal(actual.searchParams.get("options"), `${existingOptions} ${timezoneOption}`);
    actual.searchParams.set("options", existingOptions);
    assert.equal(actual.toString(), original.toString());
    assert.equal(withBusinessTimeZone(result), result);
  }
});

test("DSN helper adds missing options and overrides a conflicting final timezone", async () => {
  const { withBusinessTimeZone } = await import("../apps/api/src/postgres.js");
  const url = new URL("postgres://example.test/demo");
  assert.equal(
    new URL(withBusinessTimeZone(url.toString())).searchParams.get("options"),
    timezoneOption,
  );
  url.searchParams.set("options", `${timezoneOption} -c timezone=UTC`);
  assert.equal(
    new URL(withBusinessTimeZone(url.toString())).searchParams.get("options"),
    `${timezoneOption} -c timezone=UTC ${timezoneOption}`,
  );
});

test("DSN helper preserves the driver's last options value when the parameter is repeated", async () => {
  const { withBusinessTimeZone } = await import("../apps/api/src/postgres.js");
  const url = new URL("postgres://example.test/demo");
  url.searchParams.append("options", timezoneOption);
  url.searchParams.append("options", existingOptions);
  const result = withBusinessTimeZone(url.toString());
  assert.equal(
    new URL(result).searchParams.getAll("options").at(-1),
    `${existingOptions} ${timezoneOption}`,
  );
  assert.equal(withBusinessTimeZone(result), result);
});

test("DSN helper rejects invalid input without echoing credentials or attaching the input", async () => {
  const { withBusinessTimeZone } = await import("../apps/api/src/postgres.js");
  for (const value of [undefined, null, "", "not-a-url", "https://user:secret@example.test/db"]) {
    assert.throws(
      () => withBusinessTimeZone(value),
      (error) => {
        assert.match(error.message, /DATABASE_URL/);
        assert.equal(error.input, undefined);
        assert.equal(error.cause, undefined);
        assert.doesNotMatch(error.message, /secret|user:|example\.test/);
        return true;
      },
    );
  }
});

function loadRuntimeConfig(value) {
  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import "dotenv/config";
       if (process.argv.length > 1) process.env.BUSINESS_TIME_ZONE = process.argv[1];
       else delete process.env.BUSINESS_TIME_ZONE;
       process.env.AUTH_COOKIE_SECURE = "true";
       process.env.PORT = "0";
       const { config, validateTimeZone } = await import("./apps/api/src/config.js");
       console.log(JSON.stringify({ timeZone: config.businessTimeZone, genericUTC: validateTimeZone("UTC") }));`,
      ...(value === undefined ? [] : [value]),
    ],
    { cwd: fileURLToPath(new URL("../", import.meta.url)), encoding: "utf8", timeout: 10000 },
  );
}

test("runtime accepts the absent/default timezone while validateTimeZone remains generic", () => {
  for (const value of [undefined, DEFAULT_BUSINESS_TIME_ZONE]) {
    const result = loadRuntimeConfig(value);
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      timeZone: DEFAULT_BUSINESS_TIME_ZONE,
      genericUTC: "UTC",
    });
  }
});

test("runtime rejects BUSINESS_TIME_ZONE=UTC instead of diverging from PostgreSQL", () => {
  const result = loadRuntimeConfig("UTC");
  assert.ifError(result.error);
  assert.notEqual(result.status, 0, "runtime must refuse UTC");
  assert.match(result.stderr, /BUSINESS_TIME_ZONE/);
});
