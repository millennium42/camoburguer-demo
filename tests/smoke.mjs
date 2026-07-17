import assert from "node:assert/strict";
import pg from "pg";

const apiBase = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const webBase = process.env.WEB_BASE_URL || "http://127.0.0.1:8081";
const printBase = process.env.PRINT_BRIDGE_URL || "http://127.0.0.1:3100";
const runId = Date.now().toString(36);

async function request(base, path, { method = "GET", body, headers = {}, expected = [200] } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: body ? { "content-type": "application/json", ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  assert.ok(expected.includes(response.status), `${method} ${path}: ${response.status} ${text}`);
  return payload;
}

const api = (path, options) => request(apiBase, path, options);

const web = await fetch(webBase);
assert.equal(web.status, 200);
assert.match(await web.text(), /Pedidos, cozinha e financeiro/);
assert.equal((await api("/health")).ok, true);
const catalog = await api("/catalog");
assert.equal(catalog.capturedAt, "2026-07-16");
assert.equal(catalog.items.length, 51);
assert.equal(catalog.items.filter((item) => item.available).length, 50);
assert.equal(catalog.addOns.length, 17);

const initialInventory = await api("/inventory");
const initialXis = initialInventory.balances.find((item) => item.category === "xis").quantity;
const legacyOrderId = `legacy-stock-${runId}`;
const database = new pg.Client({
  connectionString: process.env.DATABASE_URL || "postgres://camoburguer:camoburguer@127.0.0.1:5432/camoburguer"
});
await database.connect();
await database.query(
  `INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, notes, total, discount_percent, items, metadata)
   VALUES ($1, 'counter', 'confirmed', 'Pedido legado', 'pickup', '', 24, 0, $2::jsonb, '{}'::jsonb)`,
  [legacyOrderId, JSON.stringify([{ id: `legacy-line-${runId}`, sku: "x-simples", name: "X-SIMPLES", quantity: 1, price: 24, addons: [] }])]
);
await database.end();
await api(`/orders/${legacyOrderId}/status`, { method: "PATCH", body: { status: "cancelled" } });
assert.equal((await api("/inventory")).balances.find((item) => item.category === "xis").quantity, initialXis);
const stockKey = `smoke-stock-${runId}`;
const stocked = await api("/inventory/xis/adjustments", {
  method: "POST",
  headers: { "Idempotency-Key": stockKey },
  body: { delta: 5, reason: "Carga do smoke" },
  expected: [201]
});
assert.equal(stocked.balances.find((item) => item.category === "xis").quantity, initialXis + 5);
assert.equal((await api("/inventory/xis/adjustments", {
  method: "POST",
  headers: { "Idempotency-Key": stockKey },
  body: { delta: 5, reason: "Carga do smoke" }
})).repeated, true);

const tab = await api("/tabs", {
  method: "POST",
  body: { kind: "table", label: `Mesa-${runId}`, customerName: "Cliente local" },
  expected: [201]
});
const tabRoundKey = `smoke-tab-round-${runId}`;
const tabRound = await api(`/tabs/${tab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": tabRoundKey },
  body: { items: [{ sku: "x-simples", name: "X-SIMPLES", quantity: 1, price: 24 }] },
  expected: [201]
});
assert.equal(tabRound.tabId, tab.id);
assert.equal(tabRound.roundNumber, 1);
assert.equal((await api("/inventory")).balances.find((item) => item.category === "xis").quantity, initialXis + 4);
await api(`/tabs/${tab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-stock-insufficient-${runId}` },
  body: { items: [{ sku: "x-simples", name: "X-SIMPLES", quantity: initialXis + 5, price: 24 }] },
  expected: [409]
});
await api(`/orders/${tabRound.id}/status`, { method: "PATCH", body: { status: "cancelled" }, expected: [409] });
assert.equal((await api(`/tabs/${tab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": tabRoundKey },
  body: { items: [{ sku: "x-simples", name: "X-SIMPLES", quantity: 1, price: 24 }] }
})).id, tabRound.id);
const tabView = await api(`/tabs/${tab.id}`);
assert.equal(tabView.rounds.length, 1);
assert.equal(tabView.total, 24);
const cancellationKey = `smoke-tab-cancel-${runId}`;
const cancellation = await api(`/tabs/${tab.id}/rounds/${tabRound.id}/cancellations`, {
  method: "POST",
  headers: { "Idempotency-Key": cancellationKey },
  body: { items: [{ itemId: tabRound.items[0].id, quantity: 1 }], reason: "Smoke corretivo" },
  expected: [201]
});
assert.equal(cancellation.roundKind, "cancellation");
assert.equal(cancellation.reversesOrderId, tabRound.id);
assert.equal(cancellation.total, -24);
assert.equal((await api(`/tabs/${tab.id}/rounds/${tabRound.id}/cancellations`, {
  method: "POST",
  headers: { "Idempotency-Key": cancellationKey },
  body: { items: [{ itemId: tabRound.items[0].id, quantity: 1 }], reason: "Smoke corretivo" }
})).id, cancellation.id);
const cancelledTab = await api(`/tabs/${tab.id}`);
assert.equal(cancelledTab.total, 0);
assert.equal(cancelledTab.rounds[0].items[0].quantity, 1);
assert.equal((await api("/inventory")).balances.find((item) => item.category === "xis").quantity, initialXis + 5);
await api(`/tabs/${tab.id}/close`, { method: "POST", body: {} });

