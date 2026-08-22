import assert from "node:assert/strict";
import pg from "pg";

const apiBase = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const webBase = process.env.WEB_BASE_URL || `${apiBase}/app/`;
const printBase = process.env.PRINT_BRIDGE_URL || "http://127.0.0.1:3100";
const printBridgeToken = process.env.PRINT_BRIDGE_TOKEN || "";
const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD || "";
let authHeaders = {};
const runId = Date.now().toString(36);
const smokeBurgerSku = `smoke-burger-${runId}`;
const smokeBatataSku = `smoke-batata-${runId}`;

if (!adminPassword) {
  throw new Error(
    "ADMIN_PASSWORD ou ADMIN_BOOTSTRAP_PASSWORD é obrigatório para o smoke autenticado",
  );
}

async function request(
  base,
  path,
  { method = "GET", body, headers = {}, expected = [200], authenticated = true } = {},
) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(base === apiBase && authenticated ? authHeaders : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  assert.ok(expected.includes(response.status), `${method} ${path}: ${response.status} ${text}`);
  return payload;
}

const api = (path, options) => request(apiBase, path, options);

async function advanceAndClose(tabId, expected = [200, 201]) {
  const view = await api(`/tabs/${tabId}`);
  for (const r of view.rounds) {
    if (r.status === "confirmed") {
      await api(`/orders/${r.id}/status`, { method: "PATCH", body: { status: "in_preparation" } });
      await api(`/orders/${r.id}/status`, { method: "PATCH", body: { status: "ready" } });
    } else if (r.status === "in_preparation") {
      await api(`/orders/${r.id}/status`, { method: "PATCH", body: { status: "ready" } });
    }
  }
  return await api(`/tabs/${tabId}/close`, { method: "POST", body: {}, expected });
}

async function observeOrderEvents() {
  const controller = new AbortController();
  const response = await fetch(`${apiBase}/events/orders`, {
    headers: authHeaders,
    signal: controller.signal,
  });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events = [];
  let buffer = "";
  const pump = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";
        for (const block of blocks) {
          const data = block
            .split("\n")
            .find((line) => line.startsWith("data: "))
            ?.slice(6);
          if (data) events.push(JSON.parse(data));
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") throw error;
    }
  })();
  return {
    events,
    async close() {
      await new Promise((resolve) => setTimeout(resolve, 100));
      controller.abort();
      await pump;
    },
  };
}

const web = await fetch(webBase);
assert.equal(web.status, 200);
const webHtml = await web.text();
assert.match(webHtml, /Pedidos, cozinha e financeiro/);
assert.doesNotMatch(webHtml, /id="root"|\/app\/assets\/index-/);

const legacyWeb = await fetch(`${apiBase}/app/legacy/`, { redirect: "manual" });
assert.equal(legacyWeb.status, 302);
assert.equal(legacyWeb.headers.get("location"), "/app/");

// M-02: Garantir que GET e HEAD na raiz redirecionam sem auth
const rootGet = await fetch(apiBase + "/", { redirect: "manual" });
assert.equal(rootGet.status, 302);
assert.equal(rootGet.headers.get("location"), "/app/");

const rootHead = await fetch(apiBase + "/", { method: "HEAD", redirect: "manual" });
assert.equal(rootHead.status, 302);
assert.equal(rootHead.headers.get("location"), "/app/");

// M-02: Garantir que POST na raiz retorna 404 limpo (ou 401 dependendo do hook, mas como nao esta em PUBLIC_UI_PATHS pra POST, e 401!)
const rootPost = await fetch(apiBase + "/", { method: "POST" });
assert.equal(rootPost.status, 401);

