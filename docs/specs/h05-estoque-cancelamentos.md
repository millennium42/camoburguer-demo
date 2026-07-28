# H-05: Unificar política de estoque entre cancelamentos avulsos e de comanda

## 1. Problema e Evidências
Atualmente existe uma fratura comportamental na gestão de estoque mediante cancelamento em estados onde o insumo já foi comprometido (ex: `in_preparation`, `ready`). Pedidos avulsos devolvem o item integralmente ao saldo positivo, reavendo estoque mágico de itens fisicamente preparados/extraviados. As comandas não devolvem o item, mas os "ignoram", não provendo registro auditável explícito da perda daquele insumo (`wastage` ou similar).

## 2. Comportamento Atual e Desejado
**Atual:** 
- Rota Avulsa (`server.js:1594`): estorna para `["confirmed", "in_preparation", "ready"]` com `reason = "cancellation"` e `delta > 0`.
- Rota Comanda (`server.js:1294`): estorna apenas se `original.status === "confirmed"`.

**Desejado:** 
- Apenas o status `confirmed` deve adicionar quantidade devolvida ao saldo `stock_balances`.
- Os status `in_preparation` ou `ready` devem gerar um movimento em `stock_movements` com motivo `cancellation_loss`, `delta = 0`, mas contendo a propriedade `metadata.lostQuantity` referenciando o que foi jogado fora (consumo físico) por causa da rescisão tardia.
- Ambas as rotas (avulso e comanda) devem operar idênticas sob esse novo modelo, tornando o estoque blindado a falhas operacionais e alinhando com princípios transacionais contábeis.

## 3. Invariantes de Domínio e Segurança
- O `stock_movements` possui a chave `(order_id, category, reason)` única, que protegerá `cancellation_loss` de repetições (idempotência).
- Estoque consumido não pode gerar delta positivo nem sumir sem registro em banco. O saldo (`stock_balances`) permanece intacto no `cancellation_loss`.
- A trava `FOR UPDATE` sobre saldos continuará exclusiva de transações onde o delta é real, mas o bloqueio não será efetuado para deltas zerados (protegendo throughput em cancelamentos de desperdício).

## 4. Estados e Transições
- `confirmed` -> `cancellation`: estoque estornado.
- `in_preparation` | `ready` -> `cancellation`: estoque mantido em falta, mas evento de perda lavrado.

## 5. Estratégia de Migração e Compatibilidade
- A modificação usa as mesmas tabelas; o novo identificador `cancellation_loss` será lido pela `inventoryView` ou relatórios sem corromper nenhuma coluna anterior.

## 6. Arquivos e Símbolos
- `apps/api/src/server.js`: atualizar `changeStock()` para suportar as condicionais `cancellation_loss` (travando a query de update de quantidade);
- `apps/api/src/server.js`: atualizar os invocadores em `PATCH /orders/:id/status` e em `POST /tabs/.../cancellations`.

## 7. Critérios de Aceitação e Autoavaliação
1. Avulsos estornam perfeitamente para `confirmed`.
2. Avulsos geram `cancellation_loss` com `delta: 0` e sem mexer no saldo na produção.
3. Comandas seguem estritamente a mesmíssima simetria, propagando partial returns.
4. Nenhuma mutação sem a chave primária real.
5. Observabilidade intacta (logs contêm `metadata.lostQuantity`).

## 8. Rubrica
| Critério | Pontos | Como será medido |
|---|---:|---|
| Correção funcional e preservação dos invariantes | 30 | O saldo não engorda mais em perdas |
| Testes de regressão, integração e casos-limite | 20 | Adicionadas e passadas fixtures E2E rigorosas nas transições de estados e parciais |
| Segurança, integridade transacional e concorrência | 15 | Idempotência e FOR UPDATE avaliados |
| Aderência integral à especificação | 15 | Idêntico entre avulsos e comandas |
| Qualidade de código, clareza e manutenibilidade | 10 | DRY code em server.js |
| Operação, observabilidade, documentação e rollback | 5 | Log visível |
| Disciplina de escopo, commit e reprodutibilidade | 5 | Apenas estoque fixado |
