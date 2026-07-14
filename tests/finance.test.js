import test from "node:test";
import assert from "node:assert/strict";
import { createCashShift, createOrder } from "../packages/domain/index.js";
import {
  buildEntriesFromOrder,
  buildEntryFromAdjustment,
  buildOpeningEntry,
  filterEntries,
  summarizeFinance
} from "../packages/finance-core/index.js";

test("financeiro lança venda ao concluir pedido", () => {
  const order = createOrder({
    source: "ifood",
    paymentMethod: "credit_card",
    items: [{ name: "Burger", quantity: 1, price: 32 }]
  });
  const entries = buildEntriesFromOrder({
    order,
    previousStatus: "ready",
    nextStatus: "completed"
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, "sale");
  assert.equal(entries[0].amount, 32);
});

test("sumário financeiro agrega entradas", () => {
  const shift = createCashShift({ openingAmount: 20 });
  const order = createOrder({
    source: "counter",
    paymentMethod: "cash",
    items: [{ name: "Burger", quantity: 1, price: 20 }]
  });
  const entries = [
    buildOpeningEntry(shift),
    ...buildEntriesFromOrder({ order, previousStatus: "ready", nextStatus: "completed", shiftId: shift.id }),
    buildEntryFromAdjustment({ shift, kind: "reinforcement", amount: 10, reason: "Troco" })
  ];

  const summary = summarizeFinance(entries, [{ ...order, status: "completed" }]);
  assert.equal(summary.grossSales, 20);
  assert.equal(summary.ticketAverage, 20);
  assert.equal(summary.salesBySource.counter, 20);
});

test("movimentação só aceita caixa aberto e valor positivo", () => {
  const shift = createCashShift({ openingAmount: 20 });
  assert.throws(
    () => buildEntryFromAdjustment({ shift: { ...shift, status: "closed" }, kind: "withdrawal", amount: 5 }),
    /aberto/
  );
  assert.throws(
    () => buildEntryFromAdjustment({ shift, kind: "reinforcement", amount: 0 }),
    /Valor/
  );
});

test("efeito financeiro repetido não gera nova entrada", () => {
  const order = createOrder({
    paymentMethod: "pix",
    items: [{ name: "Burger", price: 30 }]
  });
  assert.deepEqual(
    buildEntriesFromOrder({ order, previousStatus: "completed", nextStatus: "completed" }),
    []
  );
  assert.deepEqual(
    buildEntriesFromOrder({ order, previousStatus: "cancelled", nextStatus: "cancelled" }),
    []
  );
});

test("resumo conta somente pedidos presentes nas vendas filtradas", () => {
  const entries = [
    {
      id: "sale-counter",
      orderId: "order-counter",
      shiftId: "shift-a",
      type: "sale",
      amount: 20,
      paymentMethod: "cash",
      source: "counter",
      occurredAt: "2026-07-14T12:00:00.000Z"
    },
    {
      id: "sale-ifood",
      orderId: "order-ifood",
      shiftId: "shift-b",
      type: "sale",
      amount: 40,
      paymentMethod: "app_paid",
      source: "ifood",
      occurredAt: "2026-07-14T13:00:00.000Z"
    }
  ];

  const summary = summarizeFinance(filterEntries(entries, { source: "ifood", shiftId: "shift-b" }));
  assert.equal(summary.grossSales, 40);
  assert.equal(summary.totalOrders, 1);
  assert.equal(summary.ticketAverage, 40);
});
