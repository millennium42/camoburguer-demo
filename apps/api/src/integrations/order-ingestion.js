import { randomUUID } from "crypto";
import { createOrder } from "@camoburguer/domain";
import { lockCatalogItems } from "../catalog-repository.js";
import { findChannelMapping, insertChannelMapping } from "./integration-repository.js";


export async function ingestExternalOrder(input, executor, db) {
  const externalMerchantId = String(input.externalMerchantId || "").trim();
  const externalOrderId = String(input.externalOrderId || "").trim();
  if (!externalMerchantId || !externalOrderId) {
    throw new Error("Pedido externo exige merchantId e orderId");
  }
  const mapping = await findChannelMapping({
    channel: input.source,
    merchantId: externalMerchantId,
    externalId: externalOrderId
  }, executor);

  if (mapping) {
    return {
      repeated: true,
      orderId: mapping.orderId
    };
  }

  const idempotencyKey = [input.source, externalMerchantId, externalOrderId].join(":");
  const catalog = await lockCatalogItems(input.items, executor, { includeArchived: true });
  const order = createOrder({
    id: randomUUID(),
    source: input.source,
    fulfillmentMode: input.fulfillmentMode,
    customerName: input.customerName,
    deliveryAddress: input.deliveryAddress || null,
    discountPercent: input.discountPercent ?? 0,
    paymentMethod: input.paymentMethod || "payment_reconciliation_required",
    items: input.items || [],
    idempotencyKey,
    createdAt: input.createdAt,
    metadata: {
      ...(input.metadata || {}),
      externalMerchantId,
      externalOrderId,
      externalPayments: input.externalPayments || []
    }
  }, {
    allowCustomItems: true,
    catalog,
    useCatalogCommercialSnapshot: false,
    validateCatalogAvailability: false
  });

  let savedOrder;
  await executor.query("SAVEPOINT before_insert_order");
  try {
    savedOrder = await db.insertOrder(order, executor);
    await insertChannelMapping({
      id: randomUUID(),
      orderId: savedOrder.id,
      channel: input.source,
      merchantId: externalMerchantId,
      externalId: externalOrderId,
      externalStatus: input.externalStatus,
      syncStatus: "synchronized",
      metadata: input.metadata || {}
    }, executor);
    await executor.query("RELEASE SAVEPOINT before_insert_order");
  } catch (error) {
    await executor.query("ROLLBACK TO SAVEPOINT before_insert_order");
    if (error.code === '23505') {
      const concurrentMapping = await findChannelMapping({
        channel: input.source,
        merchantId: externalMerchantId,
        externalId: externalOrderId
      }, executor);
      
      if (concurrentMapping) {
        return {
          repeated: true,
          orderId: concurrentMapping.orderId
        };
      }
    }
    throw error;
  }

  return {
    repeated: false,
    orderId: savedOrder.id,
    order: savedOrder
  };
}
