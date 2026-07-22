import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  addOrAccumulateItem,
  calculateOrderPreviewTotal,
  catalogItemPayload,
  escapeHtml,
  nextOrderAttempt,
  reconcileCartItems,
  resolveActiveCatalogCategory,
  sameCatalogAdminSession,
  setItemDiscount,
  setItemQuantity
} from "../apps/ops-web/main.js";

test("carrinho acumula itens e permite alterar quantidade", () => {
  const items = [];
  const burger = { sku: "burger", name: "Burger", price: 20 };
  addOrAccumulateItem(items, burger, 1, "sem cebola", 10);
  addOrAccumulateItem(items, burger, 2, "sem cebola", 10);
  addOrAccumulateItem(items, burger, 1, "bem passado");
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 3);
  assert.equal(items[0].discountPercent, 10);
  setItemQuantity(items, 0, 5);
  assert.equal(items[0].quantity, 5);
  setItemDiscount(items, 0, 10);
  setItemDiscount(items, 0, 101);
  assert.equal(items[0].discountPercent, 10);
  assert.equal(calculateOrderPreviewTotal(items, 20), 88);
});

test("tentativa idempotente mantém a chave até o pedido mudar", () => {
  let sequence = 0;
  const makeKey = () => `key-${++sequence}`;
  const payload = { fulfillmentMode: "local", items: [{ sku: "burger", quantity: 1 }] };
  const first = nextOrderAttempt(null, payload, makeKey);
  const retry = nextOrderAttempt(first, structuredClone(payload), makeKey);
  const changed = nextOrderAttempt(retry, { ...payload, customerName: "Ana" }, makeKey);
  assert.equal(retry.key, first.key);
  assert.notEqual(changed.key, first.key);
});

test("UI expõe somente as modalidades válidas e não identifica operador", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../apps/ops-web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../apps/ops-web/main.js", import.meta.url), "utf8")
  ]);
  const modes = html.match(/<select id="fulfillment-mode"[\s\S]*?<\/select>/)?.[0] || "";
  assert.deepEqual(
    [...modes.matchAll(/<option value="([^"]+)"[^>]*>([^<]+)<\/option>/g)].map((match) => [match[1], match[2]]),
    [["delivery", "🛵 Delivery"], ["pickup", "🛍️ Retirada"], ["local", "🍽️ Local"]]
  );
  assert.match(html, /id="delivery-address-field" hidden/);
  assert.match(html, /id="config-discount"[^>]*min="0"[^>]*max="100"/);
  assert.match(html, /name="discountPercent"[^>]*min="0"[^>]*max="100"/);
  assert.match(script, /<input type=\"number\" min=\"0\" max=\"100\"[^>]*data-item-discount=/);
  assert.match(html, /<dialog id="adjustment-dialog"/);
  assert.doesNotMatch(`${html}\n${script}`, /operatorName|Identificação do operador/i);
  assert.equal(escapeHtml('<b class="x">'), "&lt;b class=&quot;x&quot;&gt;");
});

test("UI agrupa o catálogo e sinaliza produto esgotado", async () => {
  const script = await readFile(new URL("../apps/ops-web/main.js", import.meta.url), "utf8");
  assert.match(script, /data-catalog-tab/);
  assert.match(script, /sellable \? "" : "disabled"/);
  assert.match(script, /"Pausado"/);
  assert.match(script, /"Sem estoque"/);
});

