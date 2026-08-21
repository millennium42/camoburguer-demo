import { randomUUID } from "node:crypto";
import { claimChannelCommand, updateOwnedChannelCommand } from "./integration-repository.js";

const MAX_ATTEMPTS = 3;

function sanitizedError(error) {
  return String(error?.message || "Falha no comando externo")
    .replace(/Bearer\s+\S+/gi, "Bearer ***")
    .slice(0, 240);
}

function backoffMs(attempts) {
  return Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 15 * 60_000);
}

export function classifyCommandError(error) {
  if (error?.notSent === true) return "retryable_not_sent";
  const status = Number(error?.statusCode || 0);
  if ([400, 403, 404, 422].includes(status)) return "terminal";
  return "ambiguous";
}

async function finishUnknown(db, command, workerId, error) {
  const terminal = command.attempts >= MAX_ATTEMPTS;
  return db.transaction((client) =>
    updateOwnedChannelCommand(
      command.id,
      workerId,
      {
        status: terminal ? "dead_letter" : "ambiguous",
        error: sanitizedError(error),
        lastHttpStatus: Number(error?.statusCode || 0) || null,
        nextAttemptAt: new Date(Date.now() + backoffMs(command.attempts)).toISOString(),
        completedAt: terminal ? new Date().toISOString() : null,
        deadLetteredAt: terminal ? new Date().toISOString() : null,
      },
      client,
    ),
  );
}

async function reconcileCommand({ db, adapter, command, workerId }) {
  let result;
  try {
    result = await adapter.reconcileCommand(command);
  } catch (error) {
    return finishUnknown(db, command, workerId, error);
  }
  if (result?.state === "not_applied") {
    return db.transaction((client) =>
      updateOwnedChannelCommand(
        command.id,
        workerId,
        {
          status: "pending",
          error: null,
          reconciledAt: new Date().toISOString(),
          nextAttemptAt: new Date().toISOString(),
        },
        client,
      ),
    );
  }
  if (result?.state !== "applied") {
    return finishUnknown(
      db,
      command,
      workerId,
      new Error(result?.reason || "Resultado externo inconclusivo"),
    );
  }
  return db.transaction(async (client) => {
    const completion = await adapter.finalizeCommand(command, client, {
      reconciled: true,
      externalStatus: result.externalStatus || null,
      localEffect: result.localEffect || command.action,
    });
    return updateOwnedChannelCommand(
      command.id,
      workerId,
      {
        ...completion,
        reconciledAt: new Date().toISOString(),
        responsePayload: { reconciled: true },
        error: null,
      },
      client,
    );
  });
}

async function sendCommand({ db, adapter, command, workerId }) {
  try {
    await adapter.sendCommand(command);
  } catch (error) {
    const classification = classifyCommandError(error);
    if (classification === "ambiguous") return finishUnknown(db, command, workerId, error);
    return db.transaction((client) =>
      updateOwnedChannelCommand(
        command.id,
        workerId,
        {
          status:
            classification === "retryable_not_sent" && command.attempts < MAX_ATTEMPTS
              ? "pending"
              : "failed",
          error: sanitizedError(error),
          lastHttpStatus: Number(error?.statusCode || 0) || null,
          nextAttemptAt: new Date(Date.now() + backoffMs(command.attempts)).toISOString(),
          completedAt:
            classification === "terminal" || command.attempts >= MAX_ATTEMPTS
              ? new Date().toISOString()
              : null,
        },
        client,
      ),
    );
  }

  // Se esta transação falhar, o registro permanece processing. Após o lease,
  // a próxima execução obrigatoriamente reconcilia em vez de reenviar.
  return db.transaction(async (client) => {
    const completion = await adapter.finalizeCommand(command, client, { reconciled: false });
    return updateOwnedChannelCommand(
      command.id,
      workerId,
      {
        ...completion,
        sentAt: new Date().toISOString(),
        responsePayload: { accepted: true },
        error: null,
      },
      client,
    );
  });
}

export async function processChannelCommands({
  db,
  adapter,
  workerId = randomUUID(),
  leaseMs = 60_000,
  limit = 10,
}) {
  const results = [];
  for (let processed = 0; processed < limit; processed += 1) {
    const claimed = await db.transaction((client) =>
      claimChannelCommand(
        {
          channel: adapter.channel,
          workerId,
          leaseMs,
        },
        client,
      ),
    );
    if (!claimed) break;
    const context = { db, adapter, command: claimed.command, workerId };
    results.push(
      claimed.mode === "send" ? await sendCommand(context) : await reconcileCommand(context),
    );
  }
  return results;
}
