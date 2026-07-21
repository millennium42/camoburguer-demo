import { randomUUID } from "crypto";
import { createOrder } from "@camoburguer/domain";
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
  const order = createOrder({
    id: randomUUID(),
    source: input.source,
    fulfillmentMode: input.fulfillmentMode,
    customerName: input.customerName,
    deliveryAddress: input.deliveryAddress || null,
    discountPercent: input.discountPercent ?? 0,
    paymentMethod: input.paymentMethod || "app_paid",
    items: input.items || [],
    idempotencyKey,
    createdAt: input.createdAt,
    metadata: {
      ...(input.metadata || {}),
      externalMerchantId,
      externalOrderId
    }
  });

  const savedOrder = await db.insertOrder(order, executor);

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

  return {
    repeated: false,
    orderId: savedOrder.id,
    order: savedOrder
  };
}