assert.equal((await api("/health")).ok, true);
assert.equal((await api("/health")).database, "reachable");
const loginResponse = await fetch(`${apiBase}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "admin", password: adminPassword }),
});
assert.equal(loginResponse.status, 200);
const login = await loginResponse.json();
const cookies = (
  loginResponse.headers.getSetCookie?.() || [loginResponse.headers.get("set-cookie") || ""]
)
  .map((value) => value.split(";")[0])
  .filter(Boolean)
  .join("; ");
authHeaders = { cookie: cookies, "x-csrf-token": login.csrfToken };
const me = await api("/auth/me");
assert.equal(me.user.username, "admin");
assert.equal(me.user.role, "admin");
assert.equal(me.csrfToken, login.csrfToken);
const catalog = await api("/catalog");
assert.equal(catalog.capturedAt, "2026-07-16");
assert.ok(catalog.items.length >= 51);
assert.ok(catalog.items.filter((item) => item.available).length >= 50);
assert.equal(catalog.addOns.length, 17);

{
  const adminHeaders = {};
  await api("/catalog/items", {
    method: "POST",
    body: { sku: `unauthorized-${runId}`, name: "Bloqueado", category: "Teste", price: 1 },
    expected: [401],
    authenticated: false,
  });
  const fixtures = [
    [smokeBurgerSku, "Burger smoke", 10],
    [smokeBatataSku, "Batata smoke", 5],
    [`smoke-no-shift-${runId}`, "Consumo sem turno", 5],
    [`smoke-cross-shift-${runId}`, "Consumo entre turnos", 5],
    [`smoke-meal-${runId}`, "Consumo local", 100],
    [`smoke-partial-${runId}`, "Consumo parcial", 100],
    [`smoke-payment-race-${runId}`, "Consumo concorrente", 10],
    [`smoke-reversal-${runId}`, "Consumo para estorno", 20],
  ];
  for (const [sku, name, price] of fixtures) {
    await api("/catalog/items", {
      method: "POST",
      headers: adminHeaders,
      body: { sku, name, category: "Smoke", price, preparationMode: "kitchen" },
      expected: [201],
    });
  }

  const managedSku = `smoke-managed-${runId}`;
  const managedCreated = await api("/catalog/items", {
    method: "POST",
    headers: adminHeaders,
    body: {
      sku: managedSku,
      name: "Bala smoke",
      category: "Bomboniere",
      price: 2,
      preparationMode: "direct_handoff",
    },
    expected: [201],
  });
  await api(`/catalog/items/${managedSku}`, {
    method: "PATCH",
    headers: { ...adminHeaders, "if-match": managedCreated.updatedAt },
    body: { available: "false" },
    expected: [400],
  });
  const paused = await api(`/catalog/items/${managedSku}`, {
    method: "PATCH",
    headers: { ...adminHeaders, "if-match": managedCreated.updatedAt },
    body: { available: false, price: 2.5 },
  });
  assert.equal(paused.available, false);
  assert.equal(paused.price, 2.5);
  await api("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": `paused-${runId}` },
    body: { items: [{ sku: managedSku, quantity: 1 }] },
    expected: [400],
  });
  const resumed = await api(`/catalog/items/${managedSku}`, {
    method: "PATCH",
    headers: { ...adminHeaders, "if-match": paused.updatedAt },
    body: { available: true },
  });
  const edited = await api(`/catalog/items/${managedSku}`, {
    method: "PATCH",
    headers: { ...adminHeaders, "if-match": resumed.updatedAt },
    body: { description: "edição concorrente" },
  });
  await api(`/catalog/items/${managedSku}`, {
    method: "PATCH",
    headers: { ...adminHeaders, "if-match": resumed.updatedAt },
    body: { price: 99 },
    expected: [412],
  });
  const directOrder = await api("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": `direct-${runId}` },
    body: { items: [{ sku: managedSku, quantity: 1 }] },
    expected: [201],
  });
  assert.equal(directOrder.status, "ready");
  assert.equal(directOrder.items[0].preparationMode, "direct_handoff");
  await api(`/catalog/items/${managedSku}`, {
    method: "DELETE",
    headers: { ...adminHeaders, "if-match": edited.updatedAt },
  });
  assert.equal(
    (await api("/catalog")).items.some((item) => item.sku === managedSku),
    false,
  );
  assert.equal(
    (await api("/catalog?includeArchived=true", { headers: adminHeaders })).items.find(
      (item) => item.sku === managedSku,
    ).archivedAt != null,
    true,
  );

  const raceSku = `smoke-race-catalog-${runId}`;
  await api("/catalog/items", {
    method: "POST",
    headers: adminHeaders,
    body: { sku: raceSku, name: "Corrida catálogo", category: "Smoke", price: 3 },
    expected: [201],
  });
  const raceResults = await Promise.all([
    api(`/catalog/items/${raceSku}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: { price: 4 },
      expected: [200, 404],
    }),
    api(`/catalog/items/${raceSku}`, { method: "DELETE", headers: adminHeaders, expected: [200] }),
  ]);
  assert.equal(
    raceResults.some((item) => item?.archivedAt != null),
    true,
  );
}

const catalogDrink = catalog.items.find((item) => item.sku === "refrigerante-lata");
assert.equal(catalogDrink?.preparationMode, "direct_handoff");
assert.equal(catalogDrink?.stockCategory, null);

const initialInventory = await api("/inventory");
const initialXis = initialInventory.balances.find((item) => item.category === "xis").quantity;
const legacyOrderId = `legacy-stock-${runId}`;
const database = new pg.Client({
  connectionString:
    process.env.DATABASE_URL || "postgres://camoburguer:camoburguer@127.0.0.1:5432/camoburguer",
});
await database.connect();
await database.query(
  `INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, notes, total, discount_percent, items, metadata)
   VALUES ($1, 'counter', 'confirmed', 'Pedido legado', 'pickup', '', 24, 0, $2::jsonb, '{}'::jsonb)`,
  [
    legacyOrderId,
    JSON.stringify([
      {
        id: `legacy-line-${runId}`,
        sku: "x-simples",
        name: "X-SIMPLES",
        quantity: 1,
        price: 24,
        addons: [],
      },
    ]),
  ],
);
await api(`/orders/${legacyOrderId}/status`, {
  method: "PATCH",
  headers: { "Idempotency-Key": `smoke-cancel-${legacyOrderId}` },
  body: { status: "cancelled" },
});
assert.equal(
  (await api("/inventory")).balances.find((item) => item.category === "xis").quantity,
  initialXis,
);
const stockKey = `smoke-stock-${runId}`;
const stocked = await api("/inventory/xis/adjustments", {
  method: "POST",
  headers: { "Idempotency-Key": stockKey },
  body: { delta: 5, reason: "Carga do smoke" },
  expected: [201],
});
assert.equal(stocked.balances.find((item) => item.category === "xis").quantity, initialXis + 5);
assert.equal(
  (
    await api("/inventory/xis/adjustments", {
      method: "POST",
      headers: { "Idempotency-Key": stockKey },
      body: { delta: 5, reason: "Carga do smoke" },
    })
  ).repeated,
  true,
);

