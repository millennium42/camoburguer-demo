# Especificação: M-05 Remover fechamento financeiro silencioso durante migração

## 1. Problema e evidências
Durante a inicialização, a migração silenciosamente detectava e fechava caixas (`cash_shifts`) duplicados com status `open`, mantendo apenas o mais recente e inserindo valores padrões arbitrários (ex: diferença nula e valor declarado igual ao esperado). 
Evidência: Em `apps/api/src/db.js`, linhas ~364 a 374, uma instrução `WITH duplicate_open_shifts AS (...) UPDATE cash_shifts SET status = 'closed'...` fecha as duplicatas sem intervenção humana, o que quebra a auditoria financeira.

## 2. Comportamento Atual e Comportamento Desejado
**Atual**: Inicializa com script que roda um `UPDATE` silencioso em `cash_shifts` preenchendo automaticamente o `declared_amount` se múltiplos caixas abertos forem encontrados, antes de criar o `UNIQUE INDEX cash_shifts_one_open`.
**Desejado**: O `UPDATE` silencioso deve ser removido. Em seu lugar, a migração (ou fase preflight na inicialização do DB) deve abortar e lançar um erro fechado contendo os IDs e horários de abertura dos caixas conflitantes, caso encontre mais de um caixa aberto. O sistema só deve criar o índice e iniciar após o operador resolver a duplicata administrativamente. 

## 3. Invariantes de Domínio e Segurança
- O fechamento de caixa é uma operação financeira estrita que exige declaração do operador, justificativa em caso de diferença e auditoria.
- O sistema não deve inferir dados financeiros.
- Falha fechada: O preflight que barra o boot caso a invariância não esteja cumprida deve apresentar apenas dados temporais e identificadores UUID/alfanuméricos não sensíveis.

## 4. Estados e Transições Afetadas
- Estado Inicialização (`boot` em `db.js`): Passa a incluir preflight contra a violação e interrompe o servidor (Exit 1) se estado for irrecuperável de forma automática.
- Estado Caixa (`cash_shifts`): Ganha uma rota administrativa de reconciliação explícita (`POST /admin/reconcile-duplicate-shifts`) que permite ao operador declarar o turno "canônico", valores finais e justificativa.

## 5. Contratos HTTP e de Persistência Afetados
- `POST /admin/reconcile-shifts`: Novo contrato para sanar múltiplos caixas abertos, requerendo privilégios de Admin. (Ou script administrativo no repositório - a especificação sugere "Criar operação administrativa explícita para reconciliar duplicatas").

## 6. Estratégia de Migração e Compatibilidade
A migração de banco não fechará mais nada. Bancos com duplicatas existentes travarão o boot, exigindo que o operador use uma CLI/rota de resgate. Vamos prover o script `scripts/reconcile-shifts.js` ou rota nativa para o administrador resolver.

## 7. Arquivos e Símbolos Prováveis
- `apps/api/src/db.js` (remover update silencioso, adicionar preflight function `checkDuplicateShifts`)
- `apps/api/src/server.js` (criar rota ou importar operação administrativa caso feito via web, ou apenas dependente de script via db module)
- `scripts/reconcile-shifts.js` (novo utilitário administrativo offline)
- `docs/operacao/runbook-duplicatas.md` (novo)

## 8. Testes (Unitários, Integração, Concorrência, Autorização)
- Teste: Bloqueio do startup perante duplicatas (DB Migration Test).
- Teste: Sucesso da operação de reconciliação (restaurando consistência e gravando auditoria).
- Teste: Restrição de autorização na ferramenta administrativa.

## 9. Observabilidade e Mensagens de Erro
- Logs: `[FATAL] Detectados múltiplos caixas abertos (IDs: %s). Reconciliação manual obrigatória.`

## 10. Riscos, Rollback e Fora de Escopo
- **Risco**: Paralisação de instâncias com estado legado sujo. Mitigado por instrução clara no erro indicando o Runbook.
- **Rollback**: Remeter ao commit anterior e executar a migração silenciosa.
- **Fora de Escopo**: Inferir automaticamente qual caixa sobrevive ou qual é a diferença real em centavos.

## 11. Critérios de Aceitação
- Startup não altera estado financeiro para corrigir duplicatas.
- Banco com dois caixas abertos falha antes de qualquer fechamento automático.
- Ferramenta administrativa exige intenção explícita e produz resultado auditado.
- Após reconciliação, a constraint impede recorrência.
- Rollback da operação administrativa restaura todos os estados se qualquer etapa falhar.
- Runbook detalha diagnóstico, backup e rollback.

## 12. Rubrica de Autoavaliação
| Critério | Pontos |
|---|---:|
| Correção funcional e preservação dos invariantes | 30 |
| Testes de regressão, integração e casos-limite | 20 |
| Segurança, integridade transacional e concorrência | 15 |
| Aderência integral à especificação | 15 |
| Qualidade de código, clareza e manutenibilidade | 10 |
| Operação, observabilidade, documentação e rollback | 5 |
| Disciplina de escopo, commit e reprodutibilidade | 5 |
