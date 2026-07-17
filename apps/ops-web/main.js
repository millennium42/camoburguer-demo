const state = {
  catalog: [],
  addOns: [],
  orderItems: [],
  orderAttempt: null,
  cancellationAttempt: null,
  tabs: [],
  activeTabId: null,
  orders: [],
  kitchen: [],
  financeSummary: null,
  financeEntries: [],
  shifts: []
};

const apiBase = typeof window === "undefined"
  ? ""
  : `${window.location.protocol}//${window.location.hostname}:3001`;

const sourceLabels = {
  counter: "Balcão",
  whatsapp: "WhatsApp",
  ifood: "iFood",
  olaclick: "OlaClick"
};

const fulfillmentLabels = {
  delivery: "Delivery",
  pickup: "Retirada",
  local: "Local"
};

const statusLabels = {
  received: "Recebido",
  confirmed: "Confirmado",
  in_preparation: "Em preparo",
  ready: "Pronto",
  completed: "Concluído",
  cancelled: "Cancelado"
};

const paymentLabels = {
  cash: "Dinheiro",
  pix: "Pix",
  credit_card: "Crédito",
  debit_card: "Débito",
  app_paid: "Pago no app",
  mixed: "Misto"
};

const financeTypeLabels = {
  sale: "Venda",
  cancellation: "Cancelamento",
  opening: "Abertura",
  cash_reinforcement: "Reforço",
  cash_withdrawal: "Sangria",
  closing_adjustment: "Diferença de fechamento"
};

const htmlEscapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const $ = (selector) => document.querySelector(selector);

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => htmlEscapes[character]);
}

export function addOrAccumulateItem(items, selected, quantity, notes = "", discountPercent = 0, addons = []) {
  const normalizedQuantity = Math.max(1, Math.trunc(Number(quantity) || 1));
  const normalizedNotes = String(notes).trim();
  const normalizedDiscount = validDiscountPercent(discountPercent);
  const addonKey = addons.map((addon) => addon.sku).sort().join(",");
  const existing = items.find(
    (item) => item.sku === selected.sku
      && String(item.notes || "").trim() === normalizedNotes
      && validDiscountPercent(item.discountPercent) === normalizedDiscount
      && (item.addons || []).map((addon) => addon.sku).sort().join(",") === addonKey
  );
  if (existing) existing.quantity += normalizedQuantity;
  else items.push({ ...selected, quantity: normalizedQuantity, addons, discountPercent: normalizedDiscount, notes: normalizedNotes });
  return items;
}

export function setItemDiscount(items, index, discountPercent) {
  const normalizedDiscount = Number(discountPercent);
  if (
    items[index]
    && Number.isFinite(normalizedDiscount)
    && normalizedDiscount >= 0
    && normalizedDiscount <= 100
  ) {
    items[index].discountPercent = normalizedDiscount;
  }
  return items;
}

function validDiscountPercent(value) {
  const discountPercent = Number(value ?? 0);
  return Number.isFinite(discountPercent) && discountPercent >= 0 && discountPercent <= 100
    ? discountPercent
    : 0;
}

export function calculateOrderPreviewTotal(items = [], discountPercent = 0) {
  const subtotal = items.reduce((total, item) => {
    const addonTotal = (item.addons || []).reduce((sum, addon) => sum + Number(addon.price || 0), 0);
    return total + (Number(item.price || 0) + addonTotal) * Number(item.quantity || 0)
      * (1 - validDiscountPercent(item.discountPercent) / 100);
  }, 0);
  return Math.round(subtotal * (1 - validDiscountPercent(discountPercent) / 100) * 100) / 100;
}

export function setItemQuantity(items, index, quantity) {
  const normalizedQuantity = Math.trunc(Number(quantity));
  if (items[index] && Number.isFinite(normalizedQuantity) && normalizedQuantity >= 1) {
    items[index].quantity = normalizedQuantity;
  }
  return items;
}

