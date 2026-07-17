import assert from "node:assert/strict";

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

const initialShifts = (await api("/cash-shifts")).items;
const previousOpenShift = initialShifts.find((shift) => shift.status === "open");
if (previousOpenShift) {
  await api(`/cash-shifts/${previousOpenShift.id}/close`, {
    method: "POST",
    body: { declaredAmount: previousOpenShift.expectedAmount }
  });
}

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
const currentShift = (await api("/cash-shifts")).items.find((item) => item.id === shift.id);
assert.equal(currentShift.expectedAmount, 133.4);

const closed = await api(`/cash-shifts/${shift.id}/close`, {
  method: "POST",
  body: { declaredAmount: 133.4 }
});
assert.equal(closed.status, "closed");
assert.equal(closed.differenceAmount, 0);
await api(`/cash-shifts/${shift.id}/close`, { method: "POST", body: { declaredAmount: 133.4 }, expected: [409] });
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
