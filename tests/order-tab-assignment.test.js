import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeTabAssignmentPayload,
  sameTabAssignment,
  tabAssignmentEligibility,
} from "../apps/api/src/order-tab-assignment.js";

const eligibleOrder = {
  id: "order-1",
  tabId: null,
  roundKind: "production",
  reversesOrderId: null,
  fulfillmentMode: "local",
  paymentMethod: "cash",
  status: "confirmed",
};

test("normaliza destinos novo e existente com contrato exclusivo", () => {
  assert.deepEqual(normalizeTabAssignmentPayload({ tabId: " tab-1 " }), { tabId: "tab-1" });
  assert.deepEqual(
    normalizeTabAssignmentPayload({
      newTab: {
        kind: "table",
        label: " Mesa 2 ",
        customerName: " Ana ",
      },
    }),
    { newTab: { kind: "table", label: "Mesa 2", customerName: "Ana" } },
  );
  assert.deepEqual(normalizeTabAssignmentPayload({ newTab: { label: "Balcão" } }), {
    newTab: { kind: "tab", label: "Balcão", customerName: null },
  });
  for (const invalid of [
    {},
    { tabId: "" },
    { tabId: "x", newTab: { label: "y" } },
    { tabId: "x", extra: true },
    { newTab: { label: "x", extra: true } },
    { newTab: { kind: "invalid", label: "x" } },
  ])
    assert.throws(() => normalizeTabAssignmentPayload(invalid));
});

test("elegibilidade bloqueia cada efeito incompatível", () => {
  for (const status of ["confirmed", "in_preparation", "ready"]) {
    assert.deepEqual(tabAssignmentEligibility({ ...eligibleOrder, status }), {
      eligible: true,
      reason: null,
    });
  }
  const cases = [
    [{ tabId: "tab-1" }, {}, "already_assigned"],
    [{ roundKind: "cancellation", reversesOrderId: "original" }, {}, "corrective_order"],
    [{ fulfillmentMode: "delivery" }, {}, "not_local"],
    [{ fulfillmentMode: "pickup" }, {}, "not_local"],
    [{ paymentMethod: "app_paid" }, {}, "app_paid"],
    [{ status: "received" }, {}, "status_not_eligible"],
    [{ status: "completed" }, {}, "status_not_eligible"],
    [{ status: "cancelled" }, {}, "status_not_eligible"],
    [{}, { hasChannelMapping: true }, "integrated_order"],
    [{}, { hasFinanceEntry: true }, "finance_already_recorded"],
  ];
  for (const [patch, flags, reason] of cases) {
    assert.deepEqual(tabAssignmentEligibility({ ...eligibleOrder, ...patch }, flags), {
      eligible: false,
      reason,
    });
  }
});

test("replay exige mesmo pedido e payload normalizado", () => {
  const assignment = { orderId: "order-1", normalizedPayload: { tabId: "tab-1" } };
  assert.equal(sameTabAssignment(assignment, "order-1", { tabId: "tab-1" }), true);
  assert.equal(sameTabAssignment(assignment, "order-2", { tabId: "tab-1" }), false);
  assert.equal(sameTabAssignment(assignment, "order-1", { tabId: "tab-2" }), false);
  assert.equal(
    sameTabAssignment(
      {
        orderId: "order-1",
        normalizedPayload: { newTab: { customerName: "Ana", label: "Mesa", kind: "table" } },
      },
      "order-1",
      {
        newTab: { kind: "table", label: "Mesa", customerName: "Ana" },
      },
    ),
    true,
  );
});
