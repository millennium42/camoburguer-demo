import pg from "pg";
import { runMigrations } from "./migrations.js";
import { withBusinessTimeZone } from "./postgres.js";

let pool;
try {
  const [direction = "up", ...args] = process.argv.slice(2);
  const confirmation = args.find((arg) => arg.startsWith("--confirm-database="));
  if (
    !["up", "down"].includes(direction) ||
    args.length > 1 ||
    (args.length && (!confirmation || direction !== "down"))
  )
    throw new Error("Usage: migrate-cli.js up | down --confirm-database=NAME");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  pool = new pg.Pool({
    connectionString: withBusinessTimeZone(process.env.DATABASE_URL),
    max: 1,
  });
  const result = await runMigrations(pool, {
    direction,
    environment: process.env.APP_ENV,
    confirmDatabase: confirmation?.slice("--confirm-database=".length),
  });
  console.log(JSON.stringify(result));
} catch (error) {
  const safe =
    /^(unsafe rollback|DATABASE_URL|Usage:|unsupported migration|migration |schema_migrations|unknown migration)/.test(
      error.message,
    );
  console.error(safe ? error.message : `database operation failed (${error.code || "unknown"})`);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
