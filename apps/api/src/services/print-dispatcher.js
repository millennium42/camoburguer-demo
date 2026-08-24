import { randomUUID } from "node:crypto";
import {
  assertBridgeStatus,
  assertPrintPayloadSize,
  classifyPrintFailure,
  PRINT_MAX_ATTEMPTS,
  printBackoffMs,
  printPayload,
} from "../print-queue.js";
import { buildKitchenTicket } from "@camoburguer/domain";

/**
 * Creates a print dispatcher service bound to a database connection and config.
 * Encapsulates the entire print queue lifecycle: reserve, claim, dispatch,
 * finalize, fail, reconcile, and background recovery.
 *
 * @param {{ db: object, config: object }} deps
 * @returns {object} Print dispatcher API
 */
export function createPrintDispatcher({ db, config }) {
  const workerId = `api-${randomUUID()}`;

  function mapPrintJob(row) {
    return {
      id: row.id,
      orderId: row.order_id,
      reason: row.reason,
      status: row.status,
      printerName: row.printer_name,
      content: row.content,
      attempts: row.attempts,
      error: row.error,
      errorClass: row.error_class,
      lastErrorCode: row.last_error_code,
      nextAttemptAt: row.next_attempt_at ? new Date(row.next_attempt_at).toISOString() : null,
      printedAt: row.printed_at ? new Date(row.printed_at).toISOString() : null,
      deadLetteredAt: row.dead_lettered_at ? new Date(row.dead_lettered_at).toISOString() : null,
      metadata: row.metadata || {},
      history: row.history || [],
    };
  }

  async function reservePrintJob(order, reason = "confirmed", executor = db) {
    const pending = {
      id: randomUUID(),
      orderId: order.id,
      reason,
      printerName: config.defaultPrinter,
      content: buildKitchenTicket(order, { timeZone: config.businessTimeZone }),
    };
    assertPrintPayloadSize(pending);
    const { rows } = await executor.query(
      `INSERT INTO print_jobs (
        id, order_id, reason, status, printer_name, content, attempts, error, metadata
      ) VALUES ($1,$2,$3,'pending',$4,$5,0,NULL,$6::jsonb)
      ON CONFLICT DO NOTHING
      RETURNING *`,
      [
        pending.id,
        pending.orderId,
        pending.reason,
        pending.printerName,
        pending.content,
        JSON.stringify({ reason }),
      ],
    );
    return rows[0] ? mapPrintJob(rows[0]) : null;
  }

  async function getPrimaryPrintJob(orderId, executor = db) {
    const { rows } = await executor.query(
      "SELECT * FROM print_jobs WHERE order_id = $1 AND reason IN ('confirmed', 'cancellation') ORDER BY created_at LIMIT 1",
      [orderId],
    );
    return rows[0] ? mapPrintJob(rows[0]) : null;
  }

  async function reserveReprintJob(original, executor = db) {
    const pending = {
      id: randomUUID(),
      orderId: original.orderId,
      reason: "reprint",
      printerName: original.printerName,
      content: original.content,
    };
    assertPrintPayloadSize(pending);
    const { rows } = await executor.query(
      `INSERT INTO print_jobs (
        id, order_id, reason, status, printer_name, content, attempts, error, metadata
      ) VALUES ($1,$2,'reprint','pending',$3,$4,0,NULL,$5::jsonb)
      RETURNING *`,
      [
        pending.id,
        pending.orderId,
        pending.printerName,
        pending.content,
        JSON.stringify({ reason: "reprint", sourceJobId: original.id }),
      ],
    );
    return mapPrintJob(rows[0]);
  }

  async function claimPrintJob(jobId = null) {
    const { rows } = await db.query(
      `WITH candidate AS (
         SELECT id FROM print_jobs
         WHERE ($1::text IS NULL OR id = $1)
           AND (
             status = 'pending'
             OR (status = 'retry_wait' AND next_attempt_at <= NOW())
             OR (status = 'sending' AND lease_expires_at < NOW())
           )
         ORDER BY next_attempt_at, created_at, id
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE print_jobs job
       SET status = 'sending',
           attempts = attempts + 1,
           lease_owner = $2,
           lease_expires_at = NOW() + INTERVAL '30 seconds',
           last_attempt_at = NOW(),
           error = NULL
       FROM candidate
       WHERE job.id = candidate.id
       RETURNING job.*`,
      [jobId, workerId],
    );
    return rows[0] ? mapPrintJob(rows[0]) : null;
  }

  function bridgeHeaders() {
    return {
      "content-type": "application/json",
      ...(config.printBridgeToken ? { authorization: `Bearer ${config.printBridgeToken}` } : {}),
    };
  }

  async function readBridgeJson(response, action) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      const error = new Error(`Print bridge retornou JSON inválido ao ${action}`);
      error.permanent = true;
      error.code = "PRINT_BRIDGE_INVALID_JSON";
      throw error;
    }
  }

  async function finalizePrintedJob(job, payload, reconciled = false) {
    assertBridgeStatus(payload?.status);
    const { rows } = await db.query(
      `UPDATE print_jobs
       SET status = 'printed', printer_name = $3, error = NULL, error_class = NULL,
           last_error_code = NULL, lease_owner = NULL, lease_expires_at = NULL,
           printed_at = NOW(),
           metadata = $4::jsonb,
           history = history || jsonb_build_array(jsonb_build_object(
             'at', NOW(), 'event', $5::text, 'attempt', attempts
           ))
       WHERE id = $1 AND lease_owner = $2
       RETURNING *`,
      [
        job.id,
        workerId,
        payload.printerName || job.printerName,
        JSON.stringify({
          ...(job.metadata || {}),
          ...(payload.metadata || {}),
          bridgeJobId: payload.id || job.id,
          receipt: payload.receipt || null,
          reason: job.reason,
          reconciled,
        }),
        reconciled ? "reconciled" : "spooled",
      ],
    );
    return rows[0] ? mapPrintJob(rows[0]) : job;
  }

  async function reconcilePrintJob(job) {
    const response = await fetch(
      `${config.printBridgeUrl}/print-jobs/${encodeURIComponent(job.orderId)}/${encodeURIComponent(job.id)}`,
      {
        headers: bridgeHeaders(),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      const error = new Error(`Print bridge respondeu ${response.status} ao reconciliar`);
      error.statusCode = response.status;
      throw error;
    }
    const payload = await readBridgeJson(response, "reconciliar");
    assertBridgeStatus(payload?.status);
    return payload;
  }

  async function failPrintJob(job, error) {
    const errorClass = classifyPrintFailure(error);
    const deadLetter = errorClass === "permanent" || job.attempts >= PRINT_MAX_ATTEMPTS;
    const nextAttempt = new Date(Date.now() + printBackoffMs(job.attempts, job.id)).toISOString();
    const { rows } = await db.query(
      `UPDATE print_jobs
       SET status = $3,
           error = $4,
           error_class = $5,
           last_error_code = $6,
           next_attempt_at = $7,
           dead_lettered_at = CASE WHEN $3 = 'dead_letter' THEN NOW() ELSE NULL END,
           lease_owner = NULL,
           lease_expires_at = NULL,
           history = history || jsonb_build_array(jsonb_build_object(
             'at', NOW(), 'event', $3::text, 'attempt', attempts,
             'class', $5::text, 'code', $6::text
           ))
       WHERE id = $1 AND lease_owner = $2
       RETURNING *`,
      [
        job.id,
        workerId,
        deadLetter ? "dead_letter" : "retry_wait",
        String(error.message || "Falha de impressão").slice(0, 1000),
        errorClass,
        String(error.code || error.statusCode || "PRINT_BRIDGE_UNAVAILABLE").slice(0, 128),
        nextAttempt,
      ],
    );
    return rows[0] ? mapPrintJob(rows[0]) : job;
  }

  async function dispatchPrintJob(candidate) {
    const job = await claimPrintJob(candidate?.id || null);
    if (!job) return candidate || null;

    try {
      assertPrintPayloadSize(job);
      if (job.attempts > 1) {
        const receipt = await reconcilePrintJob(job);
        if (receipt) return finalizePrintedJob(job, receipt, true);
      }
      const response = await fetch(`${config.printBridgeUrl}/print-jobs`, {
        method: "POST",
        headers: bridgeHeaders(),
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify(printPayload(job)),
      });
      if (!response.ok) {
        const error = new Error(`Print bridge respondeu ${response.status}`);
        error.statusCode = response.status;
        throw error;
      }
      const payload = await readBridgeJson(response, "imprimir");
      return finalizePrintedJob(job, payload, payload?.status === "already_printed");
    } catch (error) {
      return failPrintJob(job, error);
    }
  }

  let printRecoveryInFlight = false;
  async function recoverPrintJobs() {
    if (printRecoveryInFlight) return;
    printRecoveryInFlight = true;
    try {
      for (let index = 0; index < 20; index += 1) {
        const result = await dispatchPrintJob();
        if (!result) break;
      }
    } finally {
      printRecoveryInFlight = false;
    }
  }

  async function listPrintJobs(statusFilter = null) {
    const where = statusFilter ? "WHERE status = $1" : "";
    const params = statusFilter ? [statusFilter] : [];
    const { rows } = await db.query(
      `SELECT * FROM print_jobs ${where} ORDER BY created_at DESC`,
      params,
    );
    return rows.map(mapPrintJob);
  }

  return {
    mapPrintJob,
    reservePrintJob,
    getPrimaryPrintJob,
    reserveReprintJob,
    claimPrintJob,
    dispatchPrintJob,
    recoverPrintJobs,
    listPrintJobs,
  };
}