const assignableOrder = await api("/orders", {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-assignable-order-${runId}` },
  body: {
    customerName: "Cliente para vínculo",
    fulfillmentMode: "local",
    paymentMethod: "cash",
    items: [{ sku: smokeBurgerSku, quantity: 1 }],
  },
  expected: [201],
});
const originalOrderSnapshot = structuredClone(assignableOrder);
assert.deepEqual(
  (await api("/orders")).items.find((order) => order.id === assignableOrder.id)
    .tabAssignmentEligibility,
  { eligible: true, reason: null },
);
const originalJobs = await database.query(
  "SELECT * FROM print_jobs WHERE order_id = $1 ORDER BY created_at, id",
  [assignableOrder.id],
);
assert.equal(originalJobs.rowCount, 1);
const stockMovementsBeforeAssignment = Number(
  (await database.query("SELECT COUNT(*) FROM stock_movements")).rows[0].count,
);
const assignmentTarget = await api("/tabs", {
  method: "POST",
  body: { kind: "table", label: `Vínculo-${runId}`, customerName: "Cliente para vínculo" },
  expected: [201],
});
const assignmentKey = `smoke-assignment-${runId}`;
const orderEvents = await observeOrderEvents();
const assigned = await api(`/orders/${assignableOrder.id}/tab-assignment`, {
  method: "POST",
  headers: { "Idempotency-Key": assignmentKey },
  body: { tabId: assignmentTarget.id },
  expected: [201],
});
assert.equal(assigned.repeated, false);
assert.equal(assigned.order.tabId, assignmentTarget.id);
assert.equal(assigned.order.roundNumber, 1);
for (const field of ["status", "paymentMethod", "total"]) {
  assert.deepEqual(assigned.order[field], originalOrderSnapshot[field]);
}
assert.deepEqual(assigned.order.items, originalOrderSnapshot.items);
const replayedAssignment = await api(`/orders/${assignableOrder.id}/tab-assignment`, {
  method: "POST",
  headers: { "Idempotency-Key": assignmentKey },
  body: { tabId: assignmentTarget.id },
});
assert.equal(replayedAssignment.repeated, true);
assert.equal(replayedAssignment.assignment.id, assigned.assignment.id);
await orderEvents.close();
assert.equal(
  orderEvents.events.filter(
    (event) =>
      event.type === "order.tab.assigned" && event.payload.assignment.id === assigned.assignment.id,
  ).length,
  1,
);
assert.deepEqual(
  (await api("/orders")).items.find((order) => order.id === assignableOrder.id)
    .tabAssignmentEligibility,
  { eligible: false, reason: "already_assigned" },
);
await api(`/orders/${assignableOrder.id}/discount`, {
  method: "PATCH",
  body: { discountPercent: 10 },
  expected: [409],
});
assert.equal(
  (await api("/orders")).items.find((order) => order.id === assignableOrder.id).total,
  originalOrderSnapshot.total,
);
await api(`/orders/${assignableOrder.id}/tab-assignment`, {
  method: "POST",
  headers: { "Idempotency-Key": assignmentKey },
  body: { newTab: { label: `Divergente-${runId}` } },
  expected: [409],
});
const assignmentEffects = await database.query(
  `SELECT
    (SELECT COUNT(*)::int FROM order_tab_assignments WHERE order_id = $1) AS assignments,
    (SELECT COUNT(*)::int FROM finance_entries WHERE order_id = $1) AS finance_entries,
    (SELECT COUNT(*)::int FROM print_jobs WHERE order_id = $1) AS print_jobs`,
  [assignableOrder.id],
);
assert.deepEqual(assignmentEffects.rows[0], { assignments: 1, finance_entries: 0, print_jobs: 1 });
assert.equal(
  Number((await database.query("SELECT COUNT(*) FROM stock_movements")).rows[0].count),
  stockMovementsBeforeAssignment,
);
const assignedReprint = await api(`/orders/${assignableOrder.id}/reprint`, {
  method: "POST",
  body: {},
});
assert.equal(assignedReprint.printJob.content, originalJobs.rows[0].content);
assert.equal(assignedReprint.printJob.metadata.sourceJobId, originalJobs.rows[0].id);
const persistedReprint = await database.query("SELECT * FROM print_jobs WHERE id = $1", [
  assignedReprint.printJob.id,
]);
assert.equal(persistedReprint.rows[0].content, originalJobs.rows[0].content);

const missingLabel = `Sem-órfã-${runId}`;
await api(`/orders/missing-${runId}/tab-assignment`, {
  method: "POST",
  headers: { "Idempotency-Key": `missing-assignment-${runId}` },
  body: { newTab: { label: missingLabel } },
  expected: [404],
});
assert.equal(
  (await api("/tabs?status=open")).items.some((item) => item.label === missingLabel),
  false,
);

async function expectBlockedAssignment(orderId, reason, label) {
  const beforeTabs = (await api("/tabs?status=open")).items.filter(
    (item) => item.label === label,
  ).length;
  const blocked = await api(`/orders/${orderId}/tab-assignment`, {
    method: "POST",
    headers: { "Idempotency-Key": `blocked-${orderId}-${runId}` },
    body: { newTab: { label } },
    expected: [409],
  });
  if (reason) assert.equal(blocked.reason, reason);
  assert.equal(
    (await api("/tabs?status=open")).items.filter((item) => item.label === label).length,
    beforeTabs,
  );
  assert.equal(
    Number(
      (
        await database.query("SELECT COUNT(*) FROM order_tab_assignments WHERE order_id = $1", [
          orderId,
        ])
      ).rows[0].count,
    ),
    0,
  );
}

for (const [status, reason] of [
  ["received", "status_not_eligible"],
  ["completed", "status_not_eligible"],
  ["cancelled", "status_not_eligible"],
]) {
  const orderId = `blocked-${status}-${runId}`;
  await database.query(
    `INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, payment_method, total, items)
     VALUES ($1, 'counter', $2, 'Bloqueado', 'local', 'cash', 0, '[]'::jsonb)`,
    [orderId, status],
  );
  await expectBlockedAssignment(orderId, reason, `Bloqueio-${status}-${runId}`);
}

const appPaidOrderId = `blocked-app-paid-${runId}`;
await database.query(
  `INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, payment_method, total, items)
   VALUES ($1, 'counter', 'confirmed', 'Bloqueado', 'local', 'app_paid', 0, '[]'::jsonb)`,
  [appPaidOrderId],
);
await expectBlockedAssignment(appPaidOrderId, "app_paid", `Bloqueio-app-${runId}`);

const integratedOrderId = `blocked-integrated-${runId}`;
await database.query(
  `INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, payment_method, total, items)
   VALUES ($1, 'counter', 'confirmed', 'Bloqueado', 'local', 'cash', 0, '[]'::jsonb)`,
  [integratedOrderId],
);
await database.query(
  `INSERT INTO channel_mappings (id, order_id, channel, merchant_id, external_id, sync_status)
   VALUES ($1,$2,'ifood','smoke',$3,'synchronized')`,
  [`mapping-${runId}`, integratedOrderId, `external-${runId}`],
);
await expectBlockedAssignment(integratedOrderId, "integrated_order", `Bloqueio-integrado-${runId}`);

const financedOrderId = `blocked-finance-${runId}`;
await database.query(
  `INSERT INTO orders (id, source, status, customer_name, fulfillment_mode, payment_method, total, items)
   VALUES ($1, 'counter', 'confirmed', 'Bloqueado', 'local', 'cash', 10, '[]'::jsonb)`,
  [financedOrderId],
);
await database.query(
  `INSERT INTO finance_entries (id, order_id, type, amount, payment_method, source, label, occurred_at)
   VALUES ($1,$2,'sale',10,'cash','counter','Venda bloqueante',NOW())`,
  [`finance-${runId}`, financedOrderId],
);
await expectBlockedAssignment(
  financedOrderId,
  "finance_already_recorded",
  `Bloqueio-financeiro-${runId}`,
);

const duplicateTarget = await api("/tabs", {
  method: "POST",
  body: { label: `Duplicada-${runId}` },
  expected: [201],
});
const duplicateLabelOrder = await api("/orders", {
  method: "POST",
  headers: { "Idempotency-Key": `duplicate-label-order-${runId}` },
  body: { fulfillmentMode: "local", items: [{ sku: smokeBatataSku, quantity: 1 }] },
  expected: [201],
});
await expectBlockedAssignment(duplicateLabelOrder.id, null, duplicateTarget.label);

const newTabOrder = await api("/orders", {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-new-tab-order-${runId}` },
  body: { fulfillmentMode: "local", items: [{ sku: smokeBatataSku, quantity: 1 }] },
  expected: [201],
});
const newTabKey = `smoke-new-tab-assignment-${runId}`;
const newTabAssignment = await api(`/orders/${newTabOrder.id}/tab-assignment`, {
  method: "POST",
  headers: { "Idempotency-Key": newTabKey },
  body: { newTab: { kind: "table", label: `Nova-mesa-${runId}`, customerName: "Ana" } },
  expected: [201],
});
const newTabReplay = await api(`/orders/${newTabOrder.id}/tab-assignment`, {
  method: "POST",
  headers: { "Idempotency-Key": newTabKey },
  body: { newTab: { kind: "table", label: `Nova-mesa-${runId}`, customerName: "Ana" } },
});
assert.equal(newTabReplay.repeated, true);
assert.equal(newTabReplay.assignment.id, newTabAssignment.assignment.id);
assert.equal(newTabReplay.tab.rounds.length, 1);

