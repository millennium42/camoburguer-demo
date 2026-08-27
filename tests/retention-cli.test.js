import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRetentionFixture, databaseDigest } from "./helpers/retention-fixture.js";

const options = { skip: !process.env.TEST_MIGRATIONS_DATABASE_URL };
const cli = fileURLToPath(new URL("../apps/api/src/retention-cli.js", import.meta.url));

function runCli(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("retention CLI rejects unsafe invocation and never starts without a database", async () => {
  const missing = await runCli([], { DATABASE_URL: "" });
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /DATABASE_URL is required/);
  const missingConfirmation = await runCli(["--apply"], {
    DATABASE_URL: "postgres://camoburguer:camoburguer@127.0.0.1:55432/camoburguer_migrations_test",
  });
  assert.equal(missingConfirmation.code, 1);
  assert.match(missingConfirmation.stderr, /Usage:/);
});

test(
  "retention CLI defaults to dry-run and requires the connected database name to apply",
  options,
  async () => {
    const fixture = await createRetentionFixture();
    try {
      const env = { DATABASE_URL: fixture.connectionString, APP_ENV: "test" };
      const before = await databaseDigest(fixture.pool);
      const preview = await runCli([], env);
      assert.equal(preview.code, 0, preview.stderr);
      assert.equal(JSON.parse(preview.stdout).dryRun, true);
      assert.equal(await databaseDigest(fixture.pool), before);

      const wrong = await runCli(["--apply", "--confirm-database=camoburguer_wrong_test"], env);
      assert.equal(wrong.code, 1);
      assert.match(wrong.stderr, /does not match confirmation/);
      assert.equal(await databaseDigest(fixture.pool), before);

      const applied = await runCli([`--apply`, `--confirm-database=${fixture.databaseName}`], env);
      assert.equal(applied.code, 0, applied.stderr);
      assert.equal(JSON.parse(applied.stdout).status, "completed");
    } finally {
      await fixture.close();
    }
  },
);
