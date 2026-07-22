import { randomUUID } from "node:crypto";
import {
  FULFILLMENT_MODES,
  ORDER_SOURCES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  assertEnum,
  toMoney
} from "../shared-types/index.js";
import { ADD_ONS, CATALOG, CATALOG_CAPTURED_AT, CATALOG_SOURCE_URL } from "./catalog.js";
export { ADD_ONS, CATALOG, CATALOG_CAPTURED_AT, CATALOG_SOURCE_URL };

export function calculateStockRequirements(items = []) {
  const requirements = {};
  for (const item of items) {
    const category = Object.hasOwn(item, "stockCategory")
      ? item.stockCategory
      : CATALOG.find((candidate) => candidate.sku === item.sku)?.stockCategory;
    const quantity = Number(item.quantity || 0);
    if (category && !Number.isInteger(quantity)) throw new Error("Quantidade de item com estoque deve ser inteira");
    if (category) requirements[category] = (requirements[category] || 0) + quantity;
  }
  return requirements;
}

const ALLOWED_TRANSITIONS = {
  received: ["confirmed", "cancelled"],
  confirmed: ["in_preparation", "cancelled"],
  in_preparation: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: ["cancelled"],
  cancelled: []
};

function normalizeDiscountPercent(value, label) {
  const discountPercent = Number(value ?? 0);
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    throw new Error(`${label} inválido: informe um valor entre 0 e 100`);
  }
  return toMoney(discountPercent);
}

export function calculateOrderTotal(items = [], discountPercent = 0) {
  const subtotal = items.reduce((sum, item) => {
    const itemDiscount = normalizeDiscountPercent(item.discountPercent, "Desconto do item");
    const addonTotal = (item.addons || []).reduce(
      (total, addon) => total + Number(addon.quantity || 1) * Number(addon.price || 0),
      0
    );
    return sum + Number(item.quantity || 0) * (Number(item.price || 0) + addonTotal) * (1 - itemDiscount / 100);
  }, 0);
  return toMoney(
    subtotal * (1 - normalizeDiscountPercent(discountPercent, "Desconto do pedido") / 100)
  );
}

