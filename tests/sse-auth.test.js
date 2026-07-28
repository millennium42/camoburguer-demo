import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { createSseHub } from "../apps/api/src/sse.js";

function fakeReply() {
  const raw = new EventEmitter();
  raw.destroyed = false;
  raw.output = "";
  raw.write = (chunk) => { raw.output += chunk; };
  raw.end = () => {
    raw.destroyed = true;
    raw.emit("close");
  };
  return { raw };
}

test("SSE revalida a sessao antes de cada emissao", async () => {
  const hub = createSseHub();
  const authorized = fakeReply();
  const revoked = fakeReply();
  hub.subscribe("orders", authorized, async () => true);
  hub.subscribe("orders", revoked, async () => false);

  await hub.publish("orders", { type: "order.updated" });

  assert.match(authorized.raw.output, /order\.updated/);
  assert.equal(revoked.raw.output, "");
  assert.equal(revoked.raw.destroyed, true);
  authorized.raw.end();
});
