import { mapChannelMapping, mapChannelEvent, mapChannelCommand, mapOrder } from "../db.js";

const MAPPING_COLUMNS = {
  externalStatus: "external_status",
  syncStatus: "sync_status",
  syncError: "sync_error",
  metadata: "metadata"
};

const EVENT_COLUMNS = {
  status: "status",
  error: "error",
  processedAt: "processed_at",
  payload: "payload"
};

const COMMAND_COLUMNS = {
  status: "status",
  attempts: "attempts",
  nextAttemptAt: "next_attempt_at",
  responsePayload: "response_payload",
  error: "error",
  completedAt: "completed_at"
};

function columnFor(columns, key) {
  if (!columns[key]) throw new Error(`Campo de atualização não permitido: ${key}`);
  return columns[key];
}

export async function findChannelMapping({ channel, merchantId, externalId }, executor) {
  const { rows } = await executor.query(
    "SELECT * FROM channel_mappings WHERE channel = $1 AND merchant_id = $2 AND external_id = $3",
    [channel, merchantId, externalId]
  );
  return rows[0] ? mapChannelMapping(rows[0]) : null;
}

export async function insertChannelMapping(mapping, executor) {
  const { rows } = await executor.query(
    `INSERT INTO channel_mappings (
      id, order_id, channel, merchant_id, external_id, external_status, sync_status, metadata, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10) RETURNING *`,
    [
      mapping.id,
      mapping.orderId,
      mapping.channel,
      mapping.merchantId,
      mapping.externalId,
      mapping.externalStatus,
      mapping.syncStatus || 'synchronized',
      JSON.stringify(mapping.metadata || {}),
      mapping.createdAt || new Date().toISOString(),
      mapping.updatedAt || new Date().toISOString()
    ]
  );
  return mapChannelMapping(rows[0]);
}

export async function updateChannelMapping(id, updates, executor) {
  if (!Object.keys(updates).length) throw new Error("Atualização de mapping vazia");
  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    const column = columnFor(MAPPING_COLUMNS, key);
    setClauses.push(`${column} = $${i}`);
    if (key === 'metadata') {
      values.push(JSON.stringify(value));
    } else {
      values.push(value);
    }
    i++;
  }

  setClauses.push(`updated_at = $${i}`);
  values.push(new Date().toISOString());
  
  values.push(id);

  const query = `UPDATE channel_mappings SET ${setClauses.join(", ")} WHERE id = $${i + 1} RETURNING *`;
  const { rows } = await executor.query(query, values);
  return rows[0] ? mapChannelMapping(rows[0]) : null;
}

export async function findChannelEvent({ channel, externalEventId }, executor) {
  const { rows } = await executor.query(
    "SELECT * FROM channel_events WHERE channel = $1 AND external_event_id = $2",
    [channel, externalEventId]
  );
  return rows[0] ? mapChannelEvent(rows[0]) : null;
}

export async function insertChannelEvent(event, executor) {
  const { rows } = await executor.query(
    `INSERT INTO channel_events (
      id, channel, external_event_id, merchant_id, external_order_id, event_type, payload, status, error, occurred_at, received_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11) ON CONFLICT (channel, external_event_id) DO NOTHING RETURNING *`,
    [
      event.id,
      event.channel,
      event.externalEventId,
      event.merchantId,
      event.externalOrderId,
      event.eventType,
      JSON.stringify(event.payload),
      event.status || 'pending',
      event.error,
      event.occurredAt,
      event.receivedAt || new Date().toISOString()
    ]
  );
  return rows[0] ? mapChannelEvent(rows[0]) : null;
}

export async function updateChannelEvent(id, updates, executor) {
  if (!Object.keys(updates).length) throw new Error("Atualização de evento vazia");
  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    const column = columnFor(EVENT_COLUMNS, key);
    setClauses.push(`${column} = $${i}`);
    values.push(key === "payload" ? JSON.stringify(value) : value);
    i++;
  }

  values.push(id);
  const query = `UPDATE channel_events SET ${setClauses.join(", ")} WHERE id = $${i} RETURNING *`;
  const { rows } = await executor.query(query, values);
  return rows[0] ? mapChannelEvent(rows[0]) : null;
}

export async function insertChannelCommand(command, executor) {
  const { rows } = await executor.query(
    `INSERT INTO channel_commands (
      id, order_id, channel, action, idempotency_key, payload, status, next_attempt_at, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9) ON CONFLICT (channel, idempotency_key) DO NOTHING RETURNING *`,
    [
      command.id,
      command.orderId,
      command.channel,
      command.action,
      command.idempotencyKey,
      JSON.stringify(command.payload || {}),
      command.status || 'pending',
      command.nextAttemptAt || new Date().toISOString(),
      command.createdAt || new Date().toISOString()
    ]
  );
  return rows[0] ? mapChannelCommand(rows[0]) : null;
}

export async function findChannelCommand({ channel, idempotencyKey }, executor) {
  const { rows } = await executor.query(
    "SELECT * FROM channel_commands WHERE channel = $1 AND idempotency_key = $2",
    [channel, idempotencyKey]
  );
  return rows[0] ? mapChannelCommand(rows[0]) : null;
}

export async function updateChannelCommand(id, updates, executor) {
  if (!Object.keys(updates).length) throw new Error("Atualização de comando vazia");
  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    const column = columnFor(COMMAND_COLUMNS, key);
    setClauses.push(`${column} = $${i}`);
    if (key === 'responsePayload') {
      values.push(JSON.stringify(value));
    } else {
      values.push(value);
    }
    i++;
  }

  values.push(id);
  const query = `UPDATE channel_commands SET ${setClauses.join(", ")} WHERE id = $${i} RETURNING *`;
  const { rows } = await executor.query(query, values);
  return rows[0] ? mapChannelCommand(rows[0]) : null;
}

export async function getPendingCommands(channel, executor) {
  const { rows } = await executor.query(
    "SELECT * FROM channel_commands WHERE channel = $1 AND status IN ('pending', 'processing') AND next_attempt_at <= NOW() ORDER BY created_at ASC",
    [channel]
  );
  return rows.map(mapChannelCommand);
}

export async function getOrderWithMapping(orderId, executor) {
  const { rows } = await executor.query(
    "SELECT o.*, row_to_json(cm.*) as mapping FROM orders o LEFT JOIN channel_mappings cm ON o.id = cm.order_id WHERE o.id = $1",
    [orderId]
  );
  if (!rows[0]) return null;
  const order = mapOrder(rows[0]);
  order.mapping = rows[0].mapping ? mapChannelMapping(rows[0].mapping) : null;
  return order;
}
