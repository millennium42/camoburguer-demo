import { createHash } from "node:crypto";

export const CANONICAL_VERSION = "v2";

function decimalUnits(value, scale, label) {
  const raw = String(value ?? 0).trim();
  const match = raw.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match || (match[3]?.length || 0) > scale) {
    const error = new Error(`${label} invalido`);
    error.statusCode = 400;
    throw error;
  }
  const fraction = (match[3] || "").padEnd(scale, "0");
  const units = BigInt(match[2]) * (10n ** BigInt(scale)) + BigInt(fraction || "0");
  const signed = match[1] ? -units : units;
  const number = Number(signed);
  if (!Number.isSafeInteger(number)) {
    const error = new Error(`${label} fora do limite`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

export function moneyCents(value) {
  return decimalUnits(value, 2, "Valor monetario");
}

function basisPoints(value) {
  return decimalUnits(value, 2, "Percentual");
}

function canonicalValue(value) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    return value
      .map(canonicalValue)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])])
    );
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Numero nao finito no payload idempotente");
    return value;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function fingerprint(value) {
  return createHash("sha256")
    .update(`${CANONICAL_VERSION}\n${canonicalJson(value)}`)
    .digest("hex");
}

function canonicalAddon(addon = {}) {
  return {
    sku: String(addon.sku || "").trim() || null,
    name: String(addon.name || "").trim() || null,
    quantity: Number(addon.quantity ?? 1),
    priceCents: addon.price == null ? null : moneyCents(addon.price)
  };
}

function canonicalItem(item = {}) {
  return {
    identity: String(item.itemId || item.id || item.sku || item.name || "").trim() || null,
    sku: String(item.sku || "").trim() || null,
    name: String(item.name || "").trim() || null,
    quantity: Number(item.quantity ?? 0),
    priceCents: item.price == null ? null : moneyCents(item.price),
    discountBasisPoints: basisPoints(item.discountPercent ?? 0),
    notes: String(item.notes || ""),
    addons: (item.addons || []).map(canonicalAddon)
  };
}

export function orderFingerprintPayload(body = {}, overrides = {}) {
  const value = { ...body, ...overrides };
  const fulfillmentMode = String(value.fulfillmentMode || "local");
  const tabId = value.tabId || null;
  return {
    source: String(value.source || "counter"),
    status: String(value.status || "received"),
    customerName: String(value.customerName || "Cliente"),
    fulfillmentMode,
    deliveryAddress: fulfillmentMode === "delivery"
      ? String(value.deliveryAddress || "").trim()
      : null,
    promisedAt: value.promisedAt || null,
    paymentMethod: tabId && value.paymentMethod == null
      ? null
      : String(value.paymentMethod || "cash"),
    discountBasisPoints: basisPoints(value.discountPercent ?? 0),
    notes: String(value.notes || ""),
    priority: String(value.priority || "normal"),
    channelLabel: String(value.channelLabel || value.source || "counter"),
    tabId,
    roundNumber: value.roundNumber == null ? null : Number(value.roundNumber),
    roundKind: String(value.roundKind || "production"),
    reversesOrderId: value.reversesOrderId || null,
    items: (value.items || []).map(canonicalItem),
    metadata: value.metadata || {}
  };
}

export function cancellationFingerprintPayload({ tabId, orderId, body = {} }) {
  return {
    tabId: String(tabId),
    orderId: String(orderId),
    reason: String(body.reason || "").trim(),
    items: (body.items || []).map((item) => ({
      itemId: String(item.itemId || ""),
      quantity: Number(item.quantity ?? 0)
    }))
  };
}

export function integrationActionFingerprintPayload({ orderId, channel, action, payload = {} }) {
  return {
    orderId: String(orderId),
    channel: String(channel),
    action: String(action),
    payload
  };
}

export async function claimIdempotency(executor, {
  key,
  operation,
  resource,
  requestFingerprint
}) {
  await executor.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [`idempotency:${key}`]
  );
  const { rows } = await executor.query(
    "SELECT * FROM idempotency_records WHERE idempotency_key = $1 FOR UPDATE",
    [key]
  );
  const existing = rows[0];
  if (existing) {
    if (existing.canonical_version !== CANONICAL_VERSION) {
      return { conflict: "idempotency_version_mismatch" };
    }
    const matches = existing.operation === operation
      && existing.resource === resource
      && existing.fingerprint === requestFingerprint;
    if (!matches) return { conflict: "idempotency_payload_mismatch" };
    if (!existing.result_id) return { conflict: "idempotency_incomplete" };
    return {
      repeated: true,
      resultType: existing.result_type,
      resultId: existing.result_id,
      responseStatus: Number(existing.response_status || 200)
    };
  }

  const legacy = await executor.query(
    `SELECT source FROM (
       SELECT 'orders' AS source FROM orders WHERE idempotency_key = $1
       UNION ALL SELECT 'order_tab_assignments' FROM order_tab_assignments WHERE idempotency_key = $1
       UNION ALL SELECT 'stock_movements' FROM stock_movements WHERE idempotency_key = $1
       UNION ALL SELECT 'tab_payments' FROM tab_payments WHERE idempotency_key = $1
       UNION ALL SELECT 'channel_commands' FROM channel_commands WHERE idempotency_key = $1
     ) legacy LIMIT 1`,
    [key]
  );
  if (legacy.rows[0]) return { conflict: "legacy_idempotency_unverifiable" };

  await executor.query(
    `INSERT INTO idempotency_records (
       idempotency_key, operation, resource, fingerprint, canonical_version
     ) VALUES ($1,$2,$3,$4,$5)`,
    [key, operation, resource, requestFingerprint, CANONICAL_VERSION]
  );
  return { repeated: false };
}

export async function completeIdempotency(executor, key, {
  resultType,
  resultId,
  responseStatus
}) {
  await executor.query(
    `UPDATE idempotency_records
     SET result_type = $2, result_id = $3, response_status = $4, completed_at = NOW()
     WHERE idempotency_key = $1`,
    [key, resultType, resultId, responseStatus]
  );
}
