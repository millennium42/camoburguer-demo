import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_VERSION,
  cancellationFingerprintPayload,
  canonicalJson,
  fingerprint,
  moneyCents,
  orderFingerprintPayload
} from "../apps/api/src/idempotency.js";

test("canonicalizacao ordena objetos, itens e adicionais sem depender da ordem JSON", () => {
  const left = orderFingerprintPayload({
    customerName: "Ana",
    items: [
      { sku: "b", quantity: 1, addons: [{ sku: "z" }, { sku: "a" }] },
      { sku: "a", quantity: 2 }
    ],
    metadata: { z: 1, a: 2 }
  });
  const right = orderFingerprintPayload({
    metadata: { a: 2, z: 1 },
    items: [
      { quantity: 2, sku: "a" },
      { addons: [{ sku: "a" }, { sku: "z" }], quantity: 1, sku: "b" }
    ],
    customerName: "Ana"
  });
  assert.equal(canonicalJson(left), canonicalJson(right));
  assert.equal(fingerprint(left), fingerprint(right));
  assert.match(fingerprint(left), /^[0-9a-f]{64}$/);
  assert.equal(CANONICAL_VERSION, "v1");
});

test("dinheiro usa centavos decimais exatos e rejeita mais de duas casas", () => {
  assert.equal(moneyCents("10.20"), 1020);
  assert.equal(moneyCents(0.1), 10);
  assert.equal(moneyCents("-1.05"), -105);
  assert.throws(() => moneyCents("1.001"), /invalido/);
});

test("campos opcionais equivalentes convergem e mudanca semantica diverge", () => {
  const base = orderFingerprintPayload({ items: [{ sku: "x", quantity: 1 }] });
  const explicit = orderFingerprintPayload({
    source: "counter",
    customerName: "Cliente",
    fulfillmentMode: "local",
    paymentMethod: "cash",
    discountPercent: 0,
    notes: "",
    items: [{ sku: "x", quantity: 1, discountPercent: 0, notes: "", addons: [] }]
  });
  assert.equal(fingerprint(base), fingerprint(explicit));
  assert.notEqual(
    fingerprint(base),
    fingerprint(orderFingerprintPayload({ items: [{ sku: "x", quantity: 2 }] }))
  );
});

test("cancelamento inclui motivo, item, quantidade e recurso", () => {
  const base = cancellationFingerprintPayload({
    tabId: "tab-1",
    orderId: "order-1",
    body: { reason: "erro", items: [{ itemId: "line-1", quantity: 1 }] }
  });
  assert.notEqual(fingerprint(base), fingerprint(cancellationFingerprintPayload({
    tabId: "tab-2",
    orderId: "order-1",
    body: { reason: "erro", items: [{ itemId: "line-1", quantity: 1 }] }
  })));
  assert.notEqual(fingerprint(base), fingerprint({ ...base, reason: "outro" }));
});