test("gestão do cardápio mantém segredo em memória e monta o contrato completo", async () => {
  const [html, script, styles] = await Promise.all([
    readFile(new URL("../apps/ops-web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../apps/ops-web/main.js", import.meta.url), "utf8"),
    readFile(new URL("../apps/ops-web/styles.css", import.meta.url), "utf8")
  ]);
  const data = new FormData();
  data.set("sku", " Bala-Nova ");
  data.set("name", "Bala nova");
  data.set("category", "Bomboniere");
  data.set("price", "2.50");
  data.set("preparationMode", "direct_handoff");
  data.set("allowsAddons", "on");
  const payload = catalogItemPayload(data);
  assert.deepEqual(payload, {
    sku: "bala-nova",
    name: "Bala nova",
    category: "Bomboniere",
    price: 2.5,
    description: "",
    stockCategory: null,
    allowsAddons: true,
    preparationMode: "direct_handoff",
    available: false
  });
  assert.match(html, /id="catalog-admin-dialog"/);
  assert.match(html, /name="preparationMode"/);
  assert.match(html, /value="direct_handoff"/);
  assert.match(html, /id="catalog-archive-confirm"/);
  assert.match(script, /catalogAdminToken: ""/);
  assert.match(script, /authorization: `Bearer \$\{session\.token\}`/);
  assert.match(script, /\/catalog\?includeArchived=true/);
  assert.match(script, /method: "DELETE"/);
  assert.match(script, /body: JSON\.stringify\(\{ available: !item\.available \}\)/);
  assert.match(script, /headers: \{ "if-match": item\.updatedAt \}/);
  assert.match(script, /if \(dialog\?\.open\) auth\?\.elements\.token\.focus\(\)/);
  assert.match(script, /currentOpener\?\.focus\(\)/);
  assert.match(script, /hasUnavailableCartItems\(\)/);
  assert.match(script, /catalogAdminSessionIsCurrent\(session\)/);
  assert.match(script, /error\.catalogAdminSessionInvalidated = true/);
  assert.match(script, /session\.generation === state\.catalogAdminGeneration/);
  assert.match(script, /'#catalog-admin-auth \[type="submit"\]'/);
  assert.doesNotMatch(script, /localStorage|sessionStorage|document\.cookie/);
  assert.match(styles, /#catalog-admin-dialog \{ width: min\(960px, calc\(100% - 16px\)\)/);
  assert.match(styles, /\.catalog-admin-layout, \.catalog-admin-form-grid \{ grid-template-columns: 1fr; \}/);
});

test("atualiza snapshots ativos do carrinho e bloqueia itens pausados ou arquivados", () => {
  const cart = [{ sku: "bala", name: "Bala antiga", price: 2, quantity: 2, notes: "preservar" }];
  const updated = reconcileCartItems(cart, [{
    sku: "bala",
    name: "Bala nova",
    category: "Bomboniere",
    price: 3,
    available: true,
    preparationMode: "direct_handoff",
    stockCategory: null,
    allowsAddons: false
  }]);
  assert.equal(updated[0].name, "Bala nova");
  assert.equal(updated[0].price, 3);
  assert.equal(updated[0].quantity, 2);
  assert.equal(updated[0].notes, "preservar");
  assert.equal(updated[0].catalogUnavailable, false);

  const paused = reconcileCartItems(updated, [{
    sku: "bala", name: "Bala pausada", category: "Bomboniere", price: 4,
    available: false, allowsAddons: false, preparationMode: "direct_handoff", stockCategory: null
  }]);
  assert.equal(paused[0].catalogUnavailable, true);
  assert.equal(paused[0].name, "Bala pausada");
  assert.equal(paused[0].price, 4);
  const archived = reconcileCartItems(updated, [])[0];
  assert.equal(archived.catalogUnavailable, true);
  assert.equal(archived.name, "Bala nova");

  const withAddon = [{ ...cart[0], addons: [{ sku: "ovo", name: "Ovo", price: 3 }] }];
  const addonsDisabled = reconcileCartItems(withAddon, [{
    sku: "bala", name: "Bala", category: "Bomboniere", price: 2,
    available: true, allowsAddons: false, preparationMode: "kitchen", stockCategory: null
  }]);
  assert.equal(addonsDisabled[0].catalogUnavailable, true);
  assert.equal(addonsDisabled[0].catalogIssue, "addons_disabled");
  assert.equal(addonsDisabled[0].addons.length, 1);
});

test("descarta respostas administrativas antigas e recupera categoria ativa removida", () => {
  const oldSession = { generation: 1, token: "token-a" };
  assert.equal(sameCatalogAdminSession(oldSession, { generation: 1, token: "token-a" }), true);
  assert.equal(sameCatalogAdminSession(oldSession, { generation: 2, token: "token-a" }), false);
  assert.equal(sameCatalogAdminSession(oldSession, { generation: 1, token: "token-b" }), false);
  assert.equal(resolveActiveCatalogCategory("Bebidas", [{ category: "Lanches" }]), "Lanches");
  assert.equal(resolveActiveCatalogCategory("Bebidas", [{ category: "Bebidas" }, { category: "Lanches" }]), "Bebidas");
  assert.equal(resolveActiveCatalogCategory("Bebidas", []), null);
});

test("carrinho separa combinações de adicionais e soma seus preços", () => {
  const items = [];
  const selected = { sku: "x", name: "X", price: 20 };
  addOrAccumulateItem(items, selected, 2, "", 0, [{ sku: "ovo", name: "Ovo", price: 3 }]);
  addOrAccumulateItem(items, selected, 1, "", 0, [{ sku: "bacon", name: "Bacon", price: 10 }]);
  assert.equal(items.length, 2);
  assert.equal(calculateOrderPreviewTotal(items), 76);
});

test("UI contém o painel e os controles nativos de adicionais", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../apps/ops-web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../apps/ops-web/main.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="config-addons-field"/);
  assert.match(html, /id="config-addons"/);
  assert.match(script, /type=\"checkbox\" name=\"config-addon\"/);
  assert.match(script, /field\.hidden = !item\.allowsAddons/);
});

