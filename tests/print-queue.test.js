import assert from "node:assert/strict";
import test from "node:test";
import {
  assertBridgeStatus,
  assertPrintPayloadSize,
  classifyPrintFailure,
  printBackoffMs,
  printPayloadBytes,
  PRINT_MAX_ATTEMPTS
} from "../apps/api/src/print-queue.js";

function job(content) {
  return {
    id: "job-1",
    orderId: "order-1",
    printerName: "cozinha",
    reason: "confirmed",
    content
  };
}

test("limite de impressão mede a serialização UTF-8 exata e não trunca", () => {
  let low = 1;
  let high = 64 * 1024;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (printPayloadBytes(job("á".repeat(middle))) <= 64 * 1024) low = middle;
    else high = middle - 1;
  }
  assert.doesNotThrow(() => assertPrintPayloadSize(job("á".repeat(low))));
  assert.throws(
    () => assertPrintPayloadSize(job("á".repeat(low + 1))),
    (error) => error.code === "PRINT_PAYLOAD_TOO_LARGE" && error.bytes > 64 * 1024
  );
});

test("bridge possui allowlist fechada e falhas têm classificação estável", () => {
  assert.equal(assertBridgeStatus("printed"), "printed");
  assert.equal(assertBridgeStatus("already_printed"), "already_printed");
  assert.throws(() => assertBridgeStatus("qualquer_status"), /não permitido/);
  assert.equal(classifyPrintFailure({ statusCode: 503 }), "transient");
  assert.equal(classifyPrintFailure({ statusCode: 429 }), "transient");
  assert.equal(classifyPrintFailure({ statusCode: 400 }), "permanent");
  assert.equal(classifyPrintFailure(new Error("socket reset")), "ambiguous");
});

test("backoff cresce, é determinístico e respeita teto e máximo de tentativas", () => {
  const delays = Array.from({ length: PRINT_MAX_ATTEMPTS }, (_, index) =>
    printBackoffMs(index + 1, "job-estavel")
  );
  assert.deepEqual(delays, [...delays].sort((left, right) => left - right));
  assert.equal(delays.every((delay) => delay <= 300_000), true);
  assert.equal(printBackoffMs(3, "job-estavel"), printBackoffMs(3, "job-estavel"));
});