const preparedTab = await api("/tabs", { method: "POST", body: { label: `Preparo-${runId}` }, expected: [201] });
const preparedRound = await api(`/tabs/${preparedTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-prepared-round-${runId}` },
  body: { items: [{ sku: "x-simples", name: "X-SIMPLES", quantity: 1, price: 24 }] },
  expected: [201]
});
await api(`/orders/${preparedRound.id}/status`, { method: "PATCH", body: { status: "in_preparation" } });
await api(`/tabs/${preparedTab.id}/rounds/${preparedRound.id}/cancellations`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-prepared-cancel-${runId}` },
  body: { items: [{ itemId: preparedRound.items[0].id, quantity: 1 }], reason: "Após preparo" },
  expected: [201]
});
assert.equal((await api("/inventory")).balances.find((item) => item.category === "xis").quantity, initialXis + 4);
await api("/inventory/xis/adjustments", {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-stock-restore-${runId}` },
  body: { delta: 1, reason: "Reposição do smoke" },
  expected: [201]
});
await api(`/tabs/${preparedTab.id}/close`, { method: "POST", body: {} });

const dogBalance = (await api("/inventory")).balances.find((item) => item.category === "dog").quantity;
if (dogBalance !== 1) {
  await api("/inventory/dog/adjustments", {
    method: "POST",
    headers: { "Idempotency-Key": `smoke-dog-one-${runId}` },
    body: { delta: 1 - dogBalance, reason: "Preparar concorrência do smoke" },
    expected: [201]
  });
}
const concurrentTabs = await Promise.all([
  api("/tabs", { method: "POST", body: { label: `Concorrente-A-${runId}` }, expected: [201] }),
  api("/tabs", { method: "POST", body: { label: `Concorrente-B-${runId}` }, expected: [201] })
]);
const concurrentRounds = await Promise.all(concurrentTabs.map(async (candidate, index) => {
  const response = await fetch(`${apiBase}/tabs/${candidate.id}/rounds`, {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": `smoke-concurrent-${index}-${runId}` },
    body: JSON.stringify({ items: [{ sku: "dog-tradicional", name: "DOG TRADICIONAL", quantity: 1, price: 21 }] })
  });
  return { status: response.status, body: await response.json() };
}));
assert.deepEqual(concurrentRounds.map((result) => result.status).sort(), [201, 409]);
assert.equal((await api("/inventory")).balances.find((item) => item.category === "dog").quantity, 0);
const concurrentWinner = concurrentRounds.find((result) => result.status === 201).body;
await api(`/tabs/${concurrentWinner.tabId}/rounds/${concurrentWinner.id}/cancellations`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-concurrent-cancel-${runId}` },
  body: { items: [{ itemId: concurrentWinner.items[0].id, quantity: 1 }], reason: "Limpeza da concorrência" },
  expected: [201]
});
assert.equal((await api("/inventory")).balances.find((item) => item.category === "dog").quantity, 1);
await Promise.all(concurrentTabs.map((candidate) => api(`/tabs/${candidate.id}/close`, { method: "POST", body: {} })));

const divergentKey = `smoke-divergent-stock-${runId}`;
await api("/inventory/hamburguer/adjustments", {
  method: "POST",
  headers: { "Idempotency-Key": divergentKey },
  body: { delta: 1, reason: "Payload original" },
  expected: [201]
});
await api("/inventory/dog/adjustments", {
  method: "POST",
  headers: { "Idempotency-Key": divergentKey },
  body: { delta: 1, reason: "Payload divergente" },
  expected: [409]
});

const racingKey = `smoke-racing-stock-${runId}`;
const racingAdjustments = await Promise.all(["dog", "hamburguer"].map(async (category) => {
  const response = await fetch(`${apiBase}/inventory/${category}/adjustments`, {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": racingKey },
    body: JSON.stringify({ delta: 1, reason: `Corrida ${category}` })
  });
  return { category, status: response.status };
}));
assert.deepEqual(racingAdjustments.map((result) => result.status).sort(), [201, 409]);
const racingWinner = racingAdjustments.find((result) => result.status === 201).category;
await api(`/inventory/${racingWinner}/adjustments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-racing-cleanup-${runId}` },
  body: { delta: -1, reason: "Limpeza da corrida idempotente" },
  expected: [201]
});

const beforeRollback = await api("/inventory");
for (const category of ["dog", "xis"]) {
  const balance = beforeRollback.balances.find((item) => item.category === category).quantity;
  if (balance !== 1) {
    await api(`/inventory/${category}/adjustments`, {
      method: "POST",
      headers: { "Idempotency-Key": `smoke-rollback-balance-${category}-${runId}` },
      body: { delta: 1 - balance, reason: "Preparar rollback multcategoria" },
      expected: [201]
    });
  }
}
const rollbackTab = await api("/tabs", { method: "POST", body: { label: `Rollback-${runId}` }, expected: [201] });
await api(`/tabs/${rollbackTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-rollback-round-${runId}` },
  body: { items: [
    { sku: "dog-tradicional", name: "DOG TRADICIONAL", quantity: 1, price: 21 },
    { sku: "x-simples", name: "X-SIMPLES", quantity: 2, price: 24 }
  ] },
  expected: [409]
});
const afterRollback = await api("/inventory");
assert.equal(afterRollback.balances.find((item) => item.category === "dog").quantity, 1);
assert.equal(afterRollback.balances.find((item) => item.category === "xis").quantity, 1);
await api(`/tabs/${rollbackTab.id}/close`, { method: "POST", body: {} });

const initialShifts = (await api("/cash-shifts")).items;
const previousOpenShift = initialShifts.find((shift) => shift.status === "open");
if (previousOpenShift) {
  await api(`/cash-shifts/${previousOpenShift.id}/close`, {
    method: "POST",
    body: { declaredAmount: previousOpenShift.expectedAmount }
  });
}

const noShiftTab = await api("/tabs", { method: "POST", body: { label: `Sem-turno-${runId}` }, expected: [201] });
const noShiftRound = await api(`/tabs/${noShiftTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-no-shift-round-${runId}` },
  body: { items: [{ sku: `smoke-no-shift-${runId}`, name: "Consumo sem turno", quantity: 1, price: 5 }] },
  expected: [201]
});
await api(`/tabs/${noShiftTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-no-shift-payment-${runId}` },
  body: { paymentMethod: "pix", amountCents: 500 },
  expected: [409]
});
assert.equal((await api(`/tabs/${noShiftTab.id}`)).payments.length, 0);
await api(`/tabs/${noShiftTab.id}/rounds/${noShiftRound.id}/cancellations`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-no-shift-cancel-${runId}` },
  body: { items: [{ itemId: noShiftRound.items[0].id, quantity: 1 }], reason: "Limpeza do smoke sem turno" },
  expected: [201]
});
await api(`/tabs/${noShiftTab.id}/close`, { method: "POST", body: {} });

const historicalShift = await api("/cash-shifts/open", { method: "POST", body: { openingAmount: 0 }, expected: [201] });
const crossShiftTab = await api("/tabs", { method: "POST", body: { label: `Entre-turnos-${runId}` }, expected: [201] });
await api(`/tabs/${crossShiftTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cross-shift-round-${runId}` },
  body: { items: [{ sku: `smoke-cross-shift-${runId}`, name: "Consumo entre turnos", quantity: 1, price: 5 }] },
  expected: [201]
});
const historicalPayment = await api(`/tabs/${crossShiftTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cross-shift-payment-${runId}` },
  body: { paymentMethod: "cash", amountCents: 500 },
  expected: [201]
});
await api(`/cash-shifts/${historicalShift.id}/close`, { method: "POST", body: { declaredAmount: 5 } });

