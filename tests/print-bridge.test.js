import assert from "node:assert/strict";
import test from "node:test";
import {
  equalSecret,
  safeId,
  validPrintContent
} from "../apps/print-bridge/src/validation.js";

test("bridge aceita apenas ids que não escapam do spool", () => {
  assert.equal(safeId("order_123-ABC", "orderId"), "order_123-ABC");
  assert.throws(() => safeId("../../fora", "orderId"), /inválido/);
  assert.throws(() => safeId("pedido/arquivo", "orderId"), /inválido/);
});

test("bridge compara o bearer e limita o conteúdo", () => {
  assert.equal(equalSecret("Bearer segredo", "Bearer segredo"), true);
  assert.equal(equalSecret("Bearer errado", "Bearer segredo"), false);
  assert.equal(validPrintContent("ticket"), true);
  assert.equal(validPrintContent(""), false);
  assert.equal(validPrintContent("x".repeat(65 * 1024)), false);
});