test("UI expõe comandas e reutiliza o formulário de pedidos", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../apps/ops-web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../apps/ops-web/main.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /data-tab="comandas"/);
  assert.match(html, /id="tab-form"/);
  assert.match(html, /id="active-tab-banner"/);
  assert.match(script, /\/tabs\?status=open/);
  assert.match(script, /`\/tabs\/\$\{state\.activeTabId\}\/rounds`/);
  assert.match(script, /\$\("#order-modal"\)\?\.showModal\(\)/);
});

test("UI corrige rodada enviada por diálogo e endpoint de cancelamento", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../apps/ops-web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../apps/ops-web/main.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="cancellation-dialog"/);
  assert.match(script, /data-cancel-item=/);
  assert.match(script, /\/cancellations`/);
  assert.match(script, /CANCELAMENTO/);
});

test("UI expõe estoque, ajustes e indisponibilidade no cardápio", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../apps/ops-web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../apps/ops-web/main.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /data-tab="estoque"/);
  assert.match(html, /id="inventory-form"/);
  assert.match(script, /api\("\/inventory"\)/);
  assert.match(script, /"Sem estoque"/);
  assert.match(script, /\/inventory\/\$\{data\.get\("category"\)\}\/adjustments/);
});

test("UI permite parcelas, estorno e encerramento somente com saldo zerado", async () => {
  const script = await readFile(new URL("../apps/ops-web/main.js", import.meta.url), "utf8");
  assert.match(script, /data-payment-form/);
  assert.match(script, /amountCents: Math\.round/);
  assert.match(script, /\/tabs\/\$\{payload\.tabId\}\/payments/);
  assert.match(script, /payments\/\$\{payload\.paymentId\}\/reversals/);
  assert.match(script, /tab\.balanceCents === 0/);
  assert.match(script, /data-close-tab/);
  assert.match(script, /paymentLabels\[tab\.paymentMethod\]/);
});

test("financeiro expõe retirada e aplica o mesmo filtro a cards e listagem", async () => {
  const html = await readFile(new URL("../apps/ops-web/index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../apps/ops-web/main.js", import.meta.url), "utf8");
  assert.match(html, /id="finance-filter-form"/);
  assert.match(html, /name="paymentMethod"/);
  assert.match(html, /Retirada \(sangria\)/);
  assert.match(html, /id="clear-finance-filters"/);
  assert.match(script, /api\(`\/finance\/summary\$\{financeQuery\}`\)/);
  assert.match(script, /api\(`\/finance\/entries\$\{financeQuery\}`\)/);
  assert.match(script, /financeFilters: \{ paymentMethod: "", type: "" \}/);
  assert.match(script, /cash_withdrawal: "Retirada \(sangria\)"/);
});

test("layout estreito contém formulário, adicionais e navegação no viewport", async () => {
  const styles = await readFile(new URL("../apps/ops-web/styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.grid > \*, \.stack > \*, fieldset, label \{ min-width: 0; \}/);
  assert.match(styles, /input, select \{ width: 100%; max-width: 100%; min-width: 0; \}/);
  assert.match(styles, /\.tab-bar \{ display: inline-flex; gap: 8px;/);
  assert.match(styles, /\.tab-button \{\s*border: 0;/);
  assert.match(styles, /\.addon-grid \{ display: grid; grid-template-columns: repeat\(auto-fit, minmax\(150px, 1fr\)\); gap: 12px; \}/);
});