const raceOrder = await api("/orders", {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-assignment-race-order-${runId}` },
  body: { fulfillmentMode: "local", items: [{ sku: smokeBatataSku, quantity: 1 }] },
  expected: [201],
});
const raceTargets = await Promise.all(
  ["A", "B"].map((suffix) =>
    api("/tabs", {
      method: "POST",
      body: { label: `Vínculo-corrida-${suffix}-${runId}` },
      expected: [201],
    }),
  ),
);
const assignmentRace = await Promise.all(
  raceTargets.map(async (candidate, index) => {
    const response = await fetch(`${apiBase}/orders/${raceOrder.id}/tab-assignment`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "content-type": "application/json",
        "Idempotency-Key": `assignment-race-${index}-${runId}`,
      },
      body: JSON.stringify({ tabId: candidate.id }),
    });
    return response.status;
  }),
);
assert.deepEqual(assignmentRace.sort(), [201, 409]);
assert.equal(
  Number(
    (
      await database.query("SELECT COUNT(*) FROM order_tab_assignments WHERE order_id = $1", [
        raceOrder.id,
      ])
    ).rows[0].count,
  ),
  1,
);

const tab = await api("/tabs", {
  method: "POST",
  body: { kind: "table", label: `Mesa-${runId}`, customerName: "Cliente local" },
  expected: [201],
});
const tabRoundKey = `smoke-tab-round-${runId}`;
const tabRound = await api(`/tabs/${tab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": tabRoundKey },
  body: { items: [{ sku: "x-simples", name: "X-SIMPLES", quantity: 1, price: 24 }] },
  expected: [201],
});
assert.equal(tabRound.tabId, tab.id);
assert.equal(tabRound.roundNumber, 1);
assert.equal(
  (await api("/inventory")).balances.find((item) => item.category === "xis").quantity,
  initialXis + 4,
);
await api(`/tabs/${tab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-stock-insufficient-${runId}` },
  body: { items: [{ sku: "x-simples", name: "X-SIMPLES", quantity: initialXis + 5, price: 24 }] },
  expected: [409],
});
await api(`/orders/${tabRound.id}/status`, {
  method: "PATCH",
  body: { status: "cancelled" },
  expected: [409],
});
assert.equal(
  (
    await api(`/tabs/${tab.id}/rounds`, {
      method: "POST",
      headers: { "Idempotency-Key": tabRoundKey },
      body: { items: [{ sku: "x-simples", name: "X-SIMPLES", quantity: 1, price: 24 }] },
      expected: [201],
    })
  ).id,
  tabRound.id,
);
const tabView = await api(`/tabs/${tab.id}`);
assert.equal(tabView.rounds.length, 1);
assert.equal(tabView.total, 24);
const cancellationKey = `smoke-tab-cancel-${runId}`;
const cancellation = await api(`/tabs/${tab.id}/rounds/${tabRound.id}/cancellations`, {
  method: "POST",
  headers: { "Idempotency-Key": cancellationKey },
  body: { items: [{ itemId: tabRound.items[0].id, quantity: 1 }], reason: "Smoke corretivo" },
  expected: [201],
});
assert.equal(cancellation.roundKind, "cancellation");
assert.equal(cancellation.reversesOrderId, tabRound.id);
assert.equal(cancellation.total, -24);
assert.equal(
  (
    await api(`/tabs/${tab.id}/rounds/${tabRound.id}/cancellations`, {
      method: "POST",
      headers: { "Idempotency-Key": cancellationKey },
      body: { items: [{ itemId: tabRound.items[0].id, quantity: 1 }], reason: "Smoke corretivo" },
      expected: [201],
    })
  ).id,
  cancellation.id,
);
const cancelledTab = await api(`/tabs/${tab.id}`);
assert.equal(cancelledTab.total, 0);
assert.equal(cancelledTab.rounds[0].items[0].quantity, 1);
assert.equal(
  (await api("/inventory")).balances.find((item) => item.category === "xis").quantity,
  initialXis + 5,
);
await advanceAndClose(tab.id);

