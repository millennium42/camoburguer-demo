import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const initialSql = readFileSync(
  new URL("../migrations/001_initial_schema.up.sql", import.meta.url),
  "utf8",
);

export const migrationManifest = Object.freeze([
  Object.freeze({
    version: 1,
    name: "001_initial_schema.up.sql",
    sql: initialSql,
    down: readFileSync(
      new URL("../migrations/001_initial_schema.down.sql", import.meta.url),
      "utf8",
    ),
  }),
  Object.freeze({
    version: 2,
    name: "002_order_retention_clock.up.sql",
    sql: readFileSync(
      new URL("../migrations/002_order_retention_clock.up.sql", import.meta.url),
      "utf8",
    ),
    down: readFileSync(
      new URL("../migrations/002_order_retention_clock.down.sql", import.meta.url),
      "utf8",
    ),
  }),
  Object.freeze({
    version: 3,
    name: "003_retention_redaction.up.sql",
    sql: readFileSync(
      new URL("../migrations/003_retention_redaction.up.sql", import.meta.url),
      "utf8",
    ),
    down: readFileSync(
      new URL("../migrations/003_retention_redaction.down.sql", import.meta.url),
      "utf8",
    ),
  }),
]);

function validateManifest(migrations) {
  const seenVersions = new Set();
  const seenNames = new Set();
  for (let index = 0; index < migrations.length; index += 1) {
    const migration = migrations[index];
    if (!Number.isInteger(migration.version) || migration.version < 1) {
      throw new Error("migration version must be a positive integer");
    }
    if (index > 0 && migration.version <= migrations[index - 1].version) {
      throw new Error("migration manifest must be ordered by unique version");
    }
    if (seenVersions.has(migration.version) || seenNames.has(migration.name)) {
      throw new Error("migration manifest contains duplicate version or name");
    }
    if (typeof migration.name !== "string" || !migration.name) {
      throw new Error("migration name is required");
    }
    if (typeof migration.sql !== "string") {
      throw new Error("migration SQL is required");
    }
    seenVersions.add(migration.version);
    seenNames.add(migration.name);
  }
}

function checksum(sql) {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

function assertRollbackTarget(pool, environment, confirmDatabase) {
  let url;
  try {
    url = new URL(pool.options?.connectionString);
  } catch {
    throw new Error("unsafe rollback: explicit test connection required");
  }
  const routingKeys = new Set(["host", "hostaddr", "port", "database", "dbname", "service"]);
  if (
    environment !== "test" ||
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    !["5432", "55432"].includes(url.port) ||
    !/^camoburguer_[a-z0-9_]+_test$/.test(confirmDatabase || "") ||
    url.pathname !== `/${confirmDatabase}` ||
    [...url.searchParams.keys()].some((key) => routingKeys.has(key.toLowerCase()))
  )
    throw new Error("unsafe rollback: APP_ENV=test and confirmed loopback test database required");
}

async function assertEmptyForRollback(client) {
  const { rows: tables } = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
  );
  const quote = (name) => `public."${name.replaceAll('"', '""')}"`;
  if (tables.length) {
    await client.query(
      `LOCK TABLE ${tables.map(({ tablename }) => quote(tablename)).join(", ")} IN ACCESS EXCLUSIVE MODE`,
    );
  }
  for (const { tablename } of tables) {
    if (tablename === "schema_migrations") continue;
    const predicate =
      tablename === "stock_balances"
        ? " WHERE quantity <> 0 OR category NOT IN ('xis', 'dog', 'hamburguer')"
        : "";
    const {
      rows: [{ populated }],
    } = await client.query(
      `SELECT EXISTS(SELECT 1 FROM ${quote(tablename)}${predicate}) AS populated`,
    );
    if (populated) throw new Error(`unsafe rollback: ${tablename} contains data`);
  }
}

export async function runMigrations(
  pool,
  { migrations = migrationManifest, direction = "up", environment, confirmDatabase } = {},
) {
  if (!["up", "down"].includes(direction)) throw new Error("unsupported migration direction");
  if (direction === "down") assertRollbackTarget(pool, environment, confirmDatabase);
  validateManifest(migrations);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (direction === "down") {
      const {
        rows: [{ database }],
      } = await client.query("SELECT current_database() AS database");
      if (database !== confirmDatabase)
        throw new Error("unsafe rollback: server identity mismatch");
    }
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      "camoburguer:schema_migrations",
    ]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        checksum TEXT NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const { rows: applied } = await client.query(
      "SELECT version, name, checksum FROM schema_migrations ORDER BY version",
    );
    if (applied.length > migrations.length) {
      throw new Error("unknown migration version in schema_migrations");
    }
    for (let index = 0; index < applied.length; index += 1) {
      const expected = migrations[index];
      const actual = applied[index];
      if (!expected || actual.version !== expected.version) {
        throw new Error("schema_migrations has a non-prefix or unknown version");
      }
      if (actual.name !== expected.name || actual.checksum !== checksum(expected.sql)) {
        throw new Error(`migration checksum drift: version ${actual.version}`);
      }
    }
    if (direction === "down") {
      const latest = migrations[applied.length - 1];
      if (latest) {
        if (!latest.down?.trim()) throw new Error("migration down SQL is required");
        await assertEmptyForRollback(client);
        await client.query(latest.down);
        await client.query("DELETE FROM schema_migrations WHERE version = $1", [latest.version]);
      }
      await client.query("COMMIT");
      return { rolledBack: latest ? [{ version: latest.version, name: latest.name }] : [] };
    }
    for (const migration of migrations.slice(applied.length)) {
      const migrationChecksum = checksum(migration.sql);
      await client.query(migration.sql);
      await client.query(
        "INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
        [migration.version, migration.name, migrationChecksum],
      );
    }
    await client.query("COMMIT");
    return {
      applied: migrations.slice(applied.length).map(({ version, name }) => ({ version, name })),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
