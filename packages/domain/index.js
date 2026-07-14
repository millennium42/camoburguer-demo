import { randomUUID } from "node:crypto";
import {
  FULFILLMENT_MODES,
  ORDER_SOURCES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  assertEnum,
  toMoney
} from "../shared-types/index.js";

export const DEMO_CATALOG = [
  { sku: "xis-salada", name: "Xis Salada", category: "xis", price: 27.9 },
  { sku: "hamburguer-artesanal", name: "Hambúrguer Artesanal", category: "burger", price: 31.9 },
  { sku: "batata-frita", name: "Batata Frita", category: "porcao", price: 16.9 },
  { sku: "refrigerante-lata", name: "Refrigerante Lata", category: "bebida", price: 6.5 }
];

const ALLOWED_TRANSITIONS = {
  received: ["confirmed", "cancelled"],
  confirmed: ["in_preparation", "cancelled"],
  in_preparation: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: ["cancelled"],
  cancelled: []
};

export function calculateOrderTotal(items = []) {
  return toMoney(
    items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.price || 0);
    }, 0)
  );
}

export function createOrder(input) {
  const source = assertEnum(input.source || "counter", ORDER_SOURCES, "source");
  const fulfillmentMode = assertEnum(
    input.fulfillmentMode || "local",
    FULFILLMENT_MODES,
    "fulfillmentMode"
  );
  const paymentMethod = assertEnum(
    input.paymentMethod || "cash",
    PAYMENT_METHODS,
    "paymentMethod"
  );
  const items = (input.items || []).map((item) => {
    const quantity = Number(item.quantity ?? 1);
    const price = Number(item.price ?? 0);
    if (!String(item.name || "").trim() || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Item de pedido inválido");
    }
    if (!Number.isFinite(price) || price < 0) throw new Error("Preço de item inválido");
    return {
      sku: item.sku || null,
      name: String(item.name).trim(),
      category: item.category || "custom",
      quantity,
      price: toMoney(price),
      notes: item.notes || ""
    };
  });
  if (!items.length) throw new Error("O pedido deve ter ao menos um item");

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
    source,
    status: "received",
    customerName: input.customerName || "Cliente",
    fulfillmentMode,
    deliveryAddress: fulfillmentMode === "delivery" ? deliveryAddress : null,
    promisedAt: input.promisedAt || null,
    notes: input.notes || "",
    paymentMethod,
    items,
    total: calculateOrderTotal(items),
    metadata: {
      priority: input.priority || "normal",
      channelLabel: input.channelLabel || source
    },
    createdAt: now,
    updatedAt: now
  };
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

export function buildKitchenTicket(order) {
  const header = [
    `Pedido ${order.id.slice(0, 8).toUpperCase()}`,
    `Horário: ${new Date(order.createdAt).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit"
    })}`,
    `Canal: ${order.source}`,
    `Cliente: ${order.customerName}`,
    `Entrega: ${order.fulfillmentMode}`,
    ...(order.deliveryAddress ? [`Endereço: ${order.deliveryAddress}`] : []),
    `Pagamento: ${order.paymentMethod}`
  ];
  const body = order.items.map((item) => {
    const notes = item.notes ? ` | obs: ${item.notes}` : "";
    return `${item.quantity}x ${item.name}${notes}`;
  });
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