const directCancellationTab = await api("/tabs", {
  method: "POST",
  body: { label: `Direto-${runId}` },
  expected: [201],
});
const directCancellationRound = await api(`/tabs/${directCancellationTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-direct-round-${runId}` },
  body: { items: [{ sku: "refrigerante-lata", quantity: 1 }] },
  expected: [201],
});
assert.equal(directCancellationRound.status, "ready");
const directCancellation = await api(
  `/tabs/${directCancellationTab.id}/rounds/${directCancellationRound.id}/cancellations`,
  {
    method: "POST",
    headers: { "Idempotency-Key": `smoke-direct-cancel-${runId}` },
    body: {
      items: [{ itemId: directCancellationRound.items[0].id, quantity: 1 }],
      reason: "Cancelar entrega direta",
    },
    expected: [201],
  },
);
assert.equal(directCancellation.status, "ready");
assert.equal(directCancellation.items[0].preparationMode, "direct_handoff");
assert.equal(
  (await api("/kitchen/queue")).items.find((order) => order.id === directCancellation.id)?.status,
  "ready",
);
await advanceAndClose(directCancellationTab.id);

const preparedTab = await api("/tabs", {
  method: "POST",
  body: { label: `Preparo-${runId}` },
  expected: [201],
});
const preparedRound = await api(`/tabs/${preparedTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-prepared-round-${runId}` },
  body: { items: [{ sku: "x-simples", name: "X-SIMPLES", quantity: 1, price: 24 }] },
  expected: [201],
});
await api(`/orders/${preparedRound.id}/status`, {
  method: "PATCH",
  body: { status: "in_preparation" },
});
await api(`/tabs/${preparedTab.id}/rounds/${preparedRound.id}/cancellations`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-prepared-cancel-${runId}` },
  body: { items: [{ itemId: preparedRound.items[0].id, quantity: 1 }], reason: "Após preparo" },
  expected: [201],
});
assert.equal(
  (await api("/inventory")).balances.find((item) => item.category === "xis").quantity,
  initialXis + 4,
);
await api("/inventory/xis/adjustments", {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-stock-restore-${runId}` },
  body: { delta: 1, reason: "Reposição do smoke" },
  expected: [201],
});
await advanceAndClose(preparedTab.id);

