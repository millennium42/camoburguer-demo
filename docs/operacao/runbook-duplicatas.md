# Runbook: Múltiplos Caixas Abertos (Duplicatas)

## Diagnóstico
O sistema Camoburguer exige o invariante estrito de que apenas um caixa (`cash_shifts`) pode estar com status `open` ao mesmo tempo. 
Se durante a inicialização (boot) o sistema acusar a mensagem de erro:
\`[FATAL] Detectados múltiplos caixas abertos: IDs (...) abertos em (...)\`
Isso significa que instâncias de dados antigas ou erros transacionais permitiram a abertura de múltiplos turnos paralelos. O servidor irá abortar a inicialização (Exit 1) para prevenir corrupção financeira.

## Ação Requerida (Reconciliação)
Para resolver, é necessário identificar qual caixa deve permanecer aberto (Canônico) e qual deve ser fechado (Duplicado).

1. Execute uma consulta manual para verificar os detalhes dos caixas:
\`\`\`sql
SELECT id, opened_at, expected_amount FROM cash_shifts WHERE status = 'open';
\`\`\`
2. Identifique o ID canônico e o ID duplicado.
3. Utilize o script de reconciliação para fechar a duplicata, prestando contas de eventuais valores do turno:

\`\`\`bash
node scripts/reconcile-shifts.js <ID_CANONICO> <ID_DUPLICADO> <VALOR_DECLARADO_EM_CENTAVOS> "<MOTIVO_DA_RECONCILIACAO>"
\`\`\`

## Backup e Rollback
**Backup**: Antes de executar a reconciliação, faça um dump da tabela de caixas:
\`\`\`bash
pg_dump -t cash_shifts $DATABASE_URL > cash_shifts_backup.sql
\`\`\`

**Rollback**: Caso o script de reconciliação falhe ou você deseje desfazer a ação, a operação é segura:
1. Durante a execução, o script abre uma transação. Se falhar, faz \`ROLLBACK\` automático sem persistir.
2. Caso tenha persistido erroneamente, para reverter, restaure a tabela a partir do backup:
\`\`\`bash
psql $DATABASE_URL -f cash_shifts_backup.sql
\`\`\`
