import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createDb } from "../apps/api/src/db.js";

const testDbUrl = process.env.TEST_DATABASE_URL;

test("M-05: Fechamento financeiro silencioso removido e reconciliação admin", { skip: !testDbUrl ? "PostgreSQL efêmero requer TEST_DATABASE_URL" : false }, async (t) => {
  const db = createDb(testDbUrl);

  await db.query("DROP TABLE IF EXISTS cash_shifts CASCADE");
  
  await db.query(
    "CREATE TABLE IF NOT EXISTS cash_shifts (" +
    "  id TEXT PRIMARY KEY," +
    "  opened_at TIMESTAMPTZ NOT NULL," +
    "  status TEXT NOT NULL," +
    "  expected_amount INTEGER NOT NULL DEFAULT 0," +
    "  declared_amount INTEGER," +
    "  difference_amount INTEGER," +
    "  notes TEXT," +
    "  closed_at TIMESTAMPTZ" +
    ")"
  );
  
  await db.query("DELETE FROM cash_shifts");
  
  await db.query("INSERT INTO cash_shifts (id, opened_at, status, expected_amount) VALUES ('caixa1', NOW() - INTERVAL '2 hours', 'open', 10000)");
  await db.query("INSERT INTO cash_shifts (id, opened_at, status, expected_amount) VALUES ('caixa2', NOW() - INTERVAL '1 hour', 'open', 15000)");
  
  const runnerContent = `
    import { createDb } from "./apps/api/src/db.js";
    const db = createDb(process.env.TEST_DATABASE_URL);
    db.init().then(() => process.exit(0)).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  `;
  fs.writeFileSync("temp-runner.js", runnerContent);

  await t.test("Preflight detecta dois caixas abertos e aborta inicialização", async () => {
    try {
      execSync("node temp-runner.js", {
        env: { ...process.env, TEST_DATABASE_URL: testDbUrl },
        stdio: 'pipe'
      });
      assert.fail("Deveria ter abortado a inicialização");
    } catch (err) {
      assert.equal(err.status, 1);
      assert.match(err.stderr.toString(), /\\[FATAL\\] Detectados múltiplos caixas abertos/);
    }
  });

  await t.test("Ferramenta administrativa: Erro em alvo inválido", async () => {
    try {
      execSync('node scripts/reconcile-shifts.js caixa1 caixa_inexistente 0 "Motivo teste"', {
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: 'pipe'
      });
      assert.fail("Deveria falhar");
    } catch (err) {
      assert.equal(err.status, 1);
      assert.match(err.stderr.toString(), /Erro: Um ou ambos os IDs de caixa não foram encontrados/);
    }
  });

  await t.test("Ferramenta administrativa: Sucesso em alvo válido", async () => {
    execSync('node scripts/reconcile-shifts.js caixa1 caixa2 15000 "Motivo válido manual"', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe'
    });
    
    const { rows } = await db.query("SELECT id, status, declared_amount, difference_amount, notes FROM cash_shifts WHERE id = 'caixa2'");
    assert.equal(rows[0].status, 'closed');
    assert.equal(rows[0].declared_amount, 15000);
    assert.equal(rows[0].difference_amount, 0);
    assert.equal(rows[0].notes, '[RECONCILIAÇÃO] Motivo válido manual');
  });

  await t.test("Migração agora passa após reconciliação (banco íntegro)", async () => {
    execSync("node temp-runner.js", {
      env: { ...process.env, TEST_DATABASE_URL: testDbUrl },
      stdio: 'pipe'
    });
  });

  await t.test("Constraint protege contra novas duplicatas", async () => {
    try {
      await db.query("INSERT INTO cash_shifts (id, opened_at, status, expected_amount) VALUES ('caixa3', NOW(), 'open', 0)");
      assert.fail("Deveria falhar por causa do Unique Index");
    } catch (err) {
      assert.equal(err.code, '23505');
    }
  });
  
  await db.query("DROP TABLE IF EXISTS cash_shifts CASCADE");
  if (fs.existsSync("temp-runner.js")) {
    fs.unlinkSync("temp-runner.js");
  }
});