export function nextOrderAttempt(previous, payload, makeKey = () => crypto.randomUUID()) {
  const fingerprint = JSON.stringify(payload);
  return previous?.fingerprint === fingerprint
    ? previous
    : { key: makeKey(), fingerprint };
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function formatWhen(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Horário não informado"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function syncStamp(label) {
  $("#last-sync").textContent = `Atualizado: ${label}`;
}

function notify(message, tone = "success") {
  const feedback = $("#feedback");
  feedback.textContent = message;
  feedback.className = `feedback ${tone}`;
  feedback.hidden = false;
}

function renderCatalog() {
  const select = $("#catalog-select");
  const categories = Object.groupBy(state.catalog, (item) => item.category);
  select.innerHTML = Object.entries(categories)
    .map(([category, items]) => `<optgroup label="${escapeHtml(category)}">${items
      .map((item) => `<option value="${escapeHtml(item.sku)}" ${item.available ? "" : "disabled"}>${escapeHtml(item.name)} · ${item.available ? money(item.price) : "Esgotado"}</option>`)
      .join("")}</optgroup>`)
    .join("");
  $("#add-item").disabled = !state.catalog.some((item) => item.available);
  renderAddOns();
}

function renderAddOns() {
  const selected = state.catalog.find((item) => item.sku === $("#catalog-select").value);
  const field = $("#catalog-addons-field");
  field.hidden = !selected?.allowsAddons;
  $("#catalog-addons").innerHTML = selected?.allowsAddons
    ? state.addOns.map((addon) => `<label class="check-option"><input type="checkbox" name="catalog-addon" value="${escapeHtml(addon.sku)}" /> ${escapeHtml(addon.name)} <span>${money(addon.price)}</span></label>`).join("")
    : "";
}

function renderOrderItems() {
  const list = $("#order-items");
  if (!state.orderItems.length) {
    list.innerHTML = '<li class="empty-state">Nenhum item adicionado.</li>';
    $("#order-total").textContent = money(0);
    return;
  }

  list.innerHTML = state.orderItems
    .map((item, index) => `
      <li class="order-card cart-row">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <div class="mini-meta">
            <span>${money(item.price)} cada</span>
            <span>${escapeHtml(item.notes || "Sem observação")}</span>
          </div>
          ${(item.addons || []).length ? `<div class="addon-list">${item.addons.map((addon) => `+ ${escapeHtml(addon.name)} (${money(addon.price)})`).join(" · ")}</div>` : ""}
        </div>
        <div class="quantity-control">
          <button type="button" data-decrease-item="${index}" aria-label="Diminuir ${escapeHtml(item.name)}">−</button>
          <input type="number" min="1" step="1" value="${item.quantity}" data-item-quantity="${index}" aria-label="Quantidade de ${escapeHtml(item.name)}" />
          <button type="button" data-increase-item="${index}" aria-label="Aumentar ${escapeHtml(item.name)}">+</button>
        </div>
        <label class="discount-control">Desconto (%)
          <input type="number" min="0" max="100" step="0.01" value="${item.discountPercent || 0}" data-item-discount="${index}" inputmode="decimal" aria-label="Desconto de ${escapeHtml(item.name)} em porcentagem" />
        </label>
        <strong>${money(calculateOrderPreviewTotal([item]))}</strong>
        <button type="button" data-remove-item="${index}" class="link-danger">Remover</button>
      </li>
    `)
    .join("");
  $("#order-total").textContent = money(
    calculateOrderPreviewTotal(state.orderItems, $("#order-discount").value)
  );
}

function renderTabs() {
  $("#tabs-count").textContent = String(state.tabs.length);
  $("#tabs-list").innerHTML = state.tabs.length
    ? state.tabs.map((tab) => `<article class="order-card">
        <div class="section-heading"><strong>${escapeHtml(tab.kind === "table" ? `Mesa ${tab.label}` : `Comanda ${tab.label}`)}</strong><span>${money(tab.total)}</span></div>
        <div class="mini-meta"><span>${escapeHtml(tab.customerName || "Sem cliente")}</span><span>${tab.rounds.length} rodada(s)</span><span>${formatWhen(tab.openedAt)}</span></div>
        <div class="tab-rounds">${tab.rounds.map((round) => `<div class="round-row ${round.roundKind === "cancellation" ? "cancellation" : ""}">
          <strong>${round.roundKind === "cancellation" ? "Cancelamento" : `Rodada ${round.roundNumber}`}</strong>
          ${(round.items || []).map((item) => {
            const cancelled = tab.rounds.filter((candidate) => candidate.reversesOrderId === round.id)
              .flatMap((candidate) => candidate.items || [])
              .filter((candidate) => candidate.reversesItemId === item.id)
              .reduce((sum, candidate) => sum + Number(candidate.quantity), 0);
            const remaining = Number(item.quantity) - cancelled;
            return `<div>${item.quantity}x ${escapeHtml(item.name)}${round.roundKind === "production" && remaining > 0 ? ` <button type="button" data-cancel-item="${escapeHtml(item.id)}" data-cancel-tab="${escapeHtml(tab.id)}" data-cancel-order="${escapeHtml(round.id)}" data-cancel-max="${remaining}" data-cancel-name="${escapeHtml(item.name)}">Cancelar</button>` : ""}</div>`;
          }).join("")}
        </div>`).join("")}</div>
        <div class="actions"><button type="button" data-use-tab="${escapeHtml(tab.id)}" class="primary">Lançar itens</button></div>
      </article>`).join("")
    : '<p class="empty-state">Nenhuma comanda aberta.</p>';
  renderActiveTab();
}

function renderActiveTab() {
  const tab = state.tabs.find((item) => item.id === state.activeTabId);
  if (state.activeTabId && !tab) state.activeTabId = null;
  const active = Boolean(tab);
  $("#active-tab-banner").hidden = !active;
  $("#order-payment-field").hidden = active;
  $("#active-tab-label").textContent = active
    ? `${tab.kind === "table" ? "Mesa" : "Comanda"} ${tab.label} · rodada ${tab.rounds.length + 1}`
    : "";
}

function orderActions(order) {
  const actions = [];
  if (order.status === "received") actions.push(["confirmed", "Confirmar"]);
  if (order.status === "confirmed") actions.push(["in_preparation", "Em preparo"]);
  if (order.status === "in_preparation") actions.push(["ready", "Pronto"]);
  if (order.status === "ready") actions.push(["completed", "Concluir"]);
  if (!order.tabId && !['completed', 'cancelled'].includes(order.status)) actions.push(["cancelled", "Cancelar"]);
  return actions;
}

function renderOrders() {
  const list = $("#orders-list");
  if (!state.orders.length) {
    list.innerHTML = '<p class="empty-state">Nenhum pedido registrado.</p>';
    return;
  }
  list.innerHTML = state.orders
    .map((order) => `
      <div class="order-card">
        <div class="order-meta">
          <span class="pill">${escapeHtml(sourceLabels[order.source] || order.source)}</span>
          <span>${escapeHtml(fulfillmentLabels[order.fulfillmentMode] || order.fulfillmentMode)}</span>
          <span>${escapeHtml(order.customerName || "Cliente")}</span>
          <span>${escapeHtml(statusLabels[order.status] || order.status)}</span>
          <span>${formatWhen(order.createdAt)}</span>
          ${order.discountPercent ? `<span>Desconto ${order.discountPercent}%</span>` : ""}
          <strong>${money(order.total)}</strong>
        </div>
        <p>${(order.items || []).map((item) => `${item.quantity}x ${escapeHtml(item.name)}${(item.addons || []).length ? ` + ${item.addons.map((addon) => escapeHtml(addon.name)).join(", ")}` : ""}${item.discountPercent ? ` (-${item.discountPercent}%)` : ""}`).join(" · ")}</p>
        <div class="actions">
          ${orderActions(order)
            .map(([status, label]) => `<button type="button" data-order-status="${escapeHtml(order.id)}" data-status="${status}">${label}</button>`)
            .join("")}
          <button type="button" data-reprint="${escapeHtml(order.id)}">Reimprimir</button>
        </div>
      </div>
    `)
    .join("");
}

function renderKitchen() {
  const list = $("#kitchen-list");
  if (!state.kitchen.length) {
    list.innerHTML = '<p class="empty-state">A cozinha está sem pedidos pendentes.</p>';
    return;
  }
  list.innerHTML = state.kitchen
    .map((order) => `
      <div class="order-card kitchen-card ${order.roundKind === "cancellation" ? "cancellation" : ""}">
        <div class="order-meta">
          <span class="pill">${escapeHtml(statusLabels[order.status] || order.status)}</span>
          ${order.roundKind === "cancellation" ? '<span class="pill">CANCELAMENTO</span>' : ""}
          ${order.tabId ? `<span>Comanda ${escapeHtml(order.metadata?.tabLabel || order.tabId)} · rodada ${order.roundNumber}</span>` : ""}
          <span>${escapeHtml(sourceLabels[order.source] || order.source)}</span>
          <span>${escapeHtml(fulfillmentLabels[order.fulfillmentMode] || order.fulfillmentMode)}</span>
          <strong>${escapeHtml(order.customerName || "Cliente")}</strong>
          <span>${formatWhen(order.createdAt)}</span>
        </div>
        ${order.deliveryAddress ? `<p><strong>Endereço:</strong> ${escapeHtml(order.deliveryAddress)}</p>` : ""}
        <ul class="kitchen-items">
          ${(order.items || []).map((item) => `<li><strong>${item.quantity}x ${escapeHtml(item.name)}</strong>${(item.addons || []).map((addon) => `<div>+ ${escapeHtml(addon.name)}</div>`).join("")}${item.notes ? ` — ${escapeHtml(item.notes)}` : ""}</li>`).join("")}
        </ul>
      </div>
    `)
    .join("");
}

function renderFinanceSummary() {
  const summary = state.financeSummary;
  if (!summary) return;
  $("#finance-summary").innerHTML = `
    <div class="stat"><span>Vendas brutas</span><strong>${money(summary.grossSales)}</strong></div>
    <div class="stat"><span>Vendas líquidas</span><strong>${money(summary.netSales)}</strong></div>
    <div class="stat"><span>Pedidos concluídos</span><strong>${summary.totalOrders}</strong></div>
    <div class="stat"><span>Ticket médio</span><strong>${money(summary.ticketAverage)}</strong></div>
  `;
}

function renderEntries() {
  const list = $("#finance-entries");
  if (!state.financeEntries.length) {
    list.innerHTML = '<p class="empty-state">Nenhum lançamento financeiro.</p>';
    return;
  }
  list.innerHTML = state.financeEntries
    .map((entry) => `
      <div class="entry-card">
        <div class="order-meta">
          <span class="pill">${escapeHtml(financeTypeLabels[entry.type] || entry.type)}</span>
          <span>${escapeHtml(sourceLabels[entry.source] || entry.source || "Caixa")}</span>
          <span>${escapeHtml(paymentLabels[entry.paymentMethod] || entry.paymentMethod)}</span>
          <span>${formatWhen(entry.occurredAt)}</span>
        </div>
        <strong>${escapeHtml(entry.label)}</strong>
        <div>${money(entry.amount)}</div>
      </div>
    `)
    .join("");
}

function activeShift() {
  return state.shifts.find((shift) => shift.status === "open");
}

function renderShifts() {
  const shift = activeShift();
  const status = $("#cash-status");
  status.textContent = shift ? "Aberto" : "Fechado";
  status.classList.toggle("open", Boolean(shift));
  $("#shift-form").hidden = Boolean(shift);
  $("#open-shift-actions").hidden = !shift;
  $("#cash-details").textContent = shift
    ? `Aberto em ${formatWhen(shift.openedAt)} · Esperado em dinheiro: ${money(shift.expectedAmount)}`
    : "Abra o caixa para registrar vendas em dinheiro, reforços e sangrias.";

  const list = $("#shift-list");
  if (!state.shifts.length) {
    list.innerHTML = '<p class="empty-state">Nenhum caixa registrado.</p>';
    return;
  }
  list.innerHTML = state.shifts
    .map((item) => `
      <div class="shift-card">
        <div class="order-meta">
          <span class="pill ${item.status === "open" ? "open" : ""}">${item.status === "open" ? "Aberto" : "Fechado"}</span>
          <span>${formatWhen(item.openedAt)}</span>
        </div>
        <div>Abertura: ${money(item.openingAmount)}</div>
        <div>Esperado: ${money(item.expectedAmount)}</div>
        <div>Contado: ${item.declaredAmount == null ? "—" : money(item.declaredAmount)}</div>
        <div>Diferença: ${item.differenceAmount == null ? "—" : money(item.differenceAmount)}</div>
      </div>
    `)
    .join("");
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) throw new Error(payload?.message || payload || "Falha na API");
  return payload;
}

