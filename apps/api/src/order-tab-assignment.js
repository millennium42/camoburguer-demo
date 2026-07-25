const ELIGIBLE_STATUSES = new Set(["confirmed", "in_preparation", "ready"]);

function clean(value) {
  return String(value || "").trim();
}

export function normalizeTabAssignmentPayload(input) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const keys = Object.keys(body);
  const hasTabId = Object.hasOwn(body, "tabId");
  const hasNewTab = Object.hasOwn(body, "newTab");
  if (keys.some((key) => !["tabId", "newTab"].includes(key)) || hasTabId === hasNewTab) {
    throw new Error("Informe exclusivamente tabId ou newTab");
  }
  if (hasTabId) {
    const tabId = clean(body.tabId);
    if (!tabId) throw new Error("tabId é obrigatório");
    return { tabId };
  }

  const newTab = body.newTab && typeof body.newTab === "object" && !Array.isArray(body.newTab)
    ? body.newTab
    : {};
  if (Object.keys(newTab).some((key) => !["kind", "label", "customerName"].includes(key))) {
    throw new Error("newTab contém campo inválido");
  }
  const kind = clean(newTab.kind) || "tab";
  const label = clean(newTab.label);
  const customerName = clean(newTab.customerName) || null;
  if (!["tab", "table"].includes(kind)) throw new Error("Tipo de comanda inválido");
  if (!label) throw new Error("Identificador da comanda é obrigatório");
  return { newTab: { kind, label, customerName } };
}

export function tabAssignmentEligibility(order, {
  hasChannelMapping = false,
  hasFinanceEntry = false
} = {}) {
  let reason = null;
  if (!order) reason = "order_not_found";
  else if (order.tabId) reason = "already_assigned";
  else if (order.roundKind !== "production" || order.reversesOrderId) reason = "corrective_order";
  else if (order.fulfillmentMode !== "local") reason = "not_local";
  else if (hasChannelMapping) reason = "integrated_order";
  else if (order.paymentMethod === "app_paid") reason = "app_paid";
  else if (hasFinanceEntry) reason = "finance_already_recorded";
  else if (!ELIGIBLE_STATUSES.has(order.status)) reason = "status_not_eligible";
  return { eligible: reason == null, reason };
}

export function sameTabAssignment(assignment, orderId, normalizedPayload) {
  const canonicalJson = (value) => {
    if (Array.isArray(value)) return value.map(canonicalJson);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
    }
    return value;
  };
  return assignment.orderId === orderId
    && JSON.stringify(canonicalJson(assignment.normalizedPayload)) === JSON.stringify(canonicalJson(normalizedPayload));
}