const shift = await api("/cash-shifts/open", {
  method: "POST",
  body: { openingAmount: 100 },
  expected: [201]
});
await api("/cash-shifts/open", {
  method: "POST",
  body: { openingAmount: 10 },
  expected: [409]
});
const crossShiftReversal = await api(`/tabs/${crossShiftTab.id}/payments/${historicalPayment.saved.id}/reversals`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cross-shift-reversal-${runId}` },
  body: {},
  expected: [201]
});
assert.equal(crossShiftReversal.saved.shiftId, shift.id);
assert.equal(crossShiftReversal.saved.metadata.originalShiftId, historicalShift.id);
assert.equal((await api(`/cash-shifts`)).items.find((item) => item.id === historicalShift.id).expectedAmount, 5);
assert.equal((await api(`/cash-shifts`)).items.find((item) => item.id === shift.id).expectedAmount, 95);
await api(`/tabs/${crossShiftTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cross-shift-repay-${runId}` },
  body: { paymentMethod: "pix", amountCents: 500 },
  expected: [201]
});
await api(`/tabs/${crossShiftTab.id}/close`, { method: "POST", body: {} });

const mixedTab = await api("/tabs", { method: "POST", body: { kind: "table", label: `Pagamento-${runId}` }, expected: [201] });
await api(`/tabs/${mixedTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-payment-round-${runId}` },
  body: { items: [{ sku: `smoke-meal-${runId}`, name: "Consumo local", quantity: 1, price: 100 }] },
  expected: [201]
});
const pixKey = `smoke-payment-pix-${runId}`;
const pixPayment = await api(`/tabs/${mixedTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": pixKey },
  body: { paymentMethod: "pix", amountCents: 3000 },
  expected: [201]
});
assert.equal(pixPayment.tab.balanceCents, 7000);
assert.equal((await api(`/tabs/${mixedTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": pixKey },
  body: { paymentMethod: "pix", amountCents: 3000 }
})).saved.id, pixPayment.saved.id);
await api(`/tabs/${mixedTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": pixKey },
  body: { paymentMethod: "pix", amountCents: 4000 },
  expected: [409]
});
await api(`/tabs/${mixedTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-payment-excess-${runId}` },
  body: { paymentMethod: "debit_card", amountCents: 7001 },
  expected: [409]
});
await api(`/tabs/${mixedTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-payment-debit-${runId}` },
  body: { paymentMethod: "debit_card", amountCents: 7000 },
  expected: [201]
});
const paidMixedTab = await api(`/tabs/${mixedTab.id}`);
assert.equal(paidMixedTab.paidCents, 10000);
assert.equal(paidMixedTab.balanceCents, 0);
assert.equal(paidMixedTab.paymentMethod, "mixed");
assert.equal((await api(`/tabs/${mixedTab.id}/close`, { method: "POST", body: {} })).status, "closed");

