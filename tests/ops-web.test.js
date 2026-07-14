import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  addOrAccumulateItem,
  escapeHtml,
  nextOrderAttempt,
  setItemQuantity
} from "../apps/ops-web/main.js";

test("carrinho acumula itens e permite alterar quantidade", () => {
  const items = [];
  const burger = { sku: "burger", name: "Burger", price: 20 };
  addOrAccumulateItem(items, burger, 1, "sem cebola");
  addOrAccumulateItem(items, burger, 2, "sem cebola");
  addOrAccumulateItem(items, burger, 1, "bem passado");
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 3);
  setItemQuantity(items, 0, 5);
  assert.equal(items[0].quantity, 5);
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
    [["delivery", "Delivery"], ["pickup", "Retirada"], ["local", "Local"]]
  );
  assert.match(html, /id="delivery-address-field" hidden/);
  assert.match(html, /<dialog id="adjustment-dialog"/);
  assert.doesNotMatch(`${html}\n${script}`, /operatorName|Operador|Admin/i);
  assert.equal(escapeHtml('<b class="x">'), "&lt;b class=&quot;x&quot;&gt;");
});