const dogBalance = (await api("/inventory")).balances.find(
  (item) => item.category === "dog",
).quantity;
if (dogBalance !== 1) {
  await api("/inventory/dog/adjustments", {
    method: "POST",
    headers: { "Idempotency-Key": `smoke-dog-one-${runId}` },
    body: { delta: 1 - dogBalance, reason: "Preparar concorrência do smoke" },
    expected: [201],
  });
}
const concurrentTabs = await Promise.all([
  api("/tabs", { method: "POST", body: { label: `Concorrente-A-${runId}` }, expected: [201] }),
  api("/tabs", { method: "POST", body: { label: `Concorrente-B-${runId}` }, expected: [201] }),
]);
const concurrentRounds = await Promise.all(
  concurrentTabs.map(async (candidate, index) => {
    const response = await fetch(`${apiBase}/tabs/${candidate.id}/rounds`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "content-type": "application/json",
        "Idempotency-Key": `smoke-concurrent-${index}-${runId}`,
      },
      body: JSON.stringify({
        items: [{ sku: "dog-tradicional", name: "DOG TRADICIONAL", quantity: 1, price: 21 }],
      }),
    });
    return { status: response.status, body: await response.json() };
  }),
);
assert.deepEqual(concurrentRounds.map((result) => result.status).sort(), [201, 409]);
assert.equal(
  (await api("/inventory")).balances.find((item) => item.category === "dog").quantity,
  0,
);
const concurrentWinner = concurrentRounds.find((result) => result.status === 201).body;
await api(`/tabs/${concurrentWinner.tabId}/rounds/${concurrentWinner.id}/cancellations`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-concurrent-cancel-${runId}` },
  body: {
    items: [{ itemId: concurrentWinner.items[0].id, quantity: 1 }],
    reason: "Limpeza da concorrência",
  },
  expected: [201],
});
assert.equal(
  (await api("/inventory")).balances.find((item) => item.category === "dog").quantity,
  1,
);
await Promise.all(
  concurrentTabs.map((candidate) =>
    advanceAndClose(candidate.id),
  ),
);

const divergentKey = `smoke-divergent-stock-${runId}`;
await api("/inventory/hamburguer/adjustments", {
  method: "POST",
  headers: { "Idempotency-Key": divergentKey },
  body: { delta: 1, reason: "Payload original" },
  expected: [201],
});
await api("/inventory/dog/adjustments", {
  method: "POST",
  headers: { "Idempotency-Key": divergentKey },
  body: { delta: 1, reason: "Payload divergente" },
  expected: [409],
});

const racingKey = `smoke-racing-stock-${runId}`;
const racingAdjustments = await Promise.all(
  ["dog", "hamburguer"].map(async (category) => {
    const response = await fetch(`${apiBase}/inventory/${category}/adjustments`, {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json", "Idempotency-Key": racingKey },
      body: JSON.stringify({ delta: 1, reason: `Corrida ${category}` }),
    });
    return { category, status: response.status };
  }),
);
assert.deepEqual(racingAdjustments.map((result) => result.status).sort(), [201, 409]);
const racingWinner = racingAdjustments.find((result) => result.status === 201).category;
await api(`/inventory/${racingWinner}/adjustments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-racing-cleanup-${runId}` },
  body: { delta: -1, reason: "Limpeza da corrida idempotente" },
  expected: [201],
});

const beforeRollback = await api("/inventory");
for (const category of ["dog", "xis"]) {
  const balance = beforeRollback.balances.find((item) => item.category === category).quantity;
  if (balance !== 1) {
    await api(`/inventory/${category}/adjustments`, {
      method: "POST",
      headers: { "Idempotency-Key": `smoke-rollback-balance-${category}-${runId}` },
      body: { delta: 1 - balance, reason: "Preparar rollback multcategoria" },
      expected: [201],
    });
  }
}
const rollbackTab = await api("/tabs", {
  method: "POST",
  body: { label: `Rollback-${runId}` },
  expected: [201],
});
await api(`/tabs/${rollbackTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-rollback-round-${runId}` },
  body: {
    items: [
      { sku: "dog-tradicional", name: "DOG TRADICIONAL", quantity: 1, price: 21 },
      { sku: "x-simples", name: "X-SIMPLES", quantity: 2, price: 24 },
    ],
  },
  expected: [409],
});
const afterRollback = await api("/inventory");
assert.equal(afterRollback.balances.find((item) => item.category === "dog").quantity, 1);
assert.equal(afterRollback.balances.find((item) => item.category === "xis").quantity, 1);
await advanceAndClose(rollbackTab.id);

const initialShifts = (await api("/cash-shifts")).items;
const previousOpenShift = initialShifts.find((shift) => shift.status === "open");
if (previousOpenShift) {
  await api(`/cash-shifts/${previousOpenShift.id}/close`, {
    method: "POST",
    body: { declaredAmount: previousOpenShift.expectedAmount },
  });
}

const noShiftTab = await api("/tabs", {
  method: "POST",
  body: { label: `Sem-turno-${runId}` },
  expected: [201],
});
const noShiftRound = await api(`/tabs/${noShiftTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-no-shift-round-${runId}` },
  body: {
    items: [
      {
        sku: `smoke-no-shift-${runId}`,
        name: "Consumo sem turno",
        quantity: 1,
        price: 5,
        preparationMode: "direct_handoff",
      },
    ],
  },
  expected: [201],
});
await api(`/tabs/${noShiftTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-no-shift-payment-${runId}` },
  body: { paymentMethod: "pix", amountCents: 500 },
  expected: [409],
});
assert.equal((await api(`/tabs/${noShiftTab.id}`)).payments.length, 0);
await api(`/tabs/${noShiftTab.id}/rounds/${noShiftRound.id}/cancellations`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-no-shift-cancel-${runId}` },
  body: {
    items: [{ itemId: noShiftRound.items[0].id, quantity: 1 }],
    reason: "Limpeza do smoke sem turno",
  },
  expected: [201],
});
await advanceAndClose(noShiftTab.id);

const historicalShift = await api("/cash-shifts/open", {
  method: "POST",
  body: { openingAmount: 0 },
  expected: [201],
});
const crossShiftTab = await api("/tabs", {
  method: "POST",
  body: { label: `Entre-turnos-${runId}` },
  expected: [201],
});
await api(`/tabs/${crossShiftTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cross-shift-round-${runId}` },
  body: {
    items: [
      {
        sku: `smoke-cross-shift-${runId}`,
        name: "Consumo entre turnos",
        quantity: 1,
        price: 5,
        preparationMode: "direct_handoff",
      },
    ],
  },
  expected: [201],
});
const historicalPayment = await api(`/tabs/${crossShiftTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cross-shift-payment-${runId}` },
  body: { paymentMethod: "cash", amountCents: 500 },
  expected: [201],
});
await api(`/cash-shifts/${historicalShift.id}/close`, {
  method: "POST",
  body: { declaredAmount: 5 },
});

const shift = await api("/cash-shifts/open", {
  method: "POST",
  body: { openingAmount: 100 },
  expected: [201],
});
await api("/cash-shifts/open", {
  method: "POST",
  body: { openingAmount: 10 },
  expected: [409],
});
const crossShiftReversal = await api(
  `/tabs/${crossShiftTab.id}/payments/${historicalPayment.saved.id}/reversals`,
  {
    method: "POST",
    headers: { "Idempotency-Key": `smoke-cross-shift-reversal-${runId}` },
    body: {},
    expected: [201],
  },
);
assert.equal(crossShiftReversal.saved.shiftId, shift.id);
assert.equal(crossShiftReversal.saved.metadata.originalShiftId, historicalShift.id);
assert.equal(
  (await api(`/cash-shifts`)).items.find((item) => item.id === historicalShift.id).expectedAmount,
  5,
);
assert.equal(
  (await api(`/cash-shifts`)).items.find((item) => item.id === shift.id).expectedAmount,
  95,
);
await api(`/tabs/${crossShiftTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cross-shift-repay-${runId}` },
  body: { paymentMethod: "pix", amountCents: 500 },
  expected: [201],
});
await advanceAndClose(crossShiftTab.id);

