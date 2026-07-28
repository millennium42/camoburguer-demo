import fs from 'fs';

// 1. Patch ifood.js
let ifood = fs.readFileSync('apps/api/src/integrations/providers/ifood.js', 'utf8');

ifood = ifood.replace(
  'function ifoodPaymentMethod(orderDetails) {\n  const methods = orderDetails.payments?.methods || [];\n  const offline = methods.filter((method) => String(method.type || "").trim().toUpperCase() === "OFFLINE");\n  if (!offline.length) return "app_paid";\n  if (offline.length !== 1) return "app_paid";\n  return {\n    CASH: "cash",\n    PIX: "pix",\n    CREDIT: "credit_card",\n    DEBIT: "debit_card"\n  }[String(offline[0].method || "").trim().toUpperCase()] || "app_paid";\n}',
  `function extractIFoodPayments(orderDetails) {
  const methods = orderDetails.payments?.methods || [];
  return methods.map(m => {
    const rawType = String(m.type || "").trim().toUpperCase();
    const type = rawType === "OFFLINE" ? "offline" : "online";
    let method = "unattributed";
    if (type === "online") method = "app_paid";
    else {
      method = {
        CASH: "cash",
        PIX: "pix",
        CREDIT: "credit_card",
        DEBIT: "debit_card"
      }[String(m.method || "").trim().toUpperCase()] || "unattributed";
    }
    return { method, type, amount: Number(m.value || 0) };
  });
}

function ifoodPaymentConfig(orderDetails) {
  const extracted = extractIFoodPayments(orderDetails);
  if (extracted.length === 0) return { paymentMethod: "payment_reconciliation_required", externalPayments: [] };
  
  const offline = extracted.filter(m => m.type === "offline");
  if (offline.length === 0) return { paymentMethod: "app_paid", externalPayments: extracted };
  if (offline.length === 1 && extracted.length === 1) return { paymentMethod: offline[0].method, externalPayments: extracted };
  
  return { paymentMethod: "mixed", externalPayments: extracted };
}`
);

ifood = ifood.replace(
  '        paymentMethod: ifoodPaymentMethod(orderDetails),\n        items: (orderDetails.items || []).map(mapIFoodOrderItem),\n        metadata: {\n          externalPayments: orderDetails.payments || null\n        }',
  `        ...ifoodPaymentConfig(orderDetails),
        items: (orderDetails.items || []).map(mapIFoodOrderItem),
        metadata: {
          rawIFoodPayments: orderDetails.payments || null
        }`
);

fs.writeFileSync('apps/api/src/integrations/providers/ifood.js', ifood);

// 2. Patch deliverymuch.js
let dm = fs.readFileSync('apps/api/src/integrations/providers/deliverymuch.js', 'utf8');
// DM has no payments array, so we must flag it.
dm = dm.replace(
  '          items: (externalOrder.items || []).map(mapDeliveryMuchOrderItem),\n          metadata: {\n            deliveryMuchOrder: externalOrder,\n            syncPayloadFingerprint: payloadFingerprint\n          }',
  `          items: (externalOrder.items || []).map(mapDeliveryMuchOrderItem),
          paymentMethod: "payment_reconciliation_required",
          externalPayments: [],
          metadata: {
            deliveryMuchOrder: externalOrder,
            syncPayloadFingerprint: payloadFingerprint
          }`
);
fs.writeFileSync('apps/api/src/integrations/providers/deliverymuch.js', dm);

// 3. Patch order-ingestion.js
let ingestion = fs.readFileSync('apps/api/src/integrations/order-ingestion.js', 'utf8');
ingestion = ingestion.replace(
  '    paymentMethod: input.paymentMethod || "app_paid",\n    items: input.items || [],\n    idempotencyKey,\n    createdAt: input.createdAt,\n    metadata: {\n      ...(input.metadata || {}),\n      externalMerchantId,\n      externalOrderId\n    }',
  `    paymentMethod: input.paymentMethod || "payment_reconciliation_required",
    items: input.items || [],
    idempotencyKey,
    createdAt: input.createdAt,
    metadata: {
      ...(input.metadata || {}),
      externalMerchantId,
      externalOrderId,
      externalPayments: input.externalPayments || []
    }`
);
fs.writeFileSync('apps/api/src/integrations/order-ingestion.js', ingestion);

// 4. Patch finance-core/index.js
let finance = fs.readFileSync('packages/finance-core/index.js', 'utf8');
finance = finance.replace(
  '    if (["sale", "cancellation"].includes(entry.type)) {\n      const method = entry.paymentMethod || "unattributed";\n      paymentsByMethod[method] = toMoney(\n        (paymentsByMethod[method] || 0) + Number(entry.amount)\n      );\n    }',
  `    if (["sale", "cancellation"].includes(entry.type)) {
      if (entry.metadata?.externalPayments?.length > 0) {
        for (const ext of entry.metadata.externalPayments) {
          const amt = entry.type === "sale" ? Number(ext.amount) : -Number(ext.amount);
          const m = ext.type === "online" ? "app_paid" : (ext.method || "unattributed");
          paymentsByMethod[m] = toMoney((paymentsByMethod[m] || 0) + amt);
        }
      } else {
        const method = entry.paymentMethod || "unattributed";
        paymentsByMethod[method] = toMoney(
          (paymentsByMethod[method] || 0) + Number(entry.amount)
        );
      }
    }`
);

// We should also patch buildEntriesFromOrder so it inherits the metadata correctly.
// buildEntriesFromOrder doesn't copy order.metadata to entry.metadata, except customerName
finance = finance.replace(
  '        metadata: { customerName: order.customerName }',
  '        metadata: { customerName: order.customerName, externalPayments: order.metadata?.externalPayments || [] }'
);
finance = finance.replace(
  '        metadata: { customerName: order.customerName }', // replace second occurrence (cancellation)
  '        metadata: { customerName: order.customerName, externalPayments: order.metadata?.externalPayments || [] }'
);

fs.writeFileSync('packages/finance-core/index.js', finance);
