import { randomUUID } from "node:crypto";

const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost", "api", "host.docker.internal"]);
const STEP_NAMES = [
  "health",
  "login",
  "catalog",
  "inventory",
  "cash_shift",
  "order",
  "transitions",
  "adjustment",
  "verify_order",
  "verify_finance",
];

export function assertSafeSimulationBaseUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new Error("API_BASE_URL inválida");
  }
  if (!["http:", "https:"].includes(url.protocol) || !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error("O simulador aceita somente API local ou efêmera explicitamente permitida");
  }
  return url.toString().replace(/\/+$/, "");
}

function parseCookie(response) {
  const values = response.headers.getSetCookie?.() || [response.headers.get("set-cookie") || ""];
  return values
    .map((value) => value.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

function validatePath(path) {
  if (/\/(?:undefined|null)(?:\/|$)/.test(path)) throw new Error(`Rota inválida: ${path}`);
}

export function createSimulationClient({
  baseUrl,
  username,
  password,
  timeoutMs = 5_000,
  fetchImpl = fetch,
}) {
  const base = assertSafeSimulationBaseUrl(baseUrl);
  let cookie = "";
  let csrfToken = "";

  async function request(stage, path, { method = "GET", body, headers = {}, auth = true } = {}) {
    validatePath(path);
    let response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        method,
        headers: {
          accept: "application/json",
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...(auth && cookie ? { cookie } : {}),
          ...(auth && method !== "GET" && method !== "HEAD" && csrfToken
            ? { "x-csrf-token": csrfToken }
            : {}),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      throw new Error(`${stage}: falha de rede ou timeout em ${method} ${path}`, { cause });
    }
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`${stage}: resposta não JSON em ${method} ${path}`);
    }
    if (!response.ok) {
      const error = new Error(`${stage}: HTTP ${response.status} em ${method} ${path}`);
      error.statusCode = response.status;
      error.payload = payload;
      throw error;
    }
    return { response, payload };
  }

  async function login() {
    if (!username || !password)
      throw new Error("Credenciais demo são obrigatórias por configuração");
    const { response, payload } = await request("login", "/auth/login", {
      method: "POST",
      auth: false,
      body: { username, password },
    });
    cookie = parseCookie(response);
    csrfToken = String(payload?.csrfToken || "");
    if (!cookie || !csrfToken) throw new Error("login: resposta não contém cookie e CSRF");
    return payload;
  }

  return { request, login };
}

function mark(summary, name, status, detail = null) {
  summary.steps[name] = { status, ...(detail ? { detail } : {}) };
}

