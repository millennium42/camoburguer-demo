import { randomUUID } from "node:crypto";
import { toMoney } from "../shared-types/index.js";

export function buildEntriesFromOrder({ order, previousStatus, nextStatus, shiftId = null }) {
  const now = new Date().toISOString();
  const paymentMethod =
    order.paymentMethod || (["ifood", "deliverymuch"].includes(order.source) ? "app_paid" : "cash");
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
        metadata: {
          customerName: order.customerName,
          externalPayments: order.metadata?.externalPayments || [],
        },
      },
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
        metadata: {
          customerName: order.customerName,
          externalPayments: order.metadata?.externalPayments || [],
        },
      },
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
    metadata: {},
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
    metadata: { reason },
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
    metadata: {
      tabLabel: tab.label,
      paymentKind: payment.kind,
      reversesPaymentId: payment.reversesPaymentId,
    },
  };
}

export const DEFAULT_BUSINESS_TIME_ZONE = "America/Sao_Paulo";

function zonedParts(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Timestamp financeiro inválido: ${value}`);
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function businessDate(value, timeZone = DEFAULT_BUSINESS_TIME_ZONE) {
  const parts = zonedParts(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function businessHour(value, timeZone = DEFAULT_BUSINESS_TIME_ZONE) {
  return zonedParts(value, timeZone).hour;
}

function assertOperationalDate(value, label) {
  if (value == null || value === "") return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const error = new Error(`${label} deve usar YYYY-MM-DD no calendário operacional`);
    error.statusCode = 400;
    throw error;
  }
  const [year, month, day] = value.split("-").map(Number);
  const verified = new Date(Date.UTC(year, month - 1, day));
  if (
    verified.getUTCFullYear() !== year ||
    verified.getUTCMonth() !== month - 1 ||
    verified.getUTCDate() !== day
  ) {
    const error = new Error(`${label} contém uma data inexistente`);
    error.statusCode = 400;
    throw error;
  }
}

export function filterEntries(
  entries,
  filters = {},
  { timeZone = DEFAULT_BUSINESS_TIME_ZONE } = {},
) {
  assertOperationalDate(filters.dateFrom, "dateFrom");
  assertOperationalDate(filters.dateTo, "dateTo");
  return entries.filter((entry) => {
    if (filters.shiftId && entry.shiftId !== filters.shiftId) return false;
    if (filters.source && entry.source !== filters.source) return false;
    if (filters.paymentMethod && entry.paymentMethod !== filters.paymentMethod) return false;
    if (filters.type && entry.type !== filters.type) return false;
    const operationalDate = businessDate(entry.occurredAt, timeZone);
    if (filters.dateFrom && operationalDate < filters.dateFrom) return false;
    if (filters.dateTo && operationalDate > filters.dateTo) return false;
    return true;
  });
}

export function summarizeFinance(entries, { timeZone = DEFAULT_BUSINESS_TIME_ZONE } = {}) {
  const sales = entries.filter((entry) => entry.type === "sale");
  const grossSales = sales.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const cancellations = entries
    .filter((entry) => entry.type === "cancellation")
    .reduce((sum, entry) => sum + Math.abs(Number(entry.amount)), 0);
  const totalOrders = new Set(sales.map((entry) => entry.orderId || entry.tabId).filter(Boolean))
    .size;
  const ticketAverage = totalOrders ? toMoney(grossSales / totalOrders) : 0;

  const salesBySource = {};
  const paymentsByMethod = {};
  const salesByHour = {};
  const entriesByType = {};

  for (const entry of entries) {
    entriesByType[entry.type] = toMoney((entriesByType[entry.type] || 0) + Number(entry.amount));
    if (entry.type === "sale") {
      salesBySource[entry.source] = toMoney(
        (salesBySource[entry.source] || 0) + Number(entry.amount),
      );
      const hourKey = businessHour(entry.occurredAt, timeZone);
      salesByHour[hourKey] = toMoney((salesByHour[hourKey] || 0) + Number(entry.amount));
    }
    if (["sale", "cancellation"].includes(entry.type)) {
      if (entry.metadata?.externalPayments?.length > 0) {
        for (const ext of entry.metadata.externalPayments) {
          const amt = entry.type === "sale" ? Number(ext.amount) : -Number(ext.amount);
          const m = ext.type === "online" ? "app_paid" : ext.method || "unattributed";
          paymentsByMethod[m] = toMoney((paymentsByMethod[m] || 0) + amt);
        }
      } else {
        const method = entry.paymentMethod || "unattributed";
        paymentsByMethod[method] = toMoney((paymentsByMethod[method] || 0) + Number(entry.amount));
      }
    }
  }

  const netSales = toMoney(grossSales - cancellations);
  const methodTotal = toMoney(
    Object.values(paymentsByMethod).reduce((sum, amount) => sum + Number(amount), 0),
  );
  return {
    grossSales: toMoney(grossSales),
    cancellations: toMoney(cancellations),
    netSales,
    totalOrders,
    ticketAverage,
    salesBySource,
    paymentsByMethod,
    salesByHour,
    entriesByType,
    businessTimeZone: timeZone,
    reconciliation: {
      methodTotal,
      difference: toMoney(methodTotal - netSales),
      balanced: methodTotal === netSales,
      unattributed: paymentsByMethod.unattributed || 0,
    },
  };
}
