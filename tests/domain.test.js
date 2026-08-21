import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  ADD_ONS,
  buildKitchenTicket,
  CATALOG,
  CATALOG_CAPTURED_AT,
  CATALOG_SOURCE_URL,
  calculateStockRequirements,
  closeCashShift,
  confirmOrder,
  createCancellationOrder,
  createCashShift,
  createOrder,
  requiresKitchenPreparation,
  transitionOrder,
} from "../packages/domain/index.js";

test("catálogo reflete o snapshot OlaClick de 2026-07-16", () => {
  assert.equal(CATALOG_CAPTURED_AT, "2026-07-16");
  assert.equal(CATALOG_SOURCE_URL, "https://cam-buger.ola.click/products");
  assert.equal(CATALOG.length, 51);
  assert.equal(CATALOG.filter((item) => item.available).length, 50);
  assert.deepEqual(
    CATALOG.find((item) => item.sku === "01-camobuger"),
    {
      sku: "01-camobuger",
      name: "01 CAMOBUGER + BATATA FRITA",
      category: "Lanches",
      price: 35,
      description: "",
      stockCategory: "hamburguer",
      allowsAddons: true,
      preparationMode: "kitchen",
      available: true,
    },
  );
  assert.equal(CATALOG.find((item) => item.sku === "produto-19").available, false);
  assert.equal(
    createHash("sha256").update(JSON.stringify(CATALOG)).digest("hex"),
    "295952c490b1fa91c6a24c2b6ba55801d03740b5d2d343f250d7d555d568ea9e",
  );
});

test("necessidade de estoque agrega somente Xis, Dog e Hambúrguer", () => {
  assert.deepEqual(
    calculateStockRequirements([
      { sku: "x-simples", quantity: 2 },
      { sku: "dog-frango", quantity: 3 },
      { sku: "01-camobuger", quantity: 1 },
      { sku: "refrigerante-lata", quantity: 9 },
    ]),
    { xis: 2, dog: 3, hamburguer: 1 },
  );
  assert.throws(() => calculateStockRequirements([{ sku: "x-simples", quantity: 1.5 }]), /inteira/);
});

test("estoque usa a classificação congelada na linha e preserva fallback legado", () => {
  assert.deepEqual(
    calculateStockRequirements([
      { sku: "sku-operacional", stockCategory: "dog", quantity: 2 },
      { sku: "x-simples", quantity: 1 },
    ]),
    { dog: 2, xis: 1 },
  );
  assert.deepEqual(
    calculateStockRequirements([{ sku: "x-simples", stockCategory: null, quantity: 3 }]),
    {},
  );
});

test("adicionais são validados, congelados, cobrados e impressos", () => {
  assert.equal(ADD_ONS.length, 17);
  assert.equal(
    createHash("sha256").update(JSON.stringify(ADD_ONS)).digest("hex"),
    "afe6dea4b937740032955ff37893d714e8eea8ac5a84c80787ea6c87b4e7587d",
  );
  const order = createOrder(
    {
      discountPercent: 10,
      items: [
        {
          sku: "x-simples",
          name: "X-SIMPLES",
          quantity: 2,
          price: 20,
          discountPercent: 10,
          addons: [{ sku: "ovo" }, { sku: "mucarela" }],
        },
      ],
    },
    { allowCustomItems: true },
  );
  assert.equal(order.total, 50.22);
  assert.equal(order.items[0].name, "X-SIMPLES");
  assert.equal(order.items[0].price, 24);
  assert.deepEqual(order.items[0].addons, [
    { sku: "ovo", name: "Ovo", price: 3, quantity: 1 },
    { sku: "mucarela", name: "Muçarela", price: 4, quantity: 1 },
  ]);
  assert.match(buildKitchenTicket(order), /\+ Ovo[\s\S]*\+ Muçarela/);
  assert.throws(
    () =>
      createOrder({
        items: [{ sku: "refrigerante-lata", name: "Refri", price: 6, addons: [{ sku: "ovo" }] }],
      }),
    /não aceita/,
  );
  assert.throws(
    () =>
      createOrder({
        items: [
          { sku: "x-simples", name: "X", price: 24, addons: [{ sku: "ovo" }, { sku: "ovo" }] },
        ],
      }),
    /duplicado/,
  );
  assert.throws(
    () =>
      createOrder(
        { items: [{ name: "Item fracionado", price: 10, quantity: 1.5 }] },
        { allowCustomItems: true },
      ),
    /inválido/,
  );
});

test("pedido rejeita produto marcado como indisponível", () => {
  assert.throws(
    () =>
      createOrder({
        items: [{ sku: "produto-19", name: "Produto 19", quantity: 1, price: 10 }],
      }),
    /indisponível/,
  );
});

