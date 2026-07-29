export const sourceLabels: Record<string, string> = {
  counter: "🍔 Balcão",
  whatsapp: "💬 WhatsApp",
  ifood: "🔴 iFood",
  deliverymuch: "🟠 Delivery Much",
  olaclick: "🟢 OlaClick"
};

export const fulfillmentLabels: Record<string, string> = {
  delivery: "🛵 Delivery",
  pickup: "🛍️ Retirada",
  local: "🍽️ Local"
};

export const statusLabels: Record<string, string> = {
  received: "Recebido",
  confirmed: "Confirmado",
  in_preparation: "Em preparo",
  ready: "Pronto",
  completed: "Finalizado",
  cancelled: "Cancelado"
};

export const paymentLabels: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  credit_card: "Crédito",
  debit_card: "Débito",
  app_paid: "Pago no app",
  mixed: "Misto"
};

export function isIntegratedOrder(order: any) {
  return order?.hasChannelMapping === true
    || ["ifood", "deliverymuch"].includes(order?.source);
}

export function escapeHtml(value: string) {
  const htmlEscapes: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (character) => htmlEscapes[character]);
}

export function splitPreparationItems(items: any[] = []) {
  return items.reduce((groups, item) => {
    const group = item.preparationMode === "direct_handoff" ? "direct" : "kitchen";
    groups[group].push(item);
    return groups;
  }, { kitchen: [] as any[], direct: [] as any[] });
}

export function validDiscountPercent(value: any) {
  const discountPercent = Number(value ?? 0);
  return Number.isFinite(discountPercent) && discountPercent >= 0 && discountPercent <= 100
    ? discountPercent
    : 0;
}

export function calculateOrderPreviewTotal(items: any[] = [], discountPercent = 0) {
  const subtotal = items.reduce((total, item) => {
    const addonTotal = (item.addons || []).reduce((sum: number, addon: any) => sum + Number(addon.price || 0), 0);
    return total + (Number(item.price || 0) + addonTotal) * Number(item.quantity || 0)
      * (1 - validDiscountPercent(item.discountPercent) / 100);
  }, 0);
  return Math.round(subtotal * (1 - validDiscountPercent(discountPercent) / 100) * 100) / 100;
}

export function nextOrderAttempt(previous: any, payload: any, makeKey = () => crypto.randomUUID()) {
  const normalized = JSON.stringify(payload);
  if (previous && previous.payload === normalized) return previous;
  return { key: makeKey(), payload: normalized };
}
