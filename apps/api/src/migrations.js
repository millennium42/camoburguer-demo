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

export async function runMigrations(pool, { migrations = migrationManifest } = {}) {
  validateManifest(migrations);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