test("pedido manual rejeita SKU fora do catálogo operacional", () => {
  assert.throws(
    () =>
      createOrder({
        items: [{ sku: "desconhecido", name: "Livre", quantity: 1, price: 10 }],
      }),
    /não encontrado/,
  );
  assert.throws(
    () =>
      createOrder(
        {
          items: [{ name: "Livre", quantity: 1, price: 10, preparationMode: "outro" }],
        },
        { allowCustomItems: true },
      ),
    /Modo de preparo/,
  );
  assert.throws(
    () =>
      createOrder(
        {
          items: [{ name: "Livre", quantity: 1, price: 10, stockCategory: "bebida" }],
        },
        { allowCustomItems: true },
      ),
    /Categoria de estoque/,
  );
  assert.throws(
    () =>
      createOrder({
        items: [{ name: "Sem SKU", quantity: 1, price: 10 }],
      }),
    /não encontrado/,
  );

  const drink = createOrder({
    items: [{ sku: "refrigerante-lata", quantity: 1, stockCategory: "dog" }],
  });
  assert.equal(drink.items[0].stockCategory, null);
});

test("ticket separa preparo e entrega direta e pedido somente direto nasce pronto", () => {
  const mixed = createOrder({
    items: [
      { sku: "x-simples", quantity: 1 },
      { sku: "refrigerante-lata", quantity: 1 },
    ],
  });
  assert.equal(requiresKitchenPreparation(mixed.items), true);
  assert.match(
    buildKitchenTicket(mixed),
    /PREPARO COZINHA[\s\S]*X-SIMPLES[\s\S]*ENTREGA DIRETA — NÃO PREPARAR[\s\S]*Refrigerante lata/,
  );

  const direct = confirmOrder(createOrder({ items: [{ sku: "agua-sem-gas", quantity: 1 }] }));
  assert.equal(direct.status, "ready");
  assert.equal(requiresKitchenPreparation(direct.items), false);
  assert.match(buildKitchenTicket(direct), /ENTREGA DIRETA — NÃO PREPARAR/);
});

test("cancelamento de entrega direta não instrui retirada da cozinha", () => {
  const cancellation = createCancellationOrder({
    tabId: "tab-1",
    roundNumber: 2,
    reversesOrderId: "order-original",
    items: [
      {
        sku: "refrigerante-lata",
        name: "Refrigerante lata",
        category: "Refrigerantes",
        stockCategory: null,
        preparationMode: "direct_handoff",
        quantity: 1,
        price: 6,
        addons: [],
      },
    ],
  });
  const ticket = buildKitchenTicket(cancellation);
  assert.equal(confirmOrder(cancellation).status, "ready");
  assert.match(ticket, /CANCELAMENTO \/ ENTREGA DIRETA/);
  assert.match(ticket, /CANCELAR ENTREGA DIRETA — NÃO RETIRAR DA COZINHA/);
});

test("pedido calcula total e gera ticket simples", () => {
  const order = createOrder(
    {
      source: "counter",
      customerName: "Milla",
      paymentMethod: "pix",
      items: [
        { name: "Xis Salada", quantity: 2, price: 10 },
        { name: "Batata", quantity: 1, price: 5 },
      ],
    },
    { allowCustomItems: true },
  );

  assert.equal(order.total, 25);
  assert.equal(order.discountPercent, 0);
  assert.equal(order.fulfillmentMode, "local");
  assert.equal("operatorName" in order, false);
  const ticket = buildKitchenTicket(order);
  assert.match(ticket, /Cliente: Milla/);
  assert.match(ticket, /Horário: \d{2}:\d{2}/);
});

test("pedido vinculado à comanda preserva rodada e IDs das linhas", () => {
  const order = createOrder(
    {
      tabId: "tab-1",
      roundNumber: 2,
      metadata: { tabLabel: "Mesa 4" },
      items: [{ name: "X", quantity: 1, price: 20 }],
    },
    { allowCustomItems: true },
  );
  assert.equal(order.tabId, "tab-1");
  assert.equal(order.roundNumber, 2);
  assert.ok(order.items[0].id);
  assert.match(buildKitchenTicket(order), /Comanda: Mesa 4[\s\S]*Rodada: 2/);
});

test("cancelamento cria rodada negativa e ticket corretivo sem alterar o original", () => {
  const originalItem = {
    id: "line-1",
    sku: "x-simples",
    name: "X-SIMPLES",
    quantity: 2,
    price: 24,
  };
  const cancellation = createCancellationOrder({
    tabId: "tab-1",
    roundNumber: 2,
    reversesOrderId: "order-original",
    items: [{ ...originalItem, id: undefined, reversesItemId: originalItem.id, quantity: 1 }],
  });
  assert.equal(cancellation.roundKind, "cancellation");
  assert.equal(cancellation.total, -24);
  assert.equal(cancellation.items[0].reversesItemId, "line-1");
  assert.equal(cancellation.items[0].stockCategory, "xis");
  assert.equal(cancellation.items[0].preparationMode, "kitchen");
  assert.equal(originalItem.quantity, 2);
  assert.match(buildKitchenTicket(cancellation), /CANCELAMENTO \/ RETIRAR[\s\S]*Corrige pedido/);
});