const partialTab = await api("/tabs", { method: "POST", body: { label: `Parcial-${runId}` }, expected: [201] });
await api(`/tabs/${partialTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-partial-round-${runId}` },
  body: { items: [{ sku: `smoke-partial-${runId}`, name: "Consumo parcial", quantity: 1, price: 100 }] },
  expected: [201]
});
await api(`/tabs/${partialTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-partial-9999-${runId}` },
  body: { paymentMethod: "pix", amountCents: 9999 },
  expected: [201]
});
await api(`/tabs/${partialTab.id}/close`, { method: "POST", body: {}, expected: [409] });
await api(`/tabs/${partialTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-partial-cent-${runId}` },
  body: { paymentMethod: "pix", amountCents: 1 },
  expected: [201]
});
await api(`/tabs/${partialTab.id}/close`, { method: "POST", body: {} });

const paymentRaceTab = await api("/tabs", { method: "POST", body: { label: `Corrida-pagamento-${runId}` }, expected: [201] });
await api(`/tabs/${paymentRaceTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-payment-race-round-${runId}` },
  body: { items: [{ sku: `smoke-payment-race-${runId}`, name: "Consumo concorrente", quantity: 1, price: 10 }] },
  expected: [201]
});
const paymentRace = await Promise.all(["pix", "debit_card"].map(async (paymentMethod, index) => {
  const response = await fetch(`${apiBase}/tabs/${paymentRaceTab.id}/payments`, {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": `smoke-payment-race-${index}-${runId}` },
    body: JSON.stringify({ paymentMethod, amountCents: 1000 })
  });
  return response.status;
}));
assert.deepEqual(paymentRace.sort(), [201, 409]);
assert.equal((await api(`/tabs/${paymentRaceTab.id}`)).balanceCents, 0);
await api(`/tabs/${paymentRaceTab.id}/close`, { method: "POST", body: {} });

