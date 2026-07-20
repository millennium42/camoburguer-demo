import { randomUUID } from "crypto";
import { findChannelMapping, insertChannelMapping } from "./integration-repository.js";
import { insertOrder } from "../db.js";

export async function ingestExternalOrder(input, executor) {
  const mapping = await findChannelMapping({
    channel: input.source,
    merchantId: input.externalMerchantId,
    externalId: input.externalOrderId
  }, executor);

  if (mapping) {
    return {
      repeated: true,
      orderId: mapping.orderId
    };
  }

  const orderId = randomUUID();
  const idempotencyKey = [input.source, input.externalMerchantId, input.externalOrderId].join(":");

  const totalCents = Math.round(
    input.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) * 100
  );

  const order = {
    id: orderId,
    source: input.source,
    fulfillmentMode: input.fulfillmentMode,
    customerName: input.customerName,
    deliveryAddress: input.deliveryAddress || null,
    discountPercent: input.discountPercent || 0,
    paymentMethod: input.paymentMethod || null,
    status: "received",
    items: input.items,
    idempotencyKey,
    createdAt: new Date().toISOString()
  };

  const savedOrder = await insertOrder(order, executor);

  await insertChannelMapping({
    id: randomUUID(),
    orderId: savedOrder.id,
    channel: input.source,
    merchantId: input.externalMerchantId,
    externalId: input.externalOrderId,
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
