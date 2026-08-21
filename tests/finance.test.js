import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { validateTimeZone } from "../apps/api/src/config.js";
import { createCashShift, createOrder } from "../packages/domain/index.js";
import {
  buildEntriesFromOrder,
  buildEntryFromAdjustment,
  buildEntryFromTabPayment,
  buildOpeningEntry,
  businessDate,
  businessHour,
  filterEntries,
  summarizeFinance,
} from "../packages/finance-core/index.js";

test("financeiro lança venda ao concluir pedido", () => {
  const order = createOrder(
    {
      source: "ifood",
      paymentMethod: "credit_card",
      discountPercent: 10,
      items: [{ name: "Burger", quantity: 1, price: 32, discountPercent: 25 }],
    },
    { allowCustomItems: true },
  );
  const entries = buildEntriesFromOrder({
    order,
    previousStatus: "ready",
    nextStatus: "completed",
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, "sale");
  assert.equal(entries[0].amount, 21.6);
});

test("sumário financeiro agrega entradas", () => {
  const shift = createCashShift({ openingAmount: 20 });
  const order = createOrder(
    {
      source: "counter",
      paymentMethod: "cash",
      items: [{ name: "Burger", quantity: 1, price: 20 }],
    },
    { allowCustomItems: true },
  );
  const entries = [
    buildOpeningEntry(shift),
    ...buildEntriesFromOrder({
      order,
      previousStatus: "ready",
      nextStatus: "completed",
      shiftId: shift.id,
    }),
    buildEntryFromAdjustment({ shift, kind: "reinforcement", amount: 10, reason: "Troco" }),
  ];

  const summary = summarizeFinance(entries, [{ ...order, status: "completed" }]);
  assert.equal(summary.grossSales, 20);
  assert.equal(summary.ticketAverage, 20);
  assert.equal(summary.salesBySource.counter, 20);
});

test("movimentação só aceita caixa aberto e valor positivo", () => {
  const shift = createCashShift({ openingAmount: 20 });
  assert.throws(
    () =>
      buildEntryFromAdjustment({
        shift: { ...shift, status: "closed" },
        kind: "withdrawal",
        amount: 5,
      }),
    /aberto/,
  );
  assert.throws(
    () => buildEntryFromAdjustment({ shift, kind: "reinforcement", amount: 0 }),
    /Valor/,
  );
});

test("efeito financeiro repetido não gera nova entrada", () => {
  const order = createOrder(
    {
      paymentMethod: "pix",
      items: [{ name: "Burger", price: 30 }],
    },
    { allowCustomItems: true },
  );
  assert.deepEqual(
    buildEntriesFromOrder({ order, previousStatus: "completed", nextStatus: "completed" }),
    [],
  );
  assert.deepEqual(
    buildEntriesFromOrder({ order, previousStatus: "cancelled", nextStatus: "cancelled" }),
    [],
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
      occurredAt: "2026-07-14T12:00:00.000Z",
    },
    {
      id: "sale-ifood",
      orderId: "order-ifood",
      shiftId: "shift-b",
      type: "sale",
      amount: 40,
      paymentMethod: "app_paid",
      source: "ifood",
      occurredAt: "2026-07-14T13:00:00.000Z",
    },
  ];

  const summary = summarizeFinance(filterEntries(entries, { source: "ifood", shiftId: "shift-b" }));
  assert.equal(summary.grossSales, 40);
  assert.equal(summary.totalOrders, 1);
  assert.equal(summary.ticketAverage, 40);
});

test("parcelas da mesma comanda preservam método e contam uma venda comercial", () => {
  const tab = { id: "tab-100", kind: "table", label: "12" };
  const pix = buildEntryFromTabPayment({
    tab,
    payment: {
      id: "pay-pix",
      kind: "payment",
      amountCents: 3000,
      paymentMethod: "pix",
      shiftId: "shift-a",
      createdAt: "2026-07-16T20:00:00.000Z",
    },
  });
  const debit = buildEntryFromTabPayment({
    tab,
    payment: {
      id: "pay-debit",
      kind: "payment",
      amountCents: 7000,
      paymentMethod: "debit_card",
      shiftId: "shift-a",
      createdAt: "2026-07-16T20:01:00.000Z",
    },
  });
  const summary = summarizeFinance([pix, debit]);

  assert.equal(pix.amount, 30);
  assert.equal(debit.amount, 70);
  assert.equal(summary.grossSales, 100);
  assert.equal(summary.totalOrders, 1);
  assert.equal(summary.ticketAverage, 100);
  assert.deepEqual(summary.paymentsByMethod, { pix: 30, debit_card: 70 });
});

test("estorno de parcela gera lançamento compensatório sem apagar a venda", () => {
  const tab = { id: "tab-reversal", kind: "tab", label: "Ana" };
  const reversal = buildEntryFromTabPayment({
    tab,
    payment: {
      id: "reversal-1",
      kind: "reversal",
      reversesPaymentId: "payment-1",
      amountCents: -2000,
      paymentMethod: "cash",
      shiftId: "shift-a",
      createdAt: "2026-07-16T20:02:00.000Z",
    },
  });

  assert.equal(reversal.type, "cancellation");
  assert.equal(reversal.amount, -20);
  assert.equal(reversal.metadata.reversesPaymentId, "payment-1");
});