const mixedTab = await api("/tabs", {
  method: "POST",
  body: { kind: "table", label: `Pagamento-${runId}` },
  expected: [201],
});
await api(`/tabs/${mixedTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-payment-round-${runId}` },
  body: {
    items: [
      {
        sku: `smoke-meal-${runId}`,
        name: "Consumo local",
        quantity: 1,
        price: 100,
        preparationMode: "direct_handoff",
      },
    ],
  },
  expected: [201],
});
const pixKey = `smoke-payment-pix-${runId}`;
const pixPayment = await api(`/tabs/${mixedTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": pixKey },
  body: { paymentMethod: "pix", amountCents: 3000 },
  expected: [201],
});
assert.equal(pixPayment.tab.balanceCents, 7000);
assert.equal(
  (
    await api(`/tabs/${mixedTab.id}/payments`, {
      method: "POST",
      headers: { "Idempotency-Key": pixKey },
      body: { paymentMethod: "pix", amountCents: 3000 },
    })
  ).saved.id,
  pixPayment.saved.id,
);
await api(`/tabs/${mixedTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": pixKey },
  body: { paymentMethod: "pix", amountCents: 4000 },
  expected: [409],
});
await api(`/tabs/${mixedTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-payment-excess-${runId}` },
  body: { paymentMethod: "debit_card", amountCents: 7001 },
  expected: [409],
});
await api(`/tabs/${mixedTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-payment-debit-${runId}` },
  body: { paymentMethod: "debit_card", amountCents: 7000 },
  expected: [201],
});
const paidMixedTab = await api(`/tabs/${mixedTab.id}`);
assert.equal(paidMixedTab.paidCents, 10000);
assert.equal(paidMixedTab.balanceCents, 0);
assert.equal(paidMixedTab.paymentMethod, "mixed");
assert.equal(
  (await advanceAndClose(mixedTab.id)).status,
  "closed",
);

const partialTab = await api("/tabs", {
  method: "POST",
  body: { label: `Parcial-${runId}` },
  expected: [201],
});
await api(`/tabs/${partialTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-partial-round-${runId}` },
  body: {
    items: [
      {
        sku: `smoke-partial-${runId}`,
        name: "Consumo parcial",
        quantity: 1,
        price: 100,
        preparationMode: "direct_handoff",
      },
    ],
  },
  expected: [201],
});
await api(`/tabs/${partialTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-partial-9999-${runId}` },
  body: { paymentMethod: "pix", amountCents: 9999 },
  expected: [201],
});
await advanceAndClose(partialTab.id, [409]);
await api(`/tabs/${partialTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-partial-cent-${runId}` },
  body: { paymentMethod: "pix", amountCents: 1 },
  expected: [201],
});
await advanceAndClose(partialTab.id);

const paymentRaceTab = await api("/tabs", {
  method: "POST",
  body: { label: `Corrida-pagamento-${runId}` },
  expected: [201],
});
await api(`/tabs/${paymentRaceTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-payment-race-round-${runId}` },
  body: {
    items: [
      {
        sku: `smoke-payment-race-${runId}`,
        name: "Consumo concorrente",
        quantity: 1,
        price: 10,
        preparationMode: "direct_handoff",
      },
    ],
  },
  expected: [201],
});
const paymentRace = await Promise.all(
  ["pix", "debit_card"].map(async (paymentMethod, index) => {
    const response = await fetch(`${apiBase}/tabs/${paymentRaceTab.id}/payments`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "content-type": "application/json",
        "Idempotency-Key": `smoke-payment-race-${index}-${runId}`,
      },
      body: JSON.stringify({ paymentMethod, amountCents: 1000 }),
    });
    return response.status;
  }),
);
assert.deepEqual(paymentRace.sort(), [201, 409]);
assert.equal((await api(`/tabs/${paymentRaceTab.id}`)).balanceCents, 0);
await advanceAndClose(paymentRaceTab.id);

const reversalTab = await api("/tabs", {
  method: "POST",
  body: { label: `Estorno-${runId}` },
  expected: [201],
});
await api(`/tabs/${reversalTab.id}/rounds`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-reversal-round-${runId}` },
  body: {
    items: [
      {
        sku: `smoke-reversal-${runId}`,
        name: "Consumo para estorno",
        quantity: 1,
        price: 20,
        preparationMode: "direct_handoff",
      },
    ],
  },
  expected: [201],
});
const cashPayment = await api(`/tabs/${reversalTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cash-payment-${runId}` },
  body: { paymentMethod: "cash", amountCents: 2000 },
  expected: [201],
});
await api(`/tabs/${reversalTab.id}/payments/${cashPayment.saved.id}/reversals`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cash-reversal-${runId}` },
  body: {},
  expected: [201],
});
assert.equal((await api(`/tabs/${reversalTab.id}`)).balanceCents, 2000);
await api(`/tabs/${reversalTab.id}/payments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-reversal-pix-${runId}` },
  body: { paymentMethod: "pix", amountCents: 2000 },
  expected: [201],
});
await advanceAndClose(reversalTab.id);
await api(`/cash-shifts/${shift.id}/adjustments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cash-reinforcement-${runId}` },
  body: { kind: "reinforcement", amount: 20, reason: "Troco" },
});
await api(`/cash-shifts/${shift.id}/adjustments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cash-withdrawal-${runId}` },
  body: { kind: "withdrawal", amount: 5, reason: "Pagamento" },
});

async function createOrder(source, fulfillmentMode, paymentMethod, extra = {}) {
  const key = `smoke-${runId}-${source}-${fulfillmentMode}`;
  const payload = {
    source,
    fulfillmentMode,
    paymentMethod,
    customerName: `Smoke ${source}`,
    items: [
      { sku: smokeBurgerSku, name: "Burger smoke", quantity: 2, price: 10 },
      { sku: smokeBatataSku, name: "Batata smoke", quantity: 1, price: 5 },
    ],
    ...extra,
  };
  const created = await api("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: payload,
    expected: [201],
  });
  const repeated = await api("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: payload,
    expected: [201],
  });
  assert.equal(repeated.id, created.id);
  assert.equal(created.status, "confirmed");
  assert.equal(created.items.length, 2);
  return created;
}

