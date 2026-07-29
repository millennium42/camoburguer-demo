import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

if (!connectionString) {
  console.error("Variável de ambiente DATABASE_URL não definida.");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length !== 4) {
  console.error("Uso: node scripts/reconcile-shifts.js <canonical_id> <duplicate_id> <declared_amount> <reason>");
  process.exit(1);
}

const [canonicalId, duplicateId, declaredAmountStr, reason] = args;
const declaredAmount = Number(declaredAmountStr);

if (isNaN(declaredAmount)) {
  console.error("Erro: declared_amount deve ser um número inteiro (em centavos).");
  process.exit(1);
}
if (!reason || reason.trim().length < 5) {
  console.error("Erro: reason deve ter pelo menos 5 caracteres.");
  process.exit(1);
}

async function reconcile() {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar se os turnos existem e estão abertos
    const { rows: shifts } = await client.query(
      "SELECT id, status, expected_amount FROM cash_shifts WHERE id IN ($1, $2)",
      [canonicalId, duplicateId]
    );

    if (shifts.length !== 2) {
      console.error("Erro: Um ou ambos os IDs de caixa não foram encontrados.");
      await client.query("ROLLBACK");
      process.exit(1);
    }

    for (const shift of shifts) {
      if (shift.status !== "open") {
        console.error(\`Erro: O caixa \${shift.id} não está aberto (status: \${shift.status}).\`);
        await client.query("ROLLBACK");
        process.exit(1);
      }
    }

    const duplicateShift = shifts.find(s => s.id === duplicateId);
    
    // Calcular a diferença para o fechamento
    const differenceAmount = declaredAmount - Number(duplicateShift.expected_amount);

    // Fechar o caixa duplicado
    await client.query(
      \`UPDATE cash_shifts
       SET status = 'closed',
           declared_amount = $1,
           difference_amount = $2,
           notes = $3,
           closed_at = NOW()
       WHERE id = $4\`,
      [declaredAmount, differenceAmount, \`[RECONCILIAÇÃO] \${reason}\`, duplicateId]
    );

    // Auditoria (se existir tabela, senão anotamos no notes acima. Para manter invariantes estritos, vamos criar uma entrada se houver log)
    // O sistema não possui uma tabela 'audit_logs' visível no schema parcial acima, mas adicionamos no "notes" a rastreabilidade.
    
    await client.query("COMMIT");
    console.log(\`Sucesso: Caixa duplicado \${duplicateId} foi fechado. O caixa canônico \${canonicalId} permanece aberto.\`);
    process.exit(0);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro fatal durante a reconciliação:", err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

reconcile();