export async function runSimulation(options = {}) {
  const summary = {
    ok: false,
    steps: Object.fromEntries(STEP_NAMES.map((name) => [name, { status: "pending" }])),
  };
  const client = createSimulationClient(options);
  const execute = async (name, work) => {
    try {
      const result = await work();
      mark(summary, name, "completed");
      return result;
    } catch (error) {
      mark(summary, name, "failed", error.message);
      let blocked = false;
      for (const step of STEP_NAMES) {
        if (step === name) blocked = true;
        else if (blocked && summary.steps[step].status === "pending")
          mark(summary, step, "skipped");
      }
      error.summary = summary;
      throw error;
    }
  };

  await execute("health", async () => {
    const { payload } = await client.request("health", "/health", { auth: false });
    if (payload?.ok !== true) throw new Error("health: corpo inesperado");
  });
  await execute("login", () => client.login());
  const catalogItems = await execute("catalog", async () => {
    const { payload } = await client.request("catalog", "/catalog");
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (!items.length) throw new Error("catalog: catálogo vazio");
    return items;
  });
  const catalog = await execute("inventory", async () => {
    const { payload } = await client.request("inventory", "/inventory");
    const quantities = Object.fromEntries(
      (payload?.balances || []).map((balance) => [balance.category, Number(balance.quantity)]),
    );
    const selected = catalogItems.find(
      (item) =>
        item.available !== false &&
        item.archivedAt == null &&
        (!item.stockCategory || quantities[item.stockCategory] > 0),
    );
    if (!selected?.sku || !Number.isFinite(Number(selected.price))) {
      throw new Error("inventory: nenhum SKU disponível com estoque");
    }
    return selected;
  });
  const shift = await execute("cash_shift", async () => {
    const { payload } = await client.request("cash_shift", "/cash-shifts");
    const open = payload?.items?.find((item) => item.status === "open");
    if (open?.id) return open;
    try {
      const opened = await client.request("cash_shift", "/cash-shifts/open", {
        method: "POST",
        body: { openingAmount: 120 },
      });
      if (!opened.payload?.id) throw new Error("cash_shift: resposta sem id");
      return opened.payload;
    } catch (error) {
      if (error.statusCode !== 409) throw error;
      const retried = await client.request("cash_shift", "/cash-shifts");
      const concurrent = retried.payload?.items?.find((item) => item.status === "open");
      if (!concurrent?.id) throw error;
      return concurrent;
    }
  });
  const orderKey = `sim-order-${randomUUID()}`;
  let order = await execute("order", async () => {
    const { payload } = await client.request("order", "/orders", {
      method: "POST",
      headers: { "Idempotency-Key": orderKey },
      body: {
        source: "whatsapp",
        customerName: "Cliente Demo",
        fulfillmentMode: "pickup",
        paymentMethod: "pix",
        items: [{ sku: catalog.sku, quantity: 1 }],
      },
    });
    if (!payload?.id || !payload?.status) throw new Error("order: resposta sem id/status");
    return payload;
  });
  await execute("transitions", async () => {
    const transitions =
      order.status === "confirmed"
        ? ["in_preparation", "ready", "completed"]
        : order.status === "in_preparation"
          ? ["ready", "completed"]
          : order.status === "ready"
            ? ["completed"]
            : [];
    if (!transitions.length && order.status !== "completed") {
      throw new Error(`transitions: status inicial não suportado (${order.status})`);
    }
    for (const status of transitions) {
      const result = await client.request("transitions", `/orders/${order.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      if (result.payload?.status !== status)
        throw new Error(`transitions: status ${status} não confirmado`);
      order = result.payload;
    }
  });
  const adjustmentKey = `sim-adjustment-${randomUUID()}`;
  await execute("adjustment", async () => {
    const { payload } = await client.request("adjustment", `/cash-shifts/${shift.id}/adjustments`, {
      method: "POST",
      headers: { "Idempotency-Key": adjustmentKey },
      body: { kind: "withdrawal", amount: 1, reason: "Sangria demo simulada" },
    });
    if (payload?.entry?.type !== "cash_withdrawal")
      throw new Error("adjustment: efeito não confirmado");
  });
  await execute("verify_order", async () => {
    const { payload } = await client.request("verify_order", "/orders");
    const saved = payload?.items?.find((item) => item.id === order.id);
    if (saved?.status !== "completed") throw new Error("verify_order: pedido não concluído");
  });
  await execute("verify_finance", async () => {
    const { payload } = await client.request(
      "verify_finance",
      `/finance/entries?shiftId=${encodeURIComponent(shift.id)}`,
    );
    const entries = Array.isArray(payload?.items) ? payload.items : [];
    if (!entries.some((entry) => entry.type === "cash_withdrawal")) {
      throw new Error("verify_finance: sangria não encontrada");
    }
  });
  summary.ok = true;
  return summary;
}

export function printSimulationSummary(summary, output = console) {
  for (const [name, result] of Object.entries(summary.steps)) {
    output.log(`${name}: ${result.status}${result.detail ? ` - ${result.detail}` : ""}`);
  }
  output.log(summary.ok ? "Simulação concluída e verificada." : "Simulação falhou.");
}
