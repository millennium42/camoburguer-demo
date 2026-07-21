import { randomUUID } from "node:crypto";
import { toMoney } from "../shared-types/index.js";

export function buildEntriesFromOrder({ order, previousStatus, nextStatus, shiftId = null }) {
  const now = new Date().toISOString();
  const paymentMethod = order.paymentMethod || (["ifood", "deliverymuch"].includes(order.source) ? "app_paid" : "cash");
  if (previousStatus !== "completed" && nextStatus === "completed") {
    return [
      {
        id: randomUUID(),
        orderId: order.id,
        shiftId,
        type: "sale",
        amount: toMoney(order.total),
        paymentMethod,
        source: order.source,
        label: `Venda do pedido ${order.id.slice(0, 8)}`,
        occurredAt: now,
        metadata: { customerName: order.customerName }
      }
    ];
  }
  if (previousStatus === "completed" && nextStatus === "cancelled") {
    return [
      {
        id: randomUUID(),
        orderId: order.id,
        shiftId,
        type: "cancellation",
        amount: toMoney(-order.total),
        paymentMethod,
        source: order.source,
        label: `Cancelamento do pedido ${order.id.slice(0, 8)}`,
        occurredAt: now,
        metadata: { customerName: order.customerName }
      }
    ];
  }
  return [];
}

export function buildOpeningEntry(shift) {
  return {
    id: randomUUID(),
    orderId: null,
    shiftId: shift.id,
    type: "opening",
    amount: toMoney(shift.openingAmount),
    paymentMethod: "cash",
    source: "counter",
    label: `Abertura de caixa ${shift.id.slice(0, 8)}`,
    occurredAt: shift.openedAt,
    metadata: {}
  };
}

export function buildEntryFromAdjustment({ shift, kind, amount, reason = "" }) {
  if (shift.status !== "open") throw new Error("Movimentação exige caixa aberto");
  if (!["reinforcement", "withdrawal"].includes(kind)) throw new Error("Movimentação inválida");
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Valor da movimentação inválido");
  const normalizedAmount = toMoney(value);
  const isWithdrawal = kind === "withdrawal";
  return {
    id: randomUUID(),
    orderId: null,
    shiftId: shift.id,
    type: isWithdrawal ? "cash_withdrawal" : "cash_reinforcement",
    amount: isWithdrawal ? -normalizedAmount : normalizedAmount,
    paymentMethod: "cash",
    source: "counter",
    label: reason || (isWithdrawal ? "Sangria" : "Reforço"),
    occurredAt: new Date().toISOString(),
    metadata: { reason }
  };
}

export function buildEntryFromTabPayment({ payment, tab }) {
  const reversal = payment.kind === "reversal";
  return {
    id: randomUUID(),
    orderId: null,
    tabId: tab.id,
    paymentId: payment.id,
    shiftId: payment.shiftId,
    type: reversal ? "cancellation" : "sale",
    amount: toMoney(payment.amountCents / 100),
    paymentMethod: payment.paymentMethod,
    source: "counter",
    label: `${reversal ? "Estorno" : "Pagamento"} da ${tab.kind === "table" ? "mesa" : "comanda"} ${tab.label}`,
    occurredAt: payment.createdAt,
    metadata: { tabLabel: tab.label, paymentKind: payment.kind, reversesPaymentId: payment.reversesPaymentId }
  };
}

export function filterEntries(entries, filters = {}) {
  return entries.filter((entry) => {
    if (filters.shiftId && entry.shiftId !== filters.shiftId) return false;
    if (filters.source && entry.source !== filters.source) return false;
    if (filters.paymentMethod && entry.paymentMethod !== filters.paymentMethod) return false;
    if (filters.type && entry.type !== filters.type) return false;
    if (filters.dateFrom && entry.occurredAt.slice(0, 10) < filters.dateFrom) return false;
    if (filters.dateTo && entry.occurredAt.slice(0, 10) > filters.dateTo) return false;
    return true;
  });
}

export function summarizeFinance(entries) {
  const sales = entries.filter((entry) => entry.type === "sale");
  const grossSales = sales.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const cancellations = entries
    .filter((entry) => entry.type === "cancellation")
    .reduce((sum, entry) => sum + Math.abs(Number(entry.amount)), 0);
  const totalOrders = new Set(sales.map((entry) => entry.orderId || entry.tabId).filter(Boolean)).size;
  const ticketAverage = totalOrders ? toMoney(grossSales / totalOrders) : 0;

  const salesBySource = {};
  const paymentsByMethod = {};
  const salesByHour = {};
  const entriesByType = {};

  for (const entry of entries) {
    entriesByType[entry.type] = toMoney((entriesByType[entry.type] || 0) + Number(entry.amount));
    if (entry.type === "sale") {
      salesBySource[entry.source] = toMoney((salesBySource[entry.source] || 0) + Number(entry.amount));
      paymentsByMethod[entry.paymentMethod] = toMoney(
        (paymentsByMethod[entry.paymentMethod] || 0) + Number(entry.amount)
      );
      const hourKey = new Date(entry.occurredAt).getHours().toString().padStart(2, "0");
      salesByHour[hourKey] = toMoney((salesByHour[hourKey] || 0) + Number(entry.amount));
    }
  }

  return {
    grossSales: toMoney(grossSales),
    cancellations: toMoney(cancellations),
    netSales: toMoney(grossSales - cancellations),
    totalOrders,
    ticketAverage,
    salesBySource,
    paymentsByMethod,
    salesByHour,
    entriesByType
  };
}