async function refreshAll() {
  const [catalog, tabs, orders, kitchen, summary, entries, shifts] = await Promise.all([
    api("/catalog"),
    api("/tabs?status=open"),
    api("/orders"),
    api("/kitchen/queue"),
    api("/finance/summary"),
    api("/finance/entries"),
    api("/cash-shifts")
  ]);

  state.catalog = catalog.items;
  state.addOns = catalog.addOns || [];
  state.tabs = tabs.items;
  state.orders = orders.items;
  state.kitchen = kitchen.items;
  state.financeSummary = summary;
  state.financeEntries = entries.items;
  state.shifts = shifts.items;

  renderCatalog();
  renderTabs();
  renderOrderItems();
  renderOrders();
  renderKitchen();
  renderFinanceSummary();
  renderEntries();
  renderShifts();
  $("#api-status").textContent = "API conectada";
  syncStamp(new Date().toLocaleTimeString("pt-BR"));
}

let refreshInFlight = null;
function refreshSafe() {
  if (!refreshInFlight) {
    refreshInFlight = refreshAll()
      .catch((error) => {
        $("#api-status").textContent = "Falha ao conectar API";
        $("#last-sync").textContent = error.message;
      })
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

function syncDeliveryAddress() {
  const delivery = $("#fulfillment-mode").value === "delivery";
  const field = $("#delivery-address-field");
  const input = $("#delivery-address");
  field.hidden = !delivery;
  input.required = delivery;
  if (!delivery) input.value = "";
}

function showPanel(name) {
  document.querySelectorAll(".tab-button").forEach((item) => item.classList.toggle("active", item.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((item) => item.classList.toggle("active", item.id === `tab-${name}`));
}

function wireTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => showPanel(button.dataset.tab));
  });
}

