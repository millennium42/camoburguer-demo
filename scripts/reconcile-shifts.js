import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

function usage() {
  return "Uso: node scripts/reconcile-shifts.js <canonical_id> <duplicate_id> <declared_amount> <reason>";
}

function fail(message) {
  const error = new Error(message);
  error.exposed = true;
  return error;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length !== 4) {
    throw fail(usage());
  }

  const [canonicalId, duplicateId, declaredAmountRaw, reasonRaw] = args;
  const declaredAmount = Number(declaredAmountRaw);
  const reason = String(reasonRaw || "").trim();

  if (!connectionString) {
    throw fail("Variavel de ambiente DATABASE_URL ou TEST_DATABASE_URL nao definida.");
  }
  if (!canonicalId || !duplicateId) {
    throw fail("Erro: informe os IDs canônico e duplicado.");
  }
  if (canonicalId === duplicateId) {
    throw fail("Erro: canonical_id e duplicate_id devem ser diferentes.");
  }
  if (!Number.isFinite(declaredAmount) || declaredAmount < 0) {
    throw fail("Erro: declared_amount deve ser um numero decimal em reais.");
  }
  if (reason.length < 5) {
    throw fail("Erro: reason deve ter pelo menos 5 caracteres.");
  }

  return { canonicalId, duplicateId, declaredAmount, reason };
}

async function auditIfAvailable(
  client,
  { canonicalShift, duplicateShift, duplicateClosed, declaredAmount, differenceAmount, reason },
) {
  const { rows } = await client.query("SELECT to_regclass('public.audit_events') AS audit_table");
  if (!rows[0]?.audit_table) return;

  const userRes = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  const actorId =
    userRes.rows[0]?.id || (await client.query("SELECT id FROM users LIMIT 1")).rows[0]?.id;
  if (!actorId) return;

  await client.query(
    `INSERT INTO audit_events
      (id, actor_id, action, resource_path, state_before, state_after, result)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, 'success')`,
    [
      randomUUID(),
      actorId,
      "cash.shift.duplicate_reconciled",
      "/scripts/reconcile-shifts",
      JSON.stringify({
        canonicalShift,
        duplicateShift,
        declaredAmount,
        reason,
      }),
      JSON.stringify({
        canonicalShift,
        duplicateShift: duplicateClosed,
        differenceAmount,
        declaredAmount,
        reason,
      }),
    ],
  );
}

async function reconcile({ canonicalId, duplicateId, declaredAmount, reason }) {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  let finished = false;

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT id, status, expected_amount, declared_amount, difference_amount, notes, opened_at, closed_at
       FROM cash_shifts
       WHERE id = ANY($1::text[])
       FOR UPDATE`,
      [[canonicalId, duplicateId]],
    );

    if (rows.length !== 2) {
      throw fail("Erro: Um ou ambos os IDs de caixa não foram encontrados.");
    }

    const byId = new Map(rows.map((row) => [row.id, row]));
    const canonicalShift = byId.get(canonicalId);
    const duplicateShift = byId.get(duplicateId);

    for (const shift of [canonicalShift, duplicateShift]) {
      if (shift.status !== "open") {
        throw fail(`Erro: O caixa ${shift.id} nao esta aberto (status: ${shift.status}).`);
      }
    }

    const differenceAmount = Number(
      (declaredAmount - Number(duplicateShift.expected_amount)).toFixed(2),
    );
    const note = `[RECONCILIAÇÃO] ${reason}`;
    const { rows: updatedRows } = await client.query(
      `UPDATE cash_shifts
       SET status = 'closed',
           declared_amount = $1,
           difference_amount = $2,
           notes = CASE
             WHEN COALESCE(notes, '') = '' THEN $3
             ELSE notes || E'\n' || $3
           END,
           closed_at = NOW()
       WHERE id = $4
       RETURNING id, status, expected_amount, declared_amount, difference_amount, notes, opened_at, closed_at`,
      [declaredAmount, differenceAmount, note, duplicateId],
    );

    const duplicateClosed = updatedRows[0];

    await auditIfAvailable(client, {
      canonicalShift,
      duplicateShift,
      duplicateClosed,
      declaredAmount,
      differenceAmount,
      reason,
    });

    await client.query("COMMIT");
    finished = true;
    console.log(
      `Sucesso: caixa duplicado ${duplicateId} foi fechado. O caixa canônico ${canonicalId} permanece aberto.`,
    );
    return 0;
  } catch (error) {
    if (!finished) {
      await client.query("ROLLBACK").catch(() => {});
    }
    console.error(error.message || error);
    return 1;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  try {
    return await reconcile(parseArgs(process.argv));
  } catch (error) {
    console.error(error.message || error);
    return 1;
  }
}

process.exitCode = await main();