export function createOrder(input, {
  catalog = CATALOG,
  allowCustomItems = false,
  preserveItemSnapshots = false
} = {}) {
  const source = assertEnum(input.source || "counter", ORDER_SOURCES, "source");
  const fulfillmentMode = assertEnum(
    input.fulfillmentMode || "local",
    FULFILLMENT_MODES,
    "fulfillmentMode"
  );
  const paymentMethod = input.tabId && input.paymentMethod == null
    ? null
    : assertEnum(input.paymentMethod || "cash", PAYMENT_METHODS, "paymentMethod");
  const items = (input.items || []).map((item) => {
    const legacyCatalogItem = preserveItemSnapshots && item.sku
      ? CATALOG.find((candidate) => candidate.sku === item.sku)
      : null;
    const catalogItem = preserveItemSnapshots
      ? item
      : item.sku ? catalog.find((candidate) => candidate.sku === item.sku) : null;
    if (!catalogItem && !allowCustomItems && !preserveItemSnapshots) {
      throw new Error("Item não encontrado no cardápio");
    }
    if (!preserveItemSnapshots && catalogItem && !catalogItem.available) throw new Error("Item indisponível no cardápio");
    const addonSkus = (item.addons || []).map((addon) => String(addon.sku || ""));
    if (new Set(addonSkus).size !== addonSkus.length) throw new Error("Adicional duplicado");
    if (!preserveItemSnapshots && addonSkus.length && catalogItem && !catalogItem.allowsAddons) {
      throw new Error("Item não aceita adicionais");
    }
    const addons = preserveItemSnapshots ? (item.addons || []).map((addon) => {
      const name = String(addon.name || "").trim();
      const price = Number(addon.price || 0);
      const quantity = Number(addon.quantity || 1);
      if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Adicional inválido");
      }
      return { sku: addon.sku || null, name, price: toMoney(price), quantity };
    }) : addonSkus.map((sku) => {
      const addon = ADD_ONS.find((candidate) => candidate.sku === sku);
      if (!addon) throw new Error("Adicional inválido");
      return { ...addon, quantity: 1 };
    });
    const quantity = Number(item.quantity ?? 1);
    const price = Number(catalogItem?.price ?? item.price ?? 0);
    const discountPercent = normalizeDiscountPercent(item.discountPercent, "Desconto do item");
    const name = String(catalogItem?.name || item.name || "").trim();
    if (!name || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Item de pedido inválido");
    }
    if (!Number.isFinite(price) || price < 0) throw new Error("Preço de item inválido");
    const stockCategory = preserveItemSnapshots && !Object.hasOwn(item, "stockCategory")
      ? legacyCatalogItem?.stockCategory ?? null
      : catalogItem
      ? catalogItem.stockCategory ?? null
      : item.stockCategory ?? null;
    if (stockCategory != null && !["xis", "dog", "hamburguer"].includes(stockCategory)) {
      throw new Error("Categoria de estoque inválida");
    }
    const preparationMode = preserveItemSnapshots && !Object.hasOwn(item, "preparationMode")
      ? legacyCatalogItem?.preparationMode || "kitchen"
      : catalogItem?.preparationMode || item.preparationMode || "kitchen";
    if (!["kitchen", "direct_handoff"].includes(preparationMode)) {
      throw new Error("Modo de preparo inválido");
    }
    return {
      id: item.id || randomUUID(),
      reversesItemId: item.reversesItemId || null,
      sku: item.sku || null,
      name,
      category: preserveItemSnapshots
        ? item.category || legacyCatalogItem?.category || "custom"
        : catalogItem?.category || item.category || "custom",
      stockCategory,
      preparationMode,
      quantity,
      price: toMoney(price),
      addons,
      discountPercent,
      notes: item.notes || ""
    };
  });
  if (!items.length) throw new Error("O pedido deve ter ao menos um item");
  const discountPercent = normalizeDiscountPercent(input.discountPercent, "Desconto do pedido");

  const deliveryAddress = String(input.deliveryAddress || "").trim();
  if (fulfillmentMode === "delivery" && !deliveryAddress) {
    throw new Error("Endereço é obrigatório para delivery");
  }

  const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
  if (Number.isNaN(createdAt.getTime())) throw new Error("createdAt inválido");
  const now = createdAt.toISOString();
  return {
    id: input.id || randomUUID(),
    idempotencyKey: String(input.idempotencyKey || "").trim() || null,
    tabId: input.tabId || null,
    roundNumber: input.roundNumber == null ? null : Number(input.roundNumber),
    roundKind: input.roundKind || "production",
    reversesOrderId: input.reversesOrderId || null,
    source,
    status: "received",
    customerName: input.customerName || "Cliente",
    fulfillmentMode,
    deliveryAddress: fulfillmentMode === "delivery" ? deliveryAddress : null,
    promisedAt: input.promisedAt || null,
    notes: input.notes || "",
    paymentMethod,
    items,
    discountPercent,
    total: calculateOrderTotal(items, discountPercent),
    metadata: {
      ...(input.metadata || {}),
      priority: input.priority || "normal",
      channelLabel: input.channelLabel || source
    },
    createdAt: now,
    updatedAt: now
  };
}

export function createCancellationOrder(input) {
  if (!input.tabId || !input.reversesOrderId) throw new Error("Cancelamento exige comanda e rodada original");
  const order = createOrder(
    { ...input, roundKind: "cancellation" },
    { allowCustomItems: true, preserveItemSnapshots: true }
  );
  return { ...order, total: toMoney(-Math.abs(order.total)) };
}

export function transitionOrder(order, nextStatus) {
  assertEnum(nextStatus, ORDER_STATUSES, "status");
  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowed.includes(nextStatus) && order.status !== nextStatus) {
    throw new Error(`Transição inválida: ${order.status} -> ${nextStatus}`);
  }
  return {
    ...order,
    status: nextStatus,
    updatedAt: new Date().toISOString()
  };
}