function wireCart() {
  $("#order-discount").addEventListener("input", renderOrderItems);
  $("#catalog-select").addEventListener("change", renderAddOns);
  $("#add-item").addEventListener("click", () => {
    const selected = state.catalog.find((item) => item.sku === $("#catalog-select").value);
    if (!selected) return;
    addOrAccumulateItem(
      state.orderItems,
      selected,
      $("#catalog-qty").value,
      $("#catalog-notes").value,
      $("#catalog-discount").value,
      [...document.querySelectorAll('input[name="catalog-addon"]:checked')]
        .map((input) => state.addOns.find((addon) => addon.sku === input.value))
        .filter(Boolean)
    );
    $("#catalog-qty").value = "1";
    $("#catalog-discount").value = "0";
    $("#catalog-notes").value = "";
    renderAddOns();
    renderOrderItems();
  });

  document.body.addEventListener("click", async (event) => {
    const button = event.target.closest?.("button");
    if (!button) return;
    if (button.dataset.cancelItem) {
      const form = $("#cancellation-form");
      form.elements.tabId.value = button.dataset.cancelTab;
      form.elements.orderId.value = button.dataset.cancelOrder;
      form.elements.itemId.value = button.dataset.cancelItem;
      form.elements.quantity.max = button.dataset.cancelMax;
      form.elements.quantity.value = button.dataset.cancelMax;
      $("#cancellation-item").textContent = `${button.dataset.cancelName} · máximo ${button.dataset.cancelMax}`;
      state.cancellationAttempt = null;
      $("#cancellation-dialog").showModal();
      return;
    }
    if (button.dataset.useTab) {
      state.activeTabId = button.dataset.useTab;
      renderActiveTab();
      showPanel("pedidos");
      return;
    }
    const removeIndex = button.dataset.removeItem;
    const decreaseIndex = button.dataset.decreaseItem;
    const increaseIndex = button.dataset.increaseItem;

    if (removeIndex != null) {
      state.orderItems.splice(Number(removeIndex), 1);
      renderOrderItems();
      return;
    }
    if (decreaseIndex != null) {
      const item = state.orderItems[Number(decreaseIndex)];
      setItemQuantity(state.orderItems, Number(decreaseIndex), Math.max(1, item.quantity - 1));
      renderOrderItems();
      return;
    }
    if (increaseIndex != null) {
      const item = state.orderItems[Number(increaseIndex)];
      setItemQuantity(state.orderItems, Number(increaseIndex), item.quantity + 1);
      renderOrderItems();
      return;
    }

    if (!button.dataset.orderStatus && !button.dataset.reprint) return;
    button.disabled = true;
    try {
      if (button.dataset.orderStatus) {
        await api(`/orders/${button.dataset.orderStatus}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: button.dataset.status })
        });
        notify("Status do pedido atualizado.");
      } else {
        await api(`/orders/${button.dataset.reprint}/reprint`, { method: "POST", body: "{}" });
        notify("Reimpressão enviada para a cozinha.");
      }
      await refreshAll();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  document.body.addEventListener("change", (event) => {
    const quantityIndex = event.target.dataset.itemQuantity;
    const discountIndex = event.target.dataset.itemDiscount;
    if (quantityIndex == null && discountIndex == null) return;
    if (quantityIndex != null) {
      setItemQuantity(state.orderItems, Number(quantityIndex), event.target.value);
    } else {
      setItemDiscount(state.orderItems, Number(discountIndex), event.target.value);
    }
    renderOrderItems();
  });
}

function wireForms() {
  $("#fulfillment-mode").addEventListener("change", syncDeliveryAddress);
  $("#clear-active-tab").addEventListener("click", () => {
    state.activeTabId = null;
    renderActiveTab();
  });
  $("#close-cancellation-dialog").addEventListener("click", () => $("#cancellation-dialog").close());
  $("#cancellation-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const payload = {
      items: [{ itemId: data.get("itemId"), quantity: Number(data.get("quantity")) }],
      reason: data.get("reason")
    };
    state.cancellationAttempt = nextOrderAttempt(state.cancellationAttempt, payload);
    try {
      await api(`/tabs/${data.get("tabId")}/rounds/${data.get("orderId")}/cancellations`, {
        method: "POST",
        headers: { "Idempotency-Key": state.cancellationAttempt.key },
        body: JSON.stringify(payload)
      });
      state.cancellationAttempt = null;
      form.reset();
      $("#cancellation-dialog").close();
      await refreshAll();
      notify("Ticket de cancelamento enviado à cozinha.");
    } catch (error) {
      notify(error.message, "error");
    }
  });

  $("#tab-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    try {
      const tab = await api("/tabs", {
        method: "POST",
        body: JSON.stringify({ kind: data.get("kind"), label: data.get("label"), customerName: data.get("customerName") })
      });
      state.activeTabId = tab.id;
      form.reset();
      await refreshAll();
      showPanel("pedidos");
      notify("Comanda aberta. Adicione os itens da primeira rodada.");
    } catch (error) {
      notify(error.message, "error");
    }
  });

  $("#order-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!state.orderItems.length) {
      notify("Adicione pelo menos um item antes de finalizar.", "error");
      return;
    }
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const payload = {
      source: formData.get("source"),
      fulfillmentMode: formData.get("fulfillmentMode"),
      deliveryAddress: formData.get("deliveryAddress"),
      customerName: formData.get("customerName"),
      paymentMethod: formData.get("paymentMethod"),
      notes: formData.get("notes"),
      discountPercent: Number(formData.get("discountPercent") || 0),
      items: state.orderItems
    };
    state.orderAttempt = nextOrderAttempt(state.orderAttempt, payload);

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Enviando...";
    try {
      await api(state.activeTabId ? `/tabs/${state.activeTabId}/rounds` : "/orders", {
        method: "POST",
        headers: { "Idempotency-Key": state.orderAttempt.key },
        body: JSON.stringify(payload)
      });
      state.orderItems = [];
      state.orderAttempt = null;
      form.reset();
      syncDeliveryAddress();
      renderOrderItems();
      await refreshAll().catch((error) => {
        $("#api-status").textContent = "Pedido salvo; atualização pendente";
        $("#last-sync").textContent = error.message;
      });
      notify("Pedido finalizado e enviado para a cozinha.");
    } catch (error) {
      notify(`${error.message}. O carrinho foi mantido para tentar novamente.`, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "Finalizar pedido";
    }
  });

  $("#shift-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (activeShift()) return notify("O caixa já está aberto.", "error");
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const formData = new FormData(form);
      await api("/cash-shifts/open", {
        method: "POST",
        body: JSON.stringify({ openingAmount: Number(formData.get("openingAmount")) })
      });
      await refreshAll();
      notify("Caixa aberto.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });

  const dialog = $("#adjustment-dialog");
  $("#open-adjustment-dialog").addEventListener("click", () => {
    if (!activeShift()) return notify("Abra o caixa antes de movimentar valores.", "error");
    dialog.showModal();
  });
  $("#close-adjustment-dialog").addEventListener("click", () => dialog.close());

  $("#adjustment-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const shift = activeShift();
    if (!shift) {
      dialog.close();
      return notify("O caixa está fechado.", "error");
    }
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const formData = new FormData(form);
      await api(`/cash-shifts/${shift.id}/adjustments`, {
        method: "POST",
        body: JSON.stringify({
          kind: formData.get("kind"),
          amount: Number(formData.get("amount")),
          reason: formData.get("reason")
        })
      });
      form.reset();
      dialog.close();
      await refreshAll();
      notify("Movimentação registrada.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });

  $("#close-shift-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const shift = activeShift();
    if (!shift) return notify("O caixa já está fechado.", "error");
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const formData = new FormData(form);
      await api(`/cash-shifts/${shift.id}/close`, {
        method: "POST",
        body: JSON.stringify({ declaredAmount: Number(formData.get("declaredAmount")) })
      });
      form.reset();
      await refreshAll();
      notify("Caixa fechado.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });
}

function wireSse() {
  const orderEvents = new EventSource(`${apiBase}/events/orders`);
  const financeEvents = new EventSource(`${apiBase}/events/finance`);
  orderEvents.onmessage = refreshSafe;
  financeEvents.onmessage = refreshSafe;
  orderEvents.onerror = financeEvents.onerror = () => {
    $("#api-status").textContent = "Reconectando atualizações...";
  };
}

if (typeof document !== "undefined") {
  wireTabs();
  wireCart();
  wireForms();
  wireSse();
  syncDeliveryAddress();
  renderOrderItems();
  refreshSafe();
}
