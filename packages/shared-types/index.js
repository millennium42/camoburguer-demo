export const ORDER_SOURCES = ["counter", "whatsapp", "ifood", "olaclick"];
export const FULFILLMENT_MODES = ["delivery", "pickup", "local"];
export const ORDER_STATUSES = [
  "received",
  "confirmed",
  "in_preparation",
  "ready",
  "completed",
  "cancelled"
];
export const PAYMENT_METHODS = [
  "cash",
  "pix",
  "credit_card",
  "debit_card",
  "app_paid",
  "mixed"
];
export const FINANCE_ENTRY_TYPES = [
  "sale",
  "cancellation",
  "opening",
  "cash_reinforcement",
  "cash_withdrawal",
  "closing_adjustment"
];
export const SHIFT_STATUSES = ["open", "closed"];

export function assertEnum(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label} inválido: ${value}`);
  }
  return value;
}

export function toMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
