import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

test("daily retention script is executable and requires explicit database confirmation", async () => {
  const path = new URL("../scripts/retention-daily.sh", import.meta.url);
  const [script, metadata] = await Promise.all([readFile(path, "utf8"), stat(path)]);
  assert.match(script, /^#!\/usr\/bin\/env bash\nset -euo pipefail/);
  assert.match(script, /RETENTION_DATABASE_NAME/);
  assert.match(script, /--apply/);
  assert.match(script, /--confirm-database=/);
  assert.equal(metadata.mode & 0o111, 0o111);
});
