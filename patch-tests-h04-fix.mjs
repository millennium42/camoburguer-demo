import fs from 'fs';

let content = fs.readFileSync('tests/integrations.test.js', 'utf8');

content = content.replace(
  'test("H-04 iFood: offline misto preserva parcelas originais e emite paymentMethod mixed", () => {\n  const ifoodMock = {\n    payments: {\n      methods: [\n        { method: "CASH", type: "OFFLINE", value: 20 },\n        { method: "CREDIT", type: "OFFLINE", value: 30 }\n      ]\n    }\n  };\n  const adapter = createIFoodAdapter({ ifood: { merchantId: "123" } }, {});\n  // We can test ifoodPaymentConfig directly or through the adapter? \n  // We don't export ifoodPaymentConfig. Let's just mock ingestExternalOrder or just test finance logic.\n});',
  `test("H-04 Ingestion: aceita e salva externalPayments com paymentMethod mixed na metadata de orders", async () => {
  let insertedOrder;
  const executor = {
    async query(sql, params) {
      if (sql.includes("SELECT 1 FROM channel_mappings")) return { rows: [] };
      if (sql.includes("INSERT INTO channel_mappings")) return { rows: [] };
      return { rows: [] };
    }
  };
  const db = {
    async insertOrder(order) {
      insertedOrder = order;
      return order;
    }
  };
  
  await ingestExternalOrder({
    source: "ifood",
    externalMerchantId: "merchant-mixed",
    externalOrderId: "external-mixed",
    externalStatus: "PLACED",
    customerName: "Cliente Misto",
    fulfillmentMode: "pickup",
    items: [{ id: "line-2", name: "Item", quantity: 1, price: 50 }],
    paymentMethod: "mixed",
    externalPayments: [
      { method: "cash", type: "offline", amount: 20 },
      { method: "credit_card", type: "offline", amount: 30 }
    ]
  }, executor, db);
  
  assert.equal(insertedOrder.paymentMethod, "mixed");
  assert.equal(insertedOrder.metadata.externalPayments.length, 2);
  assert.equal(insertedOrder.metadata.externalPayments[0].method, "cash");
});`
);

fs.writeFileSync('tests/integrations.test.js', content);