test("timezone de negócio torna buckets e filtros independentes do TZ do processo", () => {
  const entries = [
    {
      type: "sale",
      amount: 10,
      paymentMethod: "pix",
      source: "counter",
      orderId: "midnight-order",
      occurredAt: "2026-01-01T02:30:00.000Z",
    },
  ];
  const previous = process.env.TZ;
  process.env.TZ = "UTC";
  const utcProcess = summarizeFinance(entries, { timeZone: "America/Sao_Paulo" });
  process.env.TZ = "Asia/Tokyo";
  const tokyoProcess = summarizeFinance(entries, { timeZone: "America/Sao_Paulo" });
  process.env.TZ = previous;

  assert.deepEqual(tokyoProcess, utcProcess);
  assert.equal(businessDate(entries[0].occurredAt, "America/Sao_Paulo"), "2025-12-31");
  assert.equal(businessHour(entries[0].occurredAt, "America/Sao_Paulo"), "23");
  assert.equal(
    filterEntries(
      entries,
      {
        dateFrom: "2025-12-31",
        dateTo: "2025-12-31",
      },
      { timeZone: "America/Sao_Paulo" },
    ).length,
    1,
  );
});

test("cancelamento reduz o método original e reconcilia com o líquido", () => {
  const entries = [
    {
      type: "sale",
      amount: 100,
      paymentMethod: "credit_card",
      source: "counter",
      orderId: "order-cancelled",
      occurredAt: "2026-07-16T20:00:00.000Z",
    },
    {
      type: "cancellation",
      amount: -40,
      paymentMethod: "credit_card",
      source: "counter",
      orderId: "order-cancelled",
      occurredAt: "2026-07-16T21:00:00.000Z",
    },
  ];
  const summary = summarizeFinance(entries, { timeZone: "America/Sao_Paulo" });
  assert.deepEqual(summary.paymentsByMethod, { credit_card: 60 });
  assert.equal(summary.netSales, 60);
  assert.deepEqual(summary.reconciliation, {
    methodTotal: 60,
    difference: 0,
    balanced: true,
    unattributed: 0,
  });
});

test("legado sem método é explícito e não inventa caixa", () => {
  const summary = summarizeFinance(
    [
      {
        type: "cancellation",
        amount: -5,
        paymentMethod: null,
        source: "counter",
        orderId: "legacy",
        occurredAt: "2018-11-04T03:30:00.000Z",
      },
    ],
    { timeZone: "America/Sao_Paulo" },
  );
  assert.equal(summary.paymentsByMethod.unattributed, -5);
  assert.equal(summary.reconciliation.unattributed, -5);
  assert.equal(summary.reconciliation.balanced, true);
});

test("filtro financeiro recusa data civil ambígua ou inexistente", () => {
  assert.throws(
    () => filterEntries([], { dateFrom: "2026-07-16T00:00:00" }),
    (error) => error.statusCode === 400,
  );
  assert.throws(
    () => filterEntries([], { dateTo: "2026-02-30" }),
    (error) => error.statusCode === 400,
  );
});

test("timezone IANA é validado com padrão operacional explícito", () => {
  assert.equal(validateTimeZone(undefined), "America/Sao_Paulo");
  assert.equal(validateTimeZone("UTC"), "UTC");
  assert.throws(() => validateTimeZone("GMT-03 inventado"), /BUSINESS_TIME_ZONE inválido/);
});

test("processos filhos sob TZ distintos produzem relatório byte a byte idêntico", () => {
  const script = `
    import { filterEntries, summarizeFinance } from "./packages/finance-core/index.js";
    const entries = [
      { type: "sale", amount: 50, paymentMethod: "pix", source: "counter", orderId: "a", occurredAt: "2026-01-01T02:59:59.000Z" },
      { type: "cancellation", amount: -10, paymentMethod: "pix", source: "counter", orderId: "a", occurredAt: "2026-01-01T03:00:00.000Z" }
    ];
    const filtered = filterEntries(entries, { dateFrom: "2025-12-31", dateTo: "2026-01-01" }, { timeZone: "America/Sao_Paulo" });
    process.stdout.write(JSON.stringify(summarizeFinance(filtered, { timeZone: "America/Sao_Paulo" })));
  `;
  const run = (tz) =>
    spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, TZ: tz },
    });
  const utc = run("UTC");
  const saoPaulo = run("America/Sao_Paulo");
  assert.equal(utc.status, 0, utc.stderr);
  assert.equal(saoPaulo.status, 0, saoPaulo.stderr);
  assert.equal(utc.stdout, saoPaulo.stdout);
});

test("bucket usa regras históricas de DST sem offset fixo", () => {
  assert.equal(businessHour("2024-03-10T06:59:59.000Z", "America/New_York"), "01");
  assert.equal(businessHour("2024-03-10T07:00:00.000Z", "America/New_York"), "03");
});
