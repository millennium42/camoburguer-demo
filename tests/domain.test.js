import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  ADD_ONS,
  CATALOG,
  CATALOG_CAPTURED_AT,
  CATALOG_SOURCE_URL,
  buildKitchenTicket,
  closeCashShift,
  createCancellationOrder,
  createCashShift,
  createOrder,
  transitionOrder
} from "../packages/domain/index.js";

test("catálogo reflete o snapshot OlaClick de 2026-07-16", () => {
  assert.equal(CATALOG_CAPTURED_AT, "2026-07-16");
  assert.equal(CATALOG_SOURCE_URL, "https://cam-buger.ola.click/products");
  assert.equal(CATALOG.length, 51);
  assert.equal(CATALOG.filter((item) => item.available).length, 50);
  assert.deepEqual(
    CATALOG.find((item) => item.sku === "01-camobuger"),
    { sku: "01-camobuger", name: "01 CAMOBUGER + BATATA FRITA", category: "Lanches", price: 35, description: "", stockCategory: "hamburguer", allowsAddons: true, available: true }
  );
  assert.equal(CATALOG.find((item) => item.sku === "produto-19").available, false);
  assert.equal(createHash("sha256").update(JSON.stringify(CATALOG)).digest("hex"), "f705b8c8902127b9478031d07930d9fa46945e953c6f3ef32a4ef3f2a2b3a896");
});

test("adicionais são validados, congelados, cobrados e impressos", () => {
  assert.equal(ADD_ONS.length, 17);
  assert.equal(createHash("sha256").update(JSON.stringify(ADD_ONS)).digest("hex"), "afe6dea4b937740032955ff37893d714e8eea8ac5a84c80787ea6c87b4e7587d");
  const order = createOrder({
    discountPercent: 10,
    items: [{
      sku: "x-simples",
      name: "X-SIMPLES",
      quantity: 2,
      price: 20,
      discountPercent: 10,
      addons: [{ sku: "ovo" }, { sku: "mucarela" }]
    }]
  });
  assert.equal(order.total, 43.74);
  assert.deepEqual(order.items[0].addons, [
    { sku: "ovo", name: "Ovo", price: 3, quantity: 1 },
    { sku: "mucarela", name: "Muçarela", price: 4, quantity: 1 }
  ]);
  assert.match(buildKitchenTicket(order), /\+ Ovo[\s\S]*\+ Muçarela/);
  assert.throws(() => createOrder({ items: [{ sku: "refrigerante-lata", name: "Refri", price: 6, addons: [{ sku: "ovo" }] }] }), /não aceita/);
  assert.throws(() => createOrder({ items: [{ sku: "x-simples", name: "X", price: 24, addons: [{ sku: "ovo" }, { sku: "ovo" }] }] }), /duplicado/);
});

test("pedido rejeita produto marcado como indisponível", () => {
  assert.throws(() => createOrder({
    items: [{ sku: "produto-19", name: "Produto 19", quantity: 1, price: 10 }]
  }), /indisponível/);
});

test("pedido calcula total e gera ticket simples", () => {
  const order = createOrder({
    source: "counter",
    customerName: "Milla",
    paymentMethod: "pix",
    items: [
      { name: "Xis Salada", quantity: 2, price: 10 },
      { name: "Batata", quantity: 1, price: 5 }
    ]
  });

  assert.equal(order.total, 25);
  assert.equal(order.discountPercent, 0);
  assert.equal(order.fulfillmentMode, "local");
  assert.equal("operatorName" in order, false);
  const ticket = buildKitchenTicket(order);
  assert.match(ticket, /Cliente: Milla/);
  assert.match(ticket, /Horário: \d{2}:\d{2}/);
});

test("pedido vinculado à comanda preserva rodada e IDs das linhas", () => {
  const order = createOrder({
    tabId: "tab-1",
    roundNumber: 2,
    metadata: { tabLabel: "Mesa 4" },
    items: [{ name: "X", quantity: 1, price: 20 }]
  });
  assert.equal(order.tabId, "tab-1");
  assert.equal(order.roundNumber, 2);
  assert.ok(order.items[0].id);
  assert.match(buildKitchenTicket(order), /Comanda: Mesa 4[\s\S]*Rodada: 2/);
});

test("cancelamento cria rodada negativa e ticket corretivo sem alterar o original", () => {
  const originalItem = { id: "line-1", sku: "x-simples", name: "X-SIMPLES", quantity: 2, price: 24 };
  const cancellation = createCancellationOrder({
    tabId: "tab-1",
    roundNumber: 2,
    reversesOrderId: "order-original",
    items: [{ ...originalItem, id: undefined, reversesItemId: originalItem.id, quantity: 1 }]
  });
  assert.equal(cancellation.roundKind, "cancellation");
  assert.equal(cancellation.total, -24);
  assert.equal(cancellation.items[0].reversesItemId, "line-1");
  assert.equal(originalItem.quantity, 2);
  assert.match(buildKitchenTicket(cancellation), /CANCELAMENTO \/ RETIRAR[\s\S]*Corrige pedido/);
});

test("pedido aplica desconto por item antes do desconto geral e valida os limites", () => {
  const order = createOrder({
    discountPercent: 20,
    items: [
      { name: "Burger", quantity: 2, price: 10, discountPercent: 10 },
      { name: "Batata", quantity: 1, price: 5, discountPercent: 0 }
    ]
  });

  assert.equal(order.items[0].discountPercent, 10);
  assert.equal(order.discountPercent, 20);
  assert.equal(order.total, 18.4);
  assert.equal(createOrder({ discountPercent: 100, items: [{ name: "Cortesia", price: 10 }] }).total, 0);
  assert.throws(
    () => createOrder({ discountPercent: 100.01, items: [{ name: "Burger", price: 10 }] }),
    /Desconto do pedido/
  );
  assert.throws(
    () => createOrder({ items: [{ name: "Burger", price: 10, discountPercent: -0.01 }] }),
    /Desconto do item/
  );
});

test("delivery exige endereço e preserva o horário informado", () => {
  const createdAt = "2026-07-14T12:34:56.000Z";
  assert.throws(
    () => createOrder({ fulfillmentMode: "delivery", items: [{ name: "Burger", price: 30 }] }),
    /Endereço/
  );
  const order = createOrder({
    fulfillmentMode: "delivery",
    deliveryAddress: "Rua A, 10",
    createdAt,
    items: [{ name: "Burger", price: 30 }]
  });
  assert.equal(order.deliveryAddress, "Rua A, 10");
  assert.equal(order.createdAt, createdAt);
  assert.match(buildKitchenTicket(order), /Endereço: Rua A, 10/);
});

test("transição de pedido respeita fluxo", () => {
  const order = createOrder({
    source: "counter",
    paymentMethod: "cash",
    items: [{ name: "Burger", quantity: 1, price: 30 }]
  });

  const confirmed = transitionOrder(order, "confirmed");
  const cooking = transitionOrder(confirmed, "in_preparation");
  assert.equal(cooking.status, "in_preparation");
  assert.throws(() => transitionOrder(order, "ready"));
});

test("fechamento de caixa calcula diferença", () => {
  const shift = createCashShift({ openingAmount: 50 });
  assert.equal(shift.expectedAmount, 50);
  const closed = closeCashShift(shift, 45);
  assert.equal(closed.status, "closed");
  assert.equal(closed.differenceAmount, -5);
  assert.throws(() => closeCashShift(closed, 45), /aberto/);
});