const reversalTab = await api("/tabs", { method: "POST", body: { label: `Estorno-${runId}` }, expected: [201] });
await api(`/tabs/${reversalTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-reversal-round-${runId}` },
  body: { items: [{ sku: `smoke-reversal-${runId}`, name: "Consumo para estorno", quantity: 1, price: 20 }] },
  expected: [201]
});
const cashPayment = await api(`/tabs/${reversalTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cash-payment-${runId}` },
  body: { paymentMethod: "cash", amountCents: 2000 },
  expected: [201]
});
await api(`/tabs/${reversalTab.id}/payments/${cashPayment.saved.id}/reversals`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cash-reversal-${runId}` },
  body: {},
  expected: [201]
});
assert.equal((await api(`/tabs/${reversalTab.id}`)).balanceCents, 2000);
await api(`/tabs/${reversalTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-reversal-pix-${runId}` },
  body: { paymentMethod: "pix", amountCents: 2000 },
  expected: [201]
});
await api(`/tabs/${reversalTab.id}/close`, { method: "POST", body: {} });
await api(`/cash-shifts/${shift.id}/adjustments`, {
  method: "POST",
  body: { kind: "reinforcement", amount: 20, reason: "Troco" }
});
await api(`/cash-shifts/${shift.id}/adjustments`, {
  method: "POST",
  body: { kind: "withdrawal", amount: 5, reason: "Pagamento" }
});

async function createOrder(source, fulfillmentMode, paymentMethod, extra = {}) {
  const key = `smoke-${runId}-${source}`;
  const payload = {
    source,
    fulfillmentMode,
    paymentMethod,
    customerName: `Smoke ${source}`,
    items: [{ sku: "smoke-burger", name: "Burger smoke", quantity: 2, price: 10 },
      { sku: "smoke-batata", name: "Batata smoke", quantity: 1, price: 5 }],
    ...extra
  };
  const created = await api("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: payload,
    expected: [201]
  });
  const repeated = await api("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: payload
  });
  assert.equal(repeated.id, created.id);
  assert.equal(created.status, "confirmed");
  assert.equal(created.items.length, 2);
  return created;
}

const orders = {
  counter: await createOrder("counter", "local", "cash", {
    discountPercent: 20,
    items: [{ sku: "smoke-burger", name: "Burger smoke", quantity: 2, price: 10, discountPercent: 10 },
      { sku: "smoke-batata", name: "Batata smoke", quantity: 1, price: 5 }]
  }),
  whatsapp: await createOrder("whatsapp", "pickup", "pix"),
  ifood: await createOrder("ifood", "delivery", "app_paid", { deliveryAddress: "Rua Smoke, 123" }),
  olaclick: await createOrder("olaclick", "local", "credit_card")
};
assert.equal(orders.counter.total, 18.4);
assert.equal(orders.counter.discountPercent, 20);
assert.equal(orders.counter.items[0].discountPercent, 10);

await api("/orders", {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-${runId}-delivery-sem-endereco` },
  body: { source: "counter", fulfillmentMode: "delivery", items: [{ name: "Burger", price: 10 }] },
  expected: [400]
});
await api("/orders", {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-${runId}-desconto-invalido` },
  body: { source: "counter", discountPercent: 101, items: [{ name: "Burger", price: 10 }] },
  expected: [400]
});

const kitchenAfterCreate = (await api("/kitchen/queue")).items;
for (const order of Object.values(orders)) {
  assert.ok(kitchenAfterCreate.some((item) => item.id === order.id), `${order.source} não chegou à cozinha`);
}

for (const status of ["in_preparation", "ready", "completed"]) {
  await api(`/orders/${orders.counter.id}/status`, { method: "PATCH", body: { status } });
}
await api(`/orders/${orders.counter.id}/status`, { method: "PATCH", body: { status: "completed" } });
await api(`/orders/${orders.whatsapp.id}/status`, { method: "PATCH", body: { status: "cancelled" } });
const reprint = await api(`/orders/${orders.ifood.id}/reprint`, { method: "POST", body: {} });
assert.equal(reprint.ok, true);

const entries = (await api("/finance/entries")).items;
assert.equal(entries.filter((entry) => entry.orderId === orders.counter.id && entry.type === "sale").length, 1);
assert.equal(entries.filter((entry) => entry.tabId === mixedTab.id && entry.type === "sale").length, 2);
assert.equal(entries.filter((entry) => entry.tabId === reversalTab.id && entry.type === "cancellation").length, 1);
const financeSummary = await api("/finance/summary");
assert.equal(financeSummary.grossSales, Math.round(entries.filter((entry) => entry.type === "sale").reduce((sum, entry) => sum + entry.amount, 0) * 100) / 100);
const pixEntries = (await api("/finance/entries?paymentMethod=pix")).items;
assert.ok(pixEntries.length > 0);
assert.ok(pixEntries.every((entry) => entry.paymentMethod === "pix"));
const pixSummary = await api("/finance/summary?paymentMethod=pix");
assert.equal(pixSummary.grossSales, Math.round(pixEntries.filter((entry) => entry.type === "sale").reduce((sum, entry) => sum + entry.amount, 0) * 100) / 100);
const withdrawalEntries = (await api("/finance/entries?type=cash_withdrawal&paymentMethod=cash")).items;
assert.ok(withdrawalEntries.length > 0);
assert.ok(withdrawalEntries.every((entry) => entry.type === "cash_withdrawal" && entry.paymentMethod === "cash"));
assert.equal((await api("/finance/summary?type=cash_withdrawal&paymentMethod=cash")).grossSales, 0);
const currentShift = (await api("/cash-shifts")).items.find((item) => item.id === shift.id);
assert.equal(currentShift.expectedAmount, 128.4);

const closed = await api(`/cash-shifts/${shift.id}/close`, {
  method: "POST",
  body: { declaredAmount: 128.4 }
});
assert.equal(closed.status, "closed");
assert.equal(closed.differenceAmount, 0);
await api(`/cash-shifts/${shift.id}/close`, { method: "POST", body: { declaredAmount: 128.4 }, expected: [409] });
await api(`/cash-shifts/${shift.id}/adjustments`, {
  method: "POST",
  body: { kind: "withdrawal", amount: 1, reason: "Inválido" },
  expected: [409]
});

const bridgeJob = `smoke-${runId}-bridge`;
const bridgePayload = {
  jobId: bridgeJob,
  orderId: orders.ifood.id,
  printerName: "cozinha-principal",
  reason: "smoke",
  content: "Pedido smoke\nHorário: 12:34\n2x Burger"
};
const firstPrint = await request(printBase, "/print-jobs", { method: "POST", body: bridgePayload, expected: [201] });
const repeatedPrint = await request(printBase, "/print-jobs", { method: "POST", body: bridgePayload, expected: [201] });
assert.equal(firstPrint.id, bridgeJob);
assert.equal(repeatedPrint.id, bridgeJob);

console.log(JSON.stringify({
  ok: true,
  sources: Object.keys(orders),
  kitchenOrders: Object.values(orders).length,
  cashExpected: currentShift.expectedAmount,
  printJob: bridgeJob
}, null, 2));
