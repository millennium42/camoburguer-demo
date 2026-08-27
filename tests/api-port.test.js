import assert from "node:assert/strict";
import test from "node:test";
import { parseListenPort } from "../apps/api/src/config.js";

test("API accepts an OS-assigned port and validates TCP port bounds", () => {
  assert.equal(parseListenPort(undefined), 3001);
  assert.equal(parseListenPort(""), 3001);
  assert.equal(parseListenPort("0"), 0);
  assert.equal(parseListenPort("3001"), 3001);
  assert.equal(parseListenPort("65535"), 65535);
  for (const value of ["-1", "65536", "abc", "1.5", "Infinity"]) {
    assert.throws(() => parseListenPort(value), /PORT/);
  }
});