test("cancelamento legado de bebida recupera somente a classificação do snapshot base", () => {
  const cancellation = createCancellationOrder({
    tabId: "tab-1",
    roundNumber: 2,
    reversesOrderId: "order-original",
    items: [
      {
        id: undefined,
        reversesItemId: "line-drink",
        sku: "refrigerante-lata",
        name: "Nome histórico da bebida",
        quantity: 1,
        price: 5,
        addons: [],
      },
    ],
  });
  assert.equal(cancellation.items[0].name, "Nome histórico da bebida");
  assert.equal(cancellation.items[0].price, 5);
  assert.equal(cancellation.items[0].stockCategory, null);
  assert.equal(cancellation.items[0].preparationMode, "direct_handoff");
  assert.match(buildKitchenTicket(cancellation), /CANCELAMENTO \/ ENTREGA DIRETA/);
});

test("cancelamento preserva classificação e adicionais congelados da linha original", () => {
  const cancellation = createCancellationOrder({
    tabId: "tab-1",
    roundNumber: 3,
    reversesOrderId: "original",
    items: [
      {
        id: undefined,
        reversesItemId: "line-1",
        sku: "x-simples",
        name: "Nome congelado",
        category: "Histórica",
        stockCategory: null,
        preparationMode: "direct_handoff",
        quantity: 1,
        price: 99,
        addons: [{ sku: "ovo", name: "Adicional congelado", price: 8, quantity: 1 }],
      },
    ],
  });
  assert.equal(cancellation.items[0].name, "Nome congelado");
  assert.equal(cancellation.items[0].price, 99);
  assert.equal(cancellation.items[0].stockCategory, null);
  assert.equal(cancellation.items[0].preparationMode, "direct_handoff");
  assert.equal(cancellation.items[0].addons[0].name, "Adicional congelado");
});

test("pedido aplica desconto por item antes do desconto geral e valida os limites", () => {
  const order = createOrder(
    {
      discountPercent: 20,
      items: [
        { name: "Burger", quantity: 2, price: 10, discountPercent: 10 },
        { name: "Batata", quantity: 1, price: 5, discountPercent: 0 },
      ],
    },
    { allowCustomItems: true },
  );

  assert.equal(order.items[0].discountPercent, 10);
  assert.equal(order.discountPercent, 20);
  assert.equal(order.total, 18.4);
  assert.equal(
    createOrder(
      { discountPercent: 100, items: [{ name: "Cortesia", price: 10 }] },
      { allowCustomItems: true },
    ).total,
    0,
  );
  assert.throws(
    () =>
      createOrder(
        { discountPercent: 100.01, items: [{ name: "Burger", price: 10 }] },
        { allowCustomItems: true },
      ),
    /Desconto do pedido/,
  );
  assert.throws(
    () =>
      createOrder(
        { items: [{ name: "Burger", price: 10, discountPercent: -0.01 }] },
        { allowCustomItems: true },
      ),
    /Desconto do item/,
  );
});

test("delivery exige endereço e preserva o horário informado", () => {
  const createdAt = "2026-07-14T12:34:56.000Z";
  assert.throws(
    () =>
      createOrder(
        { fulfillmentMode: "delivery", items: [{ name: "Burger", price: 30 }] },
        { allowCustomItems: true },
      ),
    /Endereço/,
  );
  const order = createOrder(
    {
      fulfillmentMode: "delivery",
      deliveryAddress: "Rua A, 10",
      createdAt,
      items: [{ name: "Burger", price: 30 }],
    },
    { allowCustomItems: true },
  );
  assert.equal(order.deliveryAddress, "Rua A, 10");
  assert.equal(order.createdAt, createdAt);
  assert.match(buildKitchenTicket(order), /Endereço: Rua A, 10/);
});

test("transição de pedido respeita fluxo", () => {
  const order = createOrder(
    {
      source: "counter",
      paymentMethod: "cash",
      items: [{ name: "Burger", quantity: 1, price: 30 }],
    },
    { allowCustomItems: true },
  );

  const confirmed = transitionOrder(order, "confirmed");
  const cooking = transitionOrder(confirmed, "in_preparation");
  assert.equal(cooking.status, "in_preparation");
  assert.throws(() => transitionOrder(order, "ready"));
  assert.throws(() => transitionOrder(confirmed, "ready"));
});

test("fechamento de caixa calcula diferença", () => {
  const shift = createCashShift({ openingAmount: 50 });
  assert.equal(shift.expectedAmount, 50);
  const closed = closeCashShift(shift, 45);
  assert.equal(closed.status, "closed");
  assert.equal(closed.differenceAmount, -5);
  assert.throws(() => closeCashShift(closed, 45), /aberto/);
});
