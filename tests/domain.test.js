import test from "node:test";
import assert from "node:assert/strict";
import {
  buildKitchenTicket,
  closeCashShift,
  createCashShift,
  createOrder,
  transitionOrder
} from "../packages/domain/index.js";

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
