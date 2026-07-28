export const PRINT_MAX_BYTES = 64 * 1024;
export const PRINT_MAX_ATTEMPTS = 5;
export const BRIDGE_SUCCESS_STATUSES = new Set(["printed", "already_printed"]);

export function printPayload(job) {
  return {
    jobId: job.id,
    orderId: job.orderId,
    printerName: job.printerName,
    content: job.content,
    reason: job.reason
  };
}

export function printPayloadBytes(job) {
  return Buffer.byteLength(JSON.stringify(printPayload(job)), "utf8");
}

export function assertPrintPayloadSize(job) {
  const bytes = printPayloadBytes(job);
  if (bytes > PRINT_MAX_BYTES) {
    const error = new Error(`Payload de impressão excede ${PRINT_MAX_BYTES} bytes`);
    error.statusCode = 422;
    error.code = "PRINT_PAYLOAD_TOO_LARGE";
    error.permanent = true;
    error.bytes = bytes;
    throw error;
  }
  return bytes;
}

export function classifyPrintFailure(error) {
  if (error?.permanent) return "permanent";
  const status = Number(error?.statusCode);
  if ([408, 425, 429].includes(status) || status >= 500) return "transient";
  if (status >= 400) return "permanent";
  return "ambiguous";
}

export function printBackoffMs(attempt, jobId = "") {
  const base = Math.min(5_000 * (2 ** Math.max(0, Number(attempt) - 1)), 300_000);
  const seed = [...String(jobId)].reduce((sum, char) => (sum + char.charCodeAt(0)) % 1000, 0);
  return Math.min(base + Math.floor(base * seed / 10_000), 300_000);
}

export function assertBridgeStatus(value) {
  const status = String(value || "");
  if (!BRIDGE_SUCCESS_STATUSES.has(status)) {
    const error = new Error(`Status do print bridge não permitido: ${status || "ausente"}`);
    error.code = "PRINT_BRIDGE_STATUS_INVALID";
    error.permanent = true;
    throw error;
  }
  return status;
}