const orders = {
  counter: await createOrder("counter", "local", "cash", {
    discountPercent: 20,
    items: [
      { sku: smokeBurgerSku, name: "Burger smoke", quantity: 2, price: 10, discountPercent: 10 },
      { sku: smokeBatataSku, name: "Batata smoke", quantity: 1, price: 5 },
    ],
  }),
  whatsapp: await createOrder("whatsapp", "pickup", "pix"),
  delivery: await createOrder("whatsapp", "delivery", "pix", { deliveryAddress: "Rua Smoke, 123" }),
  olaclick: await createOrder("olaclick", "local", "credit_card"),
};
assert.equal(orders.counter.total, 18.4);
assert.equal(orders.counter.discountPercent, 20);
assert.equal(orders.counter.items[0].discountPercent, 10);

await api("/orders", {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-${runId}-ifood-generico` },
  body: {
    source: "ifood",
    fulfillmentMode: "delivery",
    deliveryAddress: "Rua",
    items: [{ sku: smokeBurgerSku, quantity: 1 }],
  },
  expected: [400],
});
await api("/orders", {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-${runId}-delivery-sem-endereco` },
  body: { source: "counter", fulfillmentMode: "delivery", items: [{ name: "Burger", price: 10 }] },
  expected: [400],
});
await api("/orders", {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-${runId}-desconto-invalido` },
  body: { source: "counter", discountPercent: 101, items: [{ name: "Burger", price: 10 }] },
  expected: [400],
});

const kitchenAfterCreate = (await api("/kitchen/queue")).items;
for (const order of Object.values(orders)) {
  assert.ok(
    kitchenAfterCreate.some((item) => item.id === order.id),
    `${order.source} não chegou à cozinha`,
  );
}

for (const status of ["in_preparation", "ready", "completed"]) {
  await api(`/orders/${orders.counter.id}/status`, { method: "PATCH", body: { status } });
}
await api(`/orders/${orders.counter.id}/status`, {
  method: "PATCH",
  body: { status: "completed" },
});
await api(`/orders/${orders.whatsapp.id}/status`, {
  method: "PATCH",
  headers: { "Idempotency-Key": `smoke-cancel-${orders.whatsapp.id}` },
  body: { status: "cancelled" },
});
const reprint = await api(`/orders/${orders.delivery.id}/reprint`, { method: "POST", body: {} });
assert.equal(reprint.ok, true);

const entries = (await api("/finance/entries")).items;
assert.equal(
  entries.filter((entry) => entry.orderId === orders.counter.id && entry.type === "sale").length,
  1,
);
assert.equal(
  entries.filter((entry) => entry.tabId === mixedTab.id && entry.type === "sale").length,
  2,
);
assert.equal(
  entries.filter((entry) => entry.tabId === reversalTab.id && entry.type === "cancellation").length,
  1,
);
const financeSummary = await api("/finance/summary");
assert.equal(
  financeSummary.grossSales,
  Math.round(
    entries.filter((entry) => entry.type === "sale").reduce((sum, entry) => sum + entry.amount, 0) *
      100,
  ) / 100,
);
const pixEntries = (await api("/finance/entries?paymentMethod=pix")).items;
assert.ok(pixEntries.length > 0);
assert.ok(pixEntries.every((entry) => entry.paymentMethod === "pix"));
const pixSummary = await api("/finance/summary?paymentMethod=pix");
assert.equal(
  pixSummary.grossSales,
  Math.round(
    pixEntries
      .filter((entry) => entry.type === "sale")
      .reduce((sum, entry) => sum + entry.amount, 0) * 100,
  ) / 100,
);
const withdrawalEntries = (await api("/finance/entries?type=cash_withdrawal&paymentMethod=cash"))
  .items;
assert.ok(withdrawalEntries.length > 0);
assert.ok(
  withdrawalEntries.every(
    (entry) => entry.type === "cash_withdrawal" && entry.paymentMethod === "cash",
  ),
);
assert.equal((await api("/finance/summary?type=cash_withdrawal&paymentMethod=cash")).grossSales, 0);
const currentShift = (await api("/cash-shifts")).items.find((item) => item.id === shift.id);
assert.equal(currentShift.expectedAmount, 128.4);

const closed = await api(`/cash-shifts/${shift.id}/close`, {
  method: "POST",
  body: { declaredAmount: 128.4 },
});
assert.equal(closed.status, "closed");
assert.equal(closed.differenceAmount, 0);
await api(`/cash-shifts/${shift.id}/close`, {
  method: "POST",
  body: { declaredAmount: 128.4 },
  expected: [409],
});
await api(`/cash-shifts/${shift.id}/adjustments`, {
  method: "POST",
  headers: { "Idempotency-Key": `smoke-cash-closed-${runId}` },
  body: { kind: "withdrawal", amount: 1, reason: "Inválido" },
  expected: [409],
});

const bridgeJob = `smoke-${runId}-bridge`;
const bridgePayload = {
  jobId: bridgeJob,
  orderId: orders.delivery.id,
  printerName: "cozinha-principal",
  reason: "smoke",
  content: "Pedido smoke\nHorário: 12:34\n2x Burger",
};
const printHeaders = printBridgeToken ? { authorization: `Bearer ${printBridgeToken}` } : {};
const firstPrint = await request(printBase, "/print-jobs", {
  method: "POST",
  body: bridgePayload,
  headers: printHeaders,
  expected: [201],
});
const repeatedPrint = await request(printBase, "/print-jobs", {
  method: "POST",
  body: bridgePayload,
  headers: printHeaders,
  expected: [200],
});
assert.equal(firstPrint.id, bridgeJob);
assert.equal(repeatedPrint.id, bridgeJob);
assert.equal(repeatedPrint.repeated, true);
await request(printBase, "/print-jobs", {
  method: "POST",
  body: { ...bridgePayload, content: "Conteúdo divergente para a mesma chave" },
  headers: printHeaders,
  expected: [409],
});

await database.end();

console.log(
  JSON.stringify(
    {
      ok: true,
      sources: Object.keys(orders),
      kitchenOrders: Object.values(orders).length,
      cashExpected: currentShift.expectedAmount,
      printJob: bridgeJob,
    },
    null,
    2,
  ),
);
