const state = {
  catalog: [],
  addOns: [],
  orderItems: [],
  orderAttempt: null,
  cancellationAttempt: null,
  inventoryAttempt: null,
  paymentAttempt: null,
  paymentReversalAttempt: null,
  tabs: [],
  activeTabId: null,
  inventory: { balances: [], movements: [] },
  orders: [],
  kitchen: [],
  financeSummary: null,
  financeEntries: [],
  financeFilters: { paymentMethod: "", type: "" },
  shifts: [],
  activeCatalogCategory: null,
  isCreatingNewTabInOrder: false
};

const apiBase = typeof window === "undefined"
  ? ""
  : (window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1")
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : `${window.location.protocol}//${window.location.hostname.replace('ops-web', 'api')}`);


const sourceLabels = {
  counter: "🍔 Balcão",
  whatsapp: "💬 WhatsApp",
  ifood: "🔴 iFood",
  deliverymuch: "🟠 Delivery Much",
  olaclick: "🟢 OlaClick"
};

const fulfillmentLabels = {
  delivery: "🛵 Delivery",
  pickup: "🛍️ Retirada",
  local: "🍽️ Local"
};

const statusLabels = {
  received: "Recebido",
  confirmed: "Confirmado",
  in_preparation: "Em preparo",
  ready: "Pronto",
  completed: "Finalizado",
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
  cash_withdrawal: "Retirada (sangria)",
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

function printOrderTicket(order) {
  const printArea = document.getElementById("print-area");
  if (!printArea) return;
  const itemsHtml = (order.items || []).map(item => `
    <div style="margin-bottom: 8px;">
      <strong>${item.quantity}x ${item.name}</strong>
      ${item.addons && item.addons.length ? `<br><small>+ ${item.addons.map(a => a.name).join(", ")}</small>` : ""}
      ${item.notes ? `<br><small>Obs: ${item.notes}</small>` : ""}
    </div>
  `).join("");
  printArea.innerHTML = `
    <div style="font-family: monospace; width: 300px; padding: 10px; color: black; background: white;">
      <h2 style="text-align: center; margin: 0 0 10px 0;">CAMOBURGUER</h2>
      <div style="border-bottom: 1px dashed black; margin-bottom: 10px;"></div>
      <p><strong>Pedido:</strong> #${order.id.slice(0,6).toUpperCase()}</p>
      <p><strong>Cliente:</strong> ${order.customerName || "Não informado"}</p>
      <p><strong>Tipo:</strong> ${fulfillmentLabels[order.fulfillmentMode] || order.fulfillmentMode}</p>
      ${order.fulfillmentMode === 'delivery' && order.deliveryAddress ? `<p><strong>Endereço:</strong> ${order.deliveryAddress}</p>` : ''}
      <div style="border-bottom: 1px dashed black; margin-bottom: 10px;"></div>
      ${itemsHtml}
      <div style="border-bottom: 1px dashed black; margin-bottom: 10px; margin-top: 10px;"></div>
      <h3 style="text-align: right;">Total: ${money(order.total)}</h3>
    </div>
  `;
  window.print();
}

function printShiftReport(shift, summary, entries, isDetailed) {
  const printArea = document.getElementById("print-area");
  if (!printArea) return;

  const summaryHtml = Object.entries(summary.paymentsByMethod || {})
    .filter(([, amount]) => amount !== 0)
    .map(([method, amount]) => `<div style="display: flex; justify-content: space-between;"><span>${paymentLabels[method] || method}</span><span>${money(amount)}</span></div>`)
    .join("");

  const detailedHtml = isDetailed ? `
    <div style="border-bottom: 1px dashed black; margin-bottom: 10px; margin-top: 10px;"></div>
    <h3 style="text-align: center; font-size: 14px; margin: 0 0 10px 0;">Lançamentos Detalhados</h3>
    ${entries.map(entry => `
      <div style="margin-bottom: 6px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between;">
          <strong>${escapeHtml(financeTypeLabels[entry.type] || entry.type)}</strong>
          <span>${money(entry.amount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #555;">
          <span>${formatWhen(entry.occurredAt).split(" ")[1]} - ${escapeHtml(paymentLabels[entry.paymentMethod] || entry.paymentMethod)}</span>
          <span style="text-align: right;">${escapeHtml(entry.label).slice(0, 15)}</span>
        </div>
      </div>
    `).join("")}
  ` : "";

  printArea.innerHTML = `
    <div style="font-family: monospace; width: 300px; padding: 10px; color: black; background: white; font-size: 12px;">
      <h2 style="text-align: center; margin: 0 0 10px 0;">CAMOBURGUER</h2>
      <h3 style="text-align: center; margin: 0 0 10px 0;">FECHAMENTO DE CAIXA</h3>
      <div style="border-bottom: 1px dashed black; margin-bottom: 10px;"></div>
      <p style="margin: 4px 0;"><strong>Abertura:</strong> ${formatWhen(shift.openedAt)}</p>
      <p style="margin: 4px 0;"><strong>Fechamento:</strong> ${shift.closedAt ? formatWhen(shift.closedAt) : "Aberto"}</p>
      <div style="border-bottom: 1px dashed black; margin-bottom: 10px; margin-top: 10px;"></div>
      <div style="display: flex; justify-content: space-between;"><strong style="color: #666;">Abertura Base:</strong><span>${money(shift.openingAmount)}</span></div>
      <div style="display: flex; justify-content: space-between;"><strong>Total de Vendas:</strong><span>${money(summary.grossSales || 0)}</span></div>
      <div style="display: flex; justify-content: space-between;"><strong style="color: #666;">Cancelamentos:</strong><span>${money(summary.cancellations || 0)}</span></div>
      <div style="display: flex; justify-content: space-between;"><strong style="color: #666;">Entradas (Reforço):</strong><span>${money(summary.entriesByType?.['cash_reinforcement'] || 0)}</span></div>
      <div style="display: flex; justify-content: space-between;"><strong style="color: #666;">Saídas (Sangria):</strong><span>${money(summary.entriesByType?.['cash_withdrawal'] || 0)}</span></div>
      <div style="border-bottom: 1px dashed black; margin-bottom: 10px; margin-top: 10px;"></div>
      <h3 style="font-size: 13px; margin: 0 0 5px 0;">Resumo por Forma de Pagamento</h3>
      ${summaryHtml || "Nenhuma movimentação"}
      <div style="border-bottom: 1px dashed black; margin-bottom: 10px; margin-top: 10px;"></div>
      <div style="display: flex; justify-content: space-between;"><strong style="font-size: 14px;">Total Esperado:</strong><strong style="font-size: 14px;">${money(shift.expectedAmount)}</strong></div>
      ${shift.declaredAmount !== null ? `<div style="display: flex; justify-content: space-between;"><span>Valor Contado:</span><span>${money(shift.declaredAmount)}</span></div>` : ""}
      ${shift.differenceAmount !== null ? `<div style="display: flex; justify-content: space-between;"><strong>Diferença:</strong><strong>${money(shift.differenceAmount)}</strong></div>` : ""}
      ${detailedHtml}
    </div>
  `;
  window.print();
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
  const container = $("#catalog-modal-content");
  if (!container) return;
  const balances = Object.fromEntries(state.inventory.balances.map((item) => [item.category, item.quantity]));
  
  const categories = state.catalog.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  const categoryNames = Object.keys(categories);
  if (!state.activeCatalogCategory && categoryNames.length > 0) {
    state.activeCatalogCategory = categoryNames[0];
  }

  const tabsHtml = `
    <nav class="tab-bar" style="margin-bottom: 16px;">
      ${categoryNames.map(cat => `
        <button type="button" class="tab-button ${state.activeCatalogCategory === cat ? 'active' : ''}" data-catalog-tab="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
      `).join("")}
    </nav>
  `;

  const activeItems = categories[state.activeCatalogCategory] || [];
  
  const itemsHtml = activeItems.map((item) => {
    const inStock = !item.stockCategory || Number(balances[item.stockCategory]) > 0;
    const sellable = item.available && inStock;
    const availability = !item.available ? "Esgotado" : inStock ? money(item.price) : "Sem estoque";
    return `
      <div class="menu-product-card" ${sellable ? "" : 'style="opacity: 0.6;"'}>
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description || "")}</p>
          <div class="price">${availability}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button type="button" class="primary" data-add-direct="${escapeHtml(item.sku)}" ${sellable ? "" : "disabled"}>Adicionar</button>
          <button type="button" class="link" data-open-config="${escapeHtml(item.sku)}" ${sellable ? "" : "disabled"} style="padding: 0; font-size: 0.85rem; text-decoration: underline;">Adicionais / Desconto</button>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = tabsHtml + `<div class="menu-products-grid">${itemsHtml}</div>`;
}

function openItemConfig(sku) {
  const item = state.catalog.find((i) => i.sku === sku);
  if (!item) return;
  
  $("#config-item-sku").value = item.sku;
  $("#config-item-name").textContent = item.name;
  $("#config-item-price").textContent = money(item.price);
  
  const field = $("#config-addons-field");
  field.hidden = !item.allowsAddons;
  $("#config-addons").innerHTML = item.allowsAddons
    ? state.addOns.map((addon) => `<label class="check-option"><input type="checkbox" name="config-addon" value="${escapeHtml(addon.sku)}" /> ${escapeHtml(addon.name)} <span>${money(addon.price)}</span></label>`).join("")
    : "";
    
  $("#config-qty").value = "1";
  $("#config-discount").value = "0";
  $("#config-notes").value = "";
  
  $("#item-config-dialog").showModal();
}

function renderInventory() {
  const labels = { xis: "Xis", dog: "Dog", hamburguer: "Hambúrguer" };
  const balEl = $("#inventory-balances");
  if (balEl && state.inventory.balances) {
    balEl.innerHTML = state.inventory.balances
      .map((item) => `<div class="stat"><span>${labels[item.category] || escapeHtml(item.category)}</span><strong>${item.quantity}</strong></div>`)
      .join("");
  }
  const movEl = $("#inventory-movements");
  if (movEl && state.inventory.movements) {
    movEl.innerHTML = state.inventory.movements.length
      ? state.inventory.movements.map((item) => `<div class="entry-card"><div class="mini-meta"><span>${labels[item.category] || escapeHtml(item.category)}</span><span>${formatWhen(item.createdAt)}</span><span>${escapeHtml(item.reason)}</span></div><strong>${item.delta > 0 ? "+" : ""}${item.delta}</strong>${item.metadata?.note ? `<p>${escapeHtml(item.metadata.note)}</p>` : ""}</div>`).join("")
      : '<p class="empty-state">Nenhuma movimentação.</p>';
  }
}

function renderOrderItems() {
  const list = $("#order-items");
  if (list) {
    if (!state.orderItems.length) {
      list.innerHTML = '<li class="empty-state">Nenhum item adicionado.</li>';
      const orderTotal = $("#order-total");
      if (orderTotal) orderTotal.textContent = money(0);
    } else {
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
      const orderTotal = $("#order-total");
      if (orderTotal) {
        orderTotal.textContent = money(
          calculateOrderPreviewTotal(state.orderItems, $("#order-discount")?.value || 0)
        );
      }
    }
  }
  syncCashChange();
  renderActiveTab();
}

function renderTabs() {
  $("#tabs-count").textContent = String(state.tabs.length);
  const sortedTabs = [...state.tabs].reverse();
  $("#tabs-list").innerHTML = sortedTabs.length
    ? sortedTabs.map((tab) => {
      const reversedPayments = new Set(tab.payments.filter((payment) => payment.kind === "reversal").map((payment) => payment.reversesPaymentId));
      return `<article class="order-card">
        <div class="section-heading"><strong>${escapeHtml(tab.kind === "table" ? `Mesa ${tab.label}` : `Comanda ${tab.label}`)}</strong><span>${money(tab.total)}</span></div>
        <div class="mini-meta"><span>${escapeHtml(tab.customerName || "Sem cliente")}</span><span>${tab.rounds.length} rodada(s)</span><span>${formatWhen(tab.openedAt)}</span></div>
        <div class="mini-meta"><span>Pago: ${money(tab.paid)}</span><strong>Restante: ${money(tab.balance)}</strong><span>${tab.paymentMethod ? paymentLabels[tab.paymentMethod] : "Não pago"}</span></div>
        <div class="tab-rounds">${tab.rounds.map((round) => `<div class="round-row ${round.roundKind === "cancellation" ? "cancellation" : ""}">
          <strong>${round.roundKind === "cancellation" ? "Cancelamento" : `Rodada ${round.roundNumber}`} ${round.roundKind === "production" && !["ifood", "deliverymuch", "olaclick"].includes(round.source) ? `<button type="button" data-edit-discount-order="${escapeHtml(round.id)}" data-current-discount="${round.discountPercent || 0}" class="small link-primary">Desconto (${round.discountPercent || 0}%)</button>` : ""}</strong>
          ${(round.items || []).map((item) => {
            const cancelled = tab.rounds.filter((candidate) => candidate.reversesOrderId === round.id)
              .flatMap((candidate) => candidate.items || [])
              .filter((candidate) => candidate.reversesItemId === item.id)
              .reduce((sum, candidate) => sum + Number(candidate.quantity), 0);
            const remaining = Number(item.quantity) - cancelled;
            return `<div>${item.quantity}x ${escapeHtml(item.name)}${round.roundKind === "production" && remaining > 0 ? ` <button type="button" data-cancel-item="${escapeHtml(item.id)}" data-cancel-tab="${escapeHtml(tab.id)}" data-cancel-order="${escapeHtml(round.id)}" data-cancel-max="${remaining}" data-cancel-name="${escapeHtml(item.name)}">Cancelar</button>` : ""}</div>`;
          }).join("")}
        </div>`).join("")}</div>
        <div class="tab-payments">${tab.payments.map((payment) => `<div class="round-row ${payment.kind === "reversal" ? "cancellation" : ""}"><span>${payment.kind === "reversal" ? "Estorno" : paymentLabels[payment.paymentMethod]} · ${money(payment.amount)}</span>${payment.kind === "payment" && !reversedPayments.has(payment.id) ? `<button type="button" data-reverse-payment="${escapeHtml(payment.id)}" data-payment-tab="${escapeHtml(tab.id)}">Estornar</button>` : ""}</div>`).join("")}</div>
        ${tab.balanceCents > 0 ? `<form class="payment-form" data-payment-form data-tab-id="${escapeHtml(tab.id)}"><select name="paymentMethod" aria-label="Forma de pagamento"><option value="cash">Dinheiro</option><option value="pix">Pix</option><option value="credit_card">Crédito</option><option value="debit_card">Débito</option><option value="app_paid">Pago no app</option></select><input name="amount" type="number" min="0.01" max="${tab.balance}" step="0.01" value="${tab.balance}" required aria-label="Valor do pagamento" /><button type="submit">Registrar parcela</button><div data-tab-cash-box style="grid-column: 1 / -1; display: none; background: rgba(16, 185, 129, 0.08); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px dashed rgba(16, 185, 129, 0.3); margin-top: 6px;"><div style="display: flex; gap: 16px; align-items: center; justify-content: space-between; flex-wrap: wrap;"><label style="flex: 1 1 180px; flex-direction: row; align-items: center; gap: 8px; font-size: 0.88rem; margin: 0;">Recebido (R$): <input type="number" min="0" step="0.01" data-tab-cash-received placeholder="Ex.: 50,00" style="padding: 6px 10px; width: 110px;" /></label><div><span style="font-size: 0.82rem; color: var(--muted); font-weight: 600;">Troco: </span><strong data-tab-cash-change style="color: #34d399; font-size: 1.15rem;">R$ 0,00</strong></div></div></div></form>` : ""}
        ${tab.balanceCents === 0 ? `<div class="actions"><button type="button" data-close-tab="${escapeHtml(tab.id)}">Encerrar comanda</button></div>` : ""}
      </article>`;
    }).join("")
    : '<p class="empty-state">Nenhuma comanda aberta.</p>';
  document.querySelectorAll("[data-payment-form]").forEach(updateTabCashChange);
  renderActiveTab();
}

function renderActiveTab() {
  const tab = state.tabs.find((item) => item.id === state.activeTabId);
  if (state.activeTabId && !tab) state.activeTabId = null;
  const active = Boolean(tab);

  const activeCard = $("#active-comanda-card");
  if (activeCard) {
    activeCard.hidden = !active;
    if (active) {
      $("#active-comanda-title").textContent = `Lançando rodada ${tab.rounds.length + 1} para ${tab.kind === "table" ? "Mesa" : "Comanda"} ${tab.label}`;
      const cartList = $("#active-comanda-cart");
      if (cartList) {
        if (!state.orderItems.length) {
          cartList.innerHTML = '<li class="empty-state">Nenhum produto adicionado a esta rodada ainda. Clique no botão abaixo para escolher itens do cardápio.</li>';
        } else {
          cartList.innerHTML = state.orderItems
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
                  <button type="button" data-decrease-item="${index}">−</button>
                  <input type="number" min="1" value="${item.quantity}" data-item-quantity="${index}" />
                  <button type="button" data-increase-item="${index}">+</button>
                </div>
                <strong>${money(calculateOrderPreviewTotal([item]))}</strong>
                <button type="button" data-remove-item="${index}" class="link-danger">Remover</button>
              </li>
            `).join("");
        }
      }
      const totalEl = $("#active-comanda-total");
      if (totalEl) {
        const discountVal = Number($("#active-comanda-discount")?.value || 0);
        totalEl.textContent = money(calculateOrderPreviewTotal(state.orderItems, discountVal));
      }
    }
  }

  $("#active-tab-banner").hidden = !active;
  $("#order-payment-field").hidden = active;
  $("#active-tab-label").textContent = active
    ? `${tab.kind === "table" ? "Mesa" : "Comanda"} ${tab.label} · rodada ${tab.rounds.length + 1}`
    : "";

  const tabSelect = $("#order-tab-select");
  if (tabSelect) {
    const options = [
      '<option value="">(Nenhuma - Pedido Avulso / Balcão)</option>',
      '<option value="new">➕ Criar Nova Comanda / Mesa...</option>',
      ...state.tabs.map((t) => `<option value="${escapeHtml(t.id)}">${t.kind === "table" ? "Mesa" : "Comanda"} ${escapeHtml(t.label)}${t.customerName ? ` (${escapeHtml(t.customerName)})` : ""}</option>`)
    ];
    tabSelect.innerHTML = options.join("");
    if (state.isCreatingNewTabInOrder) {
      tabSelect.value = "new";
    } else if (state.activeTabId) {
      tabSelect.value = state.activeTabId;
    } else {
      tabSelect.value = "";
    }
  }
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
  const authList = $("#auth-list");
  const authCard = $("#auth-queue-card");

  const authOrders = state.orders.filter(o => o.status === "received" && ["ifood", "deliverymuch"].includes(o.source));
  const normalOrders = state.orders.filter(o => !authOrders.includes(o));

  if (authOrders.length) {
    authCard.hidden = false;
    authList.innerHTML = authOrders.map(order => `
      <div class="order-card integration-card">
        <div class="integration-meta">
          <strong>${escapeHtml(sourceLabels[order.source] || order.source)}</strong>
          <span>Aguardando autorização</span>
          ${order.syncStatus ? `<span>(Sincronização: ${order.syncStatus})</span>` : ""}
        </div>
        <div class="order-meta">
          <span>${escapeHtml(fulfillmentLabels[order.fulfillmentMode] || order.fulfillmentMode)}</span>
          <span>${escapeHtml(order.customerName || "Cliente")}</span>
          <span>${formatWhen(order.createdAt)}</span>
          <strong>${money(order.total)}</strong>
        </div>
        <p>${(order.items || []).map((item) => `${item.quantity}x ${escapeHtml(item.name)}${(item.addons || []).length ? ` + ${item.addons.map((addon) => escapeHtml(addon.name)).join(", ")}` : ""}${item.discountPercent ? ` (-${item.discountPercent}%)` : ""}`).join(" · ")}</p>
        <div class="actions">
          <button type="button" class="primary" data-integration-accept="${escapeHtml(order.id)}">Aceitar pedido</button>
          <button type="button" class="danger" data-integration-cancel="${escapeHtml(order.id)}">Recusar</button>
        </div>
      </div>
    `).join("");
  } else {
    authCard.hidden = true;
    authList.innerHTML = "";
  }

  if (!normalOrders.length) {
    list.innerHTML = '<p class="empty-state">Nenhum pedido registrado.</p>';
    return;
  }
  
  const sortedNormalOrders = [...normalOrders].sort((a, b) => {
    const isAFinished = ["completed", "cancelled"].includes(a.status);
    const isBFinished = ["completed", "cancelled"].includes(b.status);
    if (!isAFinished && isBFinished) return -1;
    if (isAFinished && !isBFinished) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  list.innerHTML = sortedNormalOrders
    .map((order) => `
      <div class="order-card">
        <div class="order-meta">
          <span class="pill ${['ifood', 'deliverymuch'].includes(order.source) ? 'warning' : ''}">${escapeHtml(sourceLabels[order.source] || order.source)}</span>
          <span>${escapeHtml(fulfillmentLabels[order.fulfillmentMode] || order.fulfillmentMode)}</span>
          <span>${escapeHtml(order.customerName || "Cliente")}</span>
          <span class="pill ${order.status === 'completed' ? 'open' : order.status === 'cancelled' ? 'danger' : ''}">${escapeHtml(statusLabels[order.status] || order.status)}</span>
          <span>${formatWhen(order.createdAt)}</span>
          ${order.syncStatus && order.syncStatus !== 'synced' ? `<span class="pill warning">Sync: ${order.syncStatus}</span>` : ""}
          ${order.discountPercent ? `<span>Desconto ${order.discountPercent}%</span>` : ""}
          <strong>${money(order.total)}</strong>
        </div>
        <p>${(order.items || []).map((item) => `${item.quantity}x ${escapeHtml(item.name)}${(item.addons || []).length ? ` + ${item.addons.map((addon) => escapeHtml(addon.name)).join(", ")}` : ""}${item.discountPercent ? ` (-${item.discountPercent}%)` : ""}`).join(" · ")}</p>
        <div class="actions">
          ${orderActions(order).map(([action, label]) => `
            <button type="button" data-order-action="${action}" data-order-id="${escapeHtml(order.id)}">${escapeHtml(label)}</button>
          `).join("")}
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
  const sortedKitchen = [...state.kitchen].reverse();
  list.innerHTML = sortedKitchen
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
    <div class="stat"><span>Recebimentos por forma</span><strong>${Object.entries(summary.paymentsByMethod).map(([method, amount]) => `${escapeHtml(paymentLabels[method] || method)}: ${money(amount)}`).join(" · ") || "Sem vendas"}</strong></div>
  `;
  const activeFilters = [
    state.financeFilters.paymentMethod ? paymentLabels[state.financeFilters.paymentMethod] : null,
    state.financeFilters.type ? financeTypeLabels[state.financeFilters.type] : null
  ].filter(Boolean);
  $("#finance-filter-status").textContent = activeFilters.length ? `Filtro ativo: ${activeFilters.join(" · ")}` : "Consolidado sem filtros";
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
        ${item.status === "closed" ? `
          <div class="actions" style="margin-top: 12px;">
            <button type="button" data-print-shift="${item.id}" data-print-type="summary">🖨️ Resumo</button>
            <button type="button" data-print-shift="${item.id}" data-print-type="detailed">🖨️ Detalhado</button>
          </div>
        ` : ""}
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
  if (!response.ok) {
    const errorMsg = typeof payload === "string" ? payload : (payload?.message || payload?.error || (typeof payload === "object" ? JSON.stringify(payload) : "Falha na API"));
    throw new Error(errorMsg);
  }
  return payload;
}

async function refreshAll() {
  const financeParams = new URLSearchParams(Object.entries(state.financeFilters).filter(([, value]) => value));
  const financeQuery = financeParams.size ? `?${financeParams}` : "";
  const [catalog, inventory, tabs, orders, kitchen, summary, entries, shifts] = await Promise.all([
    api("/catalog"),
    api("/inventory"),
    api("/tabs?status=open"),
    api("/orders"),
    api("/kitchen/queue"),
    api(`/finance/summary${financeQuery}`),
    api(`/finance/entries${financeQuery}`),
    api("/cash-shifts")
  ]);

  state.catalog = catalog.items;
  state.addOns = catalog.addOns || [];
  state.inventory = inventory;
  state.tabs = tabs.items;
  state.orders = orders.items;
  state.kitchen = kitchen.items;
  state.financeSummary = summary;
  state.financeEntries = entries.items;
  state.shifts = shifts.items;

  renderCatalog();
  renderInventory();
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

function syncCashChange() {
  const form = $("#order-form");
  if (!form) return;
  const paymentMethod = form.elements.paymentMethod?.value;
  const panel = $("#cash-change-panel");
  const paymentFieldVisible = !$("#order-payment-field")?.hidden;
  const isCash = paymentMethod === "cash" && paymentFieldVisible;

  if (panel) panel.hidden = !isCash;

  if (isCash) {
    const orderTotal = calculateOrderPreviewTotal(state.orderItems, $("#order-discount")?.value || 0);
    const received = Number($("#cash-received")?.value || 0);
    const change = received > orderTotal ? Math.round((received - orderTotal) * 100) / 100 : 0;
    const changeEl = $("#cash-change-due");
    if (changeEl) changeEl.textContent = money(change);
  }
}

function updateTabCashChange(form) {
  if (!form) return;
  const method = form.querySelector('[name="paymentMethod"]')?.value;
  const box = form.querySelector('[data-tab-cash-box]');
  const isCash = method === "cash";
  if (box) box.style.display = isCash ? "block" : "none";

  if (isCash) {
    const amount = Number(form.querySelector('[name="amount"]')?.value || 0);
    const received = Number(form.querySelector('[data-tab-cash-received]')?.value || 0);
    const change = received > amount ? Math.round((received - amount) * 100) / 100 : 0;
    const changeEl = form.querySelector('[data-tab-cash-change]');
    if (changeEl) changeEl.textContent = money(change);
  }
}

function wireCart() {
  document.body.addEventListener("input", (event) => {
    const form = event.target.closest?.("[data-payment-form]");
    if (form) updateTabCashChange(form);
  });
  document.body.addEventListener("change", (event) => {
    const form = event.target.closest?.("[data-payment-form]");
    if (form) updateTabCashChange(form);
  });
  $("#order-discount")?.addEventListener("input", renderOrderItems);
  $("#active-comanda-discount")?.addEventListener("input", renderOrderItems);
  $("#order-payment-method")?.addEventListener("change", syncCashChange);
  $("#cash-received")?.addEventListener("input", syncCashChange);
  
  $("#order-tab-select")?.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "new") {
      state.activeTabId = null;
      state.isCreatingNewTabInOrder = true;
      const fields = $("#new-tab-fields");
      if (fields) fields.hidden = false;
      const labelInput = $("#new-tab-label");
      if (labelInput) labelInput.required = true;
    } else {
      state.isCreatingNewTabInOrder = false;
      const fields = $("#new-tab-fields");
      if (fields) fields.hidden = true;
      const labelInput = $("#new-tab-label");
      if (labelInput) labelInput.required = false;
      state.activeTabId = val || null;
    }
    renderActiveTab();
  });

  $("#btn-open-catalog")?.addEventListener("click", () => {
    $("#catalog-modal")?.showModal();
  });
  
  $("#btn-quick-new-order")?.addEventListener("click", () => {
    $("#order-modal")?.showModal();
  });

  $("#btn-open-order-modal")?.addEventListener("click", () => {
    $("#order-modal")?.showModal();
  });

  $("#btn-quick-open-tab")?.addEventListener("click", () => {
    $("#tab-modal")?.showModal();
  });

  $("#btn-quick-stock")?.addEventListener("click", () => {
    $("#inventory-modal")?.showModal();
  });

  $("#btn-quick-cash")?.addEventListener("click", () => {
    if (activeShift()) {
      $("#adjustment-dialog")?.showModal();
    } else {
      notify("Abra o caixa para registrar movimentações.", "error");
    }
  });

  document.querySelectorAll("[data-dialog-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dialogId = btn.dataset.dialogClose;
      document.getElementById(dialogId)?.close();
    });
  });

  $("#btn-open-tab-modal")?.addEventListener("click", () => {
    $("#tab-modal")?.showModal();
  });

  $("#btn-open-inventory-modal")?.addEventListener("click", () => {
    $("#inventory-modal")?.showModal();
  });
  
  $("#close-catalog-modal")?.addEventListener("click", () => {
    $("#catalog-modal")?.close();
  });
  
  $("#close-item-config-dialog")?.addEventListener("click", () => {
    $("#item-config-dialog")?.close();
  });
  
  $("#item-config-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const sku = $("#config-item-sku").value;
    const selected = state.catalog.find((item) => item.sku === sku);
    if (!selected) return;
    
    addOrAccumulateItem(
      state.orderItems,
      selected,
      $("#config-qty").value,
      $("#config-notes").value,
      $("#config-discount").value,
      [...document.querySelectorAll('input[name="config-addon"]:checked')]
        .map((input) => state.addOns.find((addon) => addon.sku === input.value))
        .filter(Boolean)
    );
    
    renderOrderItems();
    $("#item-config-dialog")?.close();
    notify(`${selected.name} adicionado.`);
  });

    document.body.addEventListener("click", async (event) => {
      const target = event.target;
      const button = target.closest ? target.closest("button") : null;
      if (!button) return;

      if (button.dataset.catalogTab) {
        state.activeCatalogCategory = button.dataset.catalogTab;
        renderCatalog();
        return;
      }

      if (button.dataset.addDirect) {
        const selected = state.catalog.find((item) => item.sku === button.dataset.addDirect);
        if (selected) {
          addOrAccumulateItem(state.orderItems, selected, 1, "", 0, []);
          renderOrderItems();
          notify(`${selected.name} adicionado ao carrinho.`);
        }
        return;
      }

      if (button.dataset.openConfig) {
        openItemConfig(button.dataset.openConfig);
        return;
      }

      if (button.dataset.integrationAccept) {
        button.disabled = true;
        try {
          await api(`/orders/${button.dataset.integrationAccept}/accept`, {
            method: "POST",
            headers: { "Idempotency-Key": crypto.randomUUID() },
            body: "{}"
          });
          notify("Pedido aceito na integração.");
          await refreshAll();
        } catch (error) {
          notify(error.message, "error");
        } finally {
          button.disabled = false;
        }
        return;
      }

      if (button.dataset.integrationCancel) {
        button.disabled = true;
        try {
          await api(`/orders/${button.dataset.integrationCancel}/cancel`, {
            method: "POST",
            headers: { "Idempotency-Key": crypto.randomUUID() },
            body: JSON.stringify({ reasonId: "501" })
          });
          notify("Cancelamento enviado para a integração.");
          await refreshAll();
        } catch (error) {
          notify(error.message, "error");
        } finally {
          button.disabled = false;
        }
        return;
      }

      if (button.dataset.printShift) {
        button.disabled = true;
        try {
          const shiftId = button.dataset.printShift;
          const isDetailed = button.dataset.printType === "detailed";
          const shift = state.shifts.find(s => s.id === shiftId);
          if (!shift) throw new Error("Caixa não encontrado.");
          
          const [summary, entriesResult] = await Promise.all([
            api(`/finance/summary?shiftId=${shiftId}`),
            api(`/finance/entries?shiftId=${shiftId}`)
          ]);
          printShiftReport(shift, summary, entriesResult.items, isDetailed);
        } catch (error) {
          notify(error.message, "error");
        } finally {
          button.disabled = false;
        }
        return;
      }

    if (button.dataset.reversePayment) {
      const payload = { tabId: button.dataset.paymentTab, paymentId: button.dataset.reversePayment };
      state.paymentReversalAttempt = nextOrderAttempt(state.paymentReversalAttempt, payload);
      button.disabled = true;
      try {
        await api(`/tabs/${payload.tabId}/payments/${payload.paymentId}/reversals`, {
          method: "POST",
          headers: { "Idempotency-Key": state.paymentReversalAttempt.key },
          body: JSON.stringify({})
        });
        state.paymentReversalAttempt = null;
        await refreshAll();
        notify("Pagamento estornado e lançamento compensatório registrado.");
      } catch (error) {
        notify(error.message, "error");
      } finally {
        button.disabled = false;
      }
      return;
    }
    if (button.dataset.closeTab) {
      button.disabled = true;
      try {
        await api(`/tabs/${button.dataset.closeTab}/close`, { method: "POST", body: JSON.stringify({}) });
        await refreshAll();
        notify("Comanda encerrada com saldo zerado.");
      } catch (error) {
        notify(error.message, "error");
      } finally {
        button.disabled = false;
      }
      return;
    }
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
      state.orderItems = [];
      renderActiveTab();
      const tab = state.tabs.find((item) => item.id === state.activeTabId);
      if (tab) {
        const form = $("#order-form");
        if (form.elements.customerName && !form.elements.customerName.value) {
          form.elements.customerName.value = tab.customerName || `Comanda ${tab.label}`;
        }
        if (form.elements.fulfillmentMode) {
          form.elements.fulfillmentMode.value = "local";
        }
      }
      $("#catalog-modal").showModal();
      return;
    }
    if (button.id === "btn-cancel-active-comanda") {
      state.activeTabId = null;
      state.orderItems = [];
      renderActiveTab();
      renderOrderItems();
      return;
    }
    if (button.id === "btn-open-catalog-comanda") {
      $("#catalog-modal").showModal();
      return;
    }
    if (button.id === "btn-submit-comanda-round") {
      if (!state.activeTabId) return;
      const tab = state.tabs.find(t => t.id === state.activeTabId && t.status === "open");
      if (!tab) {
        state.activeTabId = null;
        renderActiveTab();
        notify("A comanda selecionada não está mais aberta. Selecione uma comanda aberta.", "error");
        return;
      }
      if (!state.orderItems.length) {
        notify("Adicione ao menos um produto antes de enviar a rodada.", "error");
        return;
      }
      button.disabled = true;
      try {
        const discountPercent = Number($("#active-comanda-discount")?.value || 0);
        await api(`/tabs/${state.activeTabId}/rounds`, {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({
            items: state.orderItems,
            discountPercent
          })
        });
        notify(`Rodada lançada com sucesso para ${tab.kind === "table" ? "Mesa" : "Comanda"} ${tab.label}!`);
        state.orderItems = [];
        state.activeTabId = null;
        await refreshAll();
      } catch (error) {
        if (error.message.includes("não encontrada")) {
          state.activeTabId = null;
          renderActiveTab();
        }
        notify(error.message, "error");
      } finally {
        button.disabled = false;
      }
      return;
    }
    if (button.dataset.editDiscountOrder) {
      const orderId = button.dataset.editDiscountOrder;
      const currentDiscount = button.dataset.currentDiscount || "0";
      const val = prompt("Informe a porcentagem de desconto para esta rodada (0 a 100):", currentDiscount);
      if (val !== null) {
        const discountPercent = Number(val);
        if (Number.isFinite(discountPercent) && discountPercent >= 0 && discountPercent <= 100) {
          button.disabled = true;
          try {
            await api(`/orders/${orderId}/discount`, {
              method: "PATCH",
              body: JSON.stringify({ discountPercent })
            });
            notify(`Desconto de ${discountPercent}% aplicado à rodada com sucesso.`);
            await refreshAll();
          } catch (error) {
            notify(error.message, "error");
          } finally {
            button.disabled = false;
          }
        } else {
          notify("Desconto inválido. Informe um valor numérico entre 0 e 100.", "error");
        }
      }
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

    if (button.dataset.openConfig) {
      openItemConfig(button.dataset.openConfig);
      return;
    }

    if (button.dataset.integrationAccept) {
      button.disabled = true;
      const orderId = button.dataset.integrationAccept;
      try {
        await api(`/orders/${orderId}/accept`, {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: "{}"
        });
        notify("Aceitação enviada. O pedido aparecerá na Fila de atendimento em breve.");
        await refreshAll();
      } catch (error) {
        notify(error.message, "error");
      } finally {
        button.disabled = false;
      }
      return;
    }

    if (button.dataset.integrationCancel) {
      button.disabled = true;
      const orderId = button.dataset.integrationCancel;
      try {
        await api(`/orders/${orderId}/cancel`, {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({ reasonId: "501" }) // Hardcoded para a demo
        });
        notify("Cancelamento enviado para a plataforma.");
        await refreshAll();
      } catch (error) {
        notify(error.message, "error");
      } finally {
        button.disabled = false;
      }
      return;
    }

    if (!button.dataset.orderAction && !button.dataset.reprint && !button.dataset.orderStatus) return;
    button.disabled = true;
    try {
      if (button.dataset.orderAction || button.dataset.orderStatus) {
        const orderId = button.dataset.orderId || button.dataset.orderStatus; // fallback para botões velhos
        const action = button.dataset.orderAction || button.dataset.status;
        
        await api(`/orders/${orderId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: action })
        });
        if (action === "in_preparation") {
          const order = state.orders.find(o => o.id === orderId);
          if (order) printOrderTicket(order);
        }
        notify("Status do pedido atualizado.");
      } else if (button.dataset.reprint) {
        const order = state.orders.find(o => o.id === button.dataset.reprint) || state.kitchen.find(o => o.id === button.dataset.reprint);
        if (order) printOrderTicket(order);
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
  $("#finance-filter-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.financeFilters = { paymentMethod: data.get("paymentMethod"), type: data.get("type") };
    await refreshAll();
  });
  $("#clear-finance-filters").addEventListener("click", async () => {
    $("#finance-filter-form").reset();
    state.financeFilters = { paymentMethod: "", type: "" };
    await refreshAll();
  });
  document.body.addEventListener("submit", async (event) => {
    const form = event.target.closest?.("[data-payment-form]");
    if (!form) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const payload = {
      tabId: form.dataset.tabId,
      paymentMethod: data.get("paymentMethod"),
      amountCents: Math.round(Number(data.get("amount")) * 100)
    };
    state.paymentAttempt = nextOrderAttempt(state.paymentAttempt, payload);
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await api(`/tabs/${payload.tabId}/payments`, {
        method: "POST",
        headers: { "Idempotency-Key": state.paymentAttempt.key },
        body: JSON.stringify({ paymentMethod: payload.paymentMethod, amountCents: payload.amountCents })
      });
      state.paymentAttempt = null;
      await refreshAll();
      notify("Parcela registrada. O saldo da comanda foi atualizado.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });
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
      $("#tab-modal")?.close();
      await refreshAll();
      showPanel("pedidos");
      notify("Comanda aberta. Adicione os itens da primeira rodada.");
    } catch (error) {
      notify(error.message, "error");
    }
  });

  $("#inventory-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const payload = { delta: Number(data.get("delta")), reason: data.get("reason") };
    state.inventoryAttempt = nextOrderAttempt(state.inventoryAttempt, {
      category: data.get("category"),
      ...payload
    });
    try {
      await api(`/inventory/${data.get("category")}/adjustments`, {
        method: "POST",
        headers: { "Idempotency-Key": state.inventoryAttempt.key },
        body: JSON.stringify(payload)
      });
      state.inventoryAttempt = null;
      form.reset();
      $("#inventory-modal")?.close();
      await refreshAll();
      notify("Estoque ajustado.");
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
      if (state.isCreatingNewTabInOrder) {
        const newKind = formData.get("newTabKind") || "tab";
        const newLabel = String(formData.get("newTabLabel") || "").trim();
        if (!newLabel) {
          throw new Error("Informe o identificador da nova comanda/mesa");
        }
        const createdTab = await api("/tabs", {
          method: "POST",
          body: JSON.stringify({
            kind: newKind,
            label: newLabel,
            customerName: formData.get("customerName") || ""
          })
        });
        state.activeTabId = createdTab.id;
        state.isCreatingNewTabInOrder = false;
      }

      if (state.activeTabId) {
        await api(`/tabs/${state.activeTabId}/rounds`, {
          method: "POST",
          headers: { "Idempotency-Key": state.orderAttempt.key },
          body: JSON.stringify(payload)
        });
      } else {
        const orderData = await api("/orders", {
          method: "POST",
          headers: { "Idempotency-Key": state.orderAttempt.key },
          body: JSON.stringify(payload)
        });
        if (orderData && orderData.id) printOrderTicket(orderData);
      }
      state.orderItems = [];
      state.orderAttempt = null;
      state.activeTabId = null;
      state.isCreatingNewTabInOrder = false;
      form.reset();
      const cashInput = $("#cash-received");
      if (cashInput) cashInput.value = "";
      syncCashChange();
      const newFields = $("#new-tab-fields");
      if (newFields) newFields.hidden = true;
      const newLabelInput = $("#new-tab-label");
      if (newLabelInput) newLabelInput.required = false;
      $("#order-modal")?.close();
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
