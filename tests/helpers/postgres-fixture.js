import { randomBytes } from "node:crypto";
import pg from "pg";

const identitySql =
  "SELECT current_database() AS database, current_setting('server_version') AS version";

export async function createPostgresFixture(connectionString, { controlDatabase, Pool = pg.Pool }) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("unsafe test database URL");
  }
  const routingKeys = new Set(["host", "hostaddr", "port", "database", "dbname", "service"]);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    !["5432", "55432"].includes(url.port) ||
    !/^camoburguer_[a-z0-9_]+_test$/.test(controlDatabase) ||
    url.pathname !== `/${controlDatabase}` ||
    [...url.searchParams.keys()].some((key) => routingKeys.has(key.toLowerCase()))
  )
    throw new Error("unsafe test database target");

  const databaseName = `camoburguer_fixture_${randomBytes(12).toString("hex")}_test`;
  const root = new Pool({ connectionString, max: 1 });
  let pool;
  let owned = false;
  let closing;
  const close = () => {
    if (!closing)
      closing = (async () => {
        try {
          await pool?.end();
        } finally {
          try {
            // Ownership is acquired only after CREATE succeeds. Never drop a collision.
            if (owned) await root.query(`DROP DATABASE "${databaseName}"`);
          } finally {
            await root.end();
          }
        }
      })();
    return closing;
  };
  async function verify(executor, expected) {
    const {
      rows: [identity],
    } = await executor.query(identitySql);
    if (identity.database !== expected || !/^16\.14(?:[ .]|$)/.test(identity.version)) {
      throw new Error("unsafe test database server identity");
    }
  }
  try {
    await verify(root, controlDatabase);
    await root.query(`CREATE DATABASE "${databaseName}"`);
    owned = true;
    url.pathname = `/${databaseName}`;
    const scopedConnection = url.toString();
    pool = new Pool({ connectionString: scopedConnection, max: 4 });
    await verify(pool, databaseName);
    return { connectionString: scopedConnection, databaseName, pool, close };
  } catch (error) {
    try {
      await close();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "test fixture setup and cleanup failed");
    }
    throw error;
  }
}
