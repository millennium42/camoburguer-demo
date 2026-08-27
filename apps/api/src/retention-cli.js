#!/usr/bin/env node
import { createDb } from "./db.js";
import { applyRetention, previewRetention, reconcilePendingRetention } from "./retention.js";

function parseArgs(args) {
  let apply = false;
  let confirmation;
  for (const arg of args) {
    if (arg === "--apply") apply = true;
    else if (arg.startsWith("--confirm-database=")) confirmation = arg.slice(19);
    else if (arg === "--dry-run") {
      if (apply)
        throw new Error("Usage: retention-cli.js [--dry-run] | --apply --confirm-database=NAME");
    } else throw new Error("Usage: retention-cli.js [--dry-run] | --apply --confirm-database=NAME");
  }
  if (apply !== Boolean(confirmation))
    throw new Error("Usage: retention-cli.js [--dry-run] | --apply --confirm-database=NAME");
  return { apply, confirmation };
}

let db;
try {
  const { apply, confirmation } = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  db = createDb(process.env.DATABASE_URL);
  if (apply) {
    const { rows } = await db.query("SELECT current_database() AS database");
    if (rows[0]?.database !== confirmation)
      throw new Error("unsafe retention apply: connected database does not match confirmation");
  }
  let result = await (apply ? applyRetention(db) : previewRetention(db));
  if (apply) {
    const cleanup = await reconcilePendingRetention(db, {
      bridgeUrl: process.env.PRINT_BRIDGE_URL,
      bridgeToken: process.env.PRINT_BRIDGE_TOKEN,
    });
    result = {
      ...result,
      status:
        cleanup.pending > 0
          ? "pending_external_cleanup"
          : result.status === "no_op"
            ? "no_op"
            : "completed",
      externalCleanup: cleanup.pending > 0 ? "pending" : "completed",
      pendingRequests: cleanup.pending,
    };
    if (cleanup.pending > 0) process.exitCode = 1;
  }
  console.log(JSON.stringify(result));
} catch (error) {
  const safe = /^(DATABASE_URL|Usage:|unsafe retention apply)/.test(error.message);
  console.error(safe ? error.message : `retention operation failed (${error.code || "unknown"})`);
  process.exitCode = 1;
} finally {
  await db?.close();
}