export function requiresKitchenPreparation(items = []) {
  return items.some((item) => (item.preparationMode || "kitchen") === "kitchen");
}

export function confirmOrder(order) {
  const confirmed = transitionOrder(order, "confirmed");
  if (requiresKitchenPreparation(confirmed.items)) return confirmed;
  return {
    ...confirmed,
    status: "ready",
    updatedAt: new Date().toISOString()
  };
}

export function buildKitchenTicket(order) {
  const hasKitchen = requiresKitchenPreparation(order.items);
  const cancellationHeader = order.roundKind === "cancellation"
    ? [hasKitchen ? "*** CANCELAMENTO / RETIRAR ***" : "*** CANCELAMENTO / ENTREGA DIRETA ***"]
    : [];
  const header = [
    ...cancellationHeader,
    `Pedido ${order.id.slice(0, 8).toUpperCase()}`,
    ...(order.reversesOrderId ? [`Corrige pedido: ${order.reversesOrderId.slice(0, 8).toUpperCase()}`] : []),
    ...(order.tabId ? [`Comanda: ${order.metadata?.tabLabel || order.tabId}`, `Rodada: ${order.roundNumber}`] : []),
    `Horário: ${new Date(order.createdAt).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit"
    })}`,
    `Canal: ${order.source}`,
    `Cliente: ${order.customerName}`,
    `Entrega: ${order.fulfillmentMode}`,
    ...(order.deliveryAddress ? [`Endereço: ${order.deliveryAddress}`] : []),
    ...(order.paymentMethod ? [`Pagamento: ${order.paymentMethod}`] : [])
  ];
  const formatItem = (item) => {
    const notes = item.notes ? ` | obs: ${item.notes}` : "";
    const addons = (item.addons || []).map((addon) => `  + ${addon.name}`).join("\n");
    return `${item.quantity}x ${item.name}${notes}${addons ? `\n${addons}` : ""}`;
  };
  const kitchenItems = order.items.filter((item) => (item.preparationMode || "kitchen") === "kitchen");
  const directItems = order.items.filter((item) => item.preparationMode === "direct_handoff");
  const body = [
    ...(kitchenItems.length ? [order.roundKind === "cancellation" ? "RETIRAR DA COZINHA" : "PREPARO COZINHA", ...kitchenItems.map(formatItem)] : []),
    ...(directItems.length ? [order.roundKind === "cancellation" ? "CANCELAR ENTREGA DIRETA — NÃO RETIRAR DA COZINHA" : "ENTREGA DIRETA — NÃO PREPARAR", ...directItems.map(formatItem)] : [])
  ];
  const footer = order.notes ? [`Observações gerais: ${order.notes}`] : [];
  return [...header, "", ...body, "", ...footer].join("\n");
}

export function createCashShift(input) {
  const openingAmount = Number(input.openingAmount ?? 0);
  if (!Number.isFinite(openingAmount) || openingAmount < 0) {
    throw new Error("Valor de abertura inválido");
  }
  const now = new Date().toISOString();
  return {
    id: input.id || randomUUID(),
    status: "open",
    openingAmount: toMoney(openingAmount),
    expectedAmount: toMoney(openingAmount),
    declaredAmount: null,
    differenceAmount: null,
    notes: input.notes || "",
    openedAt: now,
    closedAt: null
  };
}

export function closeCashShift(shift, declaredAmount) {
  if (shift.status !== "open") throw new Error("O caixa precisa estar aberto para fechar");
  const declared = Number(declaredAmount ?? 0);
  if (!Number.isFinite(declared) || declared < 0) throw new Error("Valor declarado inválido");
  const normalizedDeclared = toMoney(declared);
  return {
    ...shift,
    status: "closed",
    declaredAmount: normalizedDeclared,
    differenceAmount: toMoney(normalizedDeclared - Number(shift.expectedAmount || 0)),
    closedAt: new Date().toISOString()
  };
}
