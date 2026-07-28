# Especificação H-03: Reconciliar Cancelamento sem Confirmar Pedido

## 1. Problema e Evidências
Atualmente, as integrações iFood e Delivery Much verificam o status externo (ex: `CANCELLED`) para determinar se o comando local `accept` foi aplicado (assumindo que "cancelado" engloba uma fase pós-aceite perante a API externa). Contudo, a função de orquestração `finalizeCommand` em ambos os adaptadores lê cega e unicamente o `command.action === "accept"` e invoca `activateAcceptedOrder()`. Isso gera uma grave violação: a loja emite tickets na cozinha e desconta estoques para um pedido já morto na plataforma.

## 2. Comportamento Atual vs Desejado
**Atual:**
- Comando "accept" aciona API. Por falha de rede (ou timeout), vira "ambíguo".
- A reconciliação busca o status e vê `CANCELLED` e marca `applied = true`.
- `finalizeCommand` força transição para "confirmed" localmente, disparando deduções e impressões.

**Desejado:**
- A função de reconciliação retorna estado explícito, informando não apenas `applied: true` e `externalStatus`, mas também `localEffect: "cancel"`.
- `command-outbox.js` transporta esse `localEffect`.
- `finalizeCommand` avalia o `localEffect` e, se for `"cancel"`, delega via `applyIntegratedTransition(..., "cancelled")`, garantindo consistência com o banco e integridade de estoque, sem invocar tickets na cozinha.

## 3. Invariantes de Domínio e Segurança
1. Um pedido resolvido externamente como `CANCELLED` sempre resulta no efeito local `"cancel"` (estado `"cancelled"` no banco), independente da intenção original do comando.
2. A transição para `"cancelled"` em um pedido que ainda está em `"received"` jamais afeta o balanço de estoque (pois as deduções só se consolidam de `"confirmed"` em diante).
3. A mutação do pedido, command e channel mapping ocorre obrigatoriamente englobada em uma única transação atômica (`db.transaction`).

## 4. Estados e Transições Afetadas
- Pedidos originalmente `"received"` que reconciliam como `CANCELLED`: movem para `"cancelled"` sem baixa de estoque e sem ativação.
- Pedidos em retry e replay lidarão deterministicamente com `localEffect: "cancel"`.

## 5. Contratos HTTP e Persistência
- Sem alterações estruturais de esquema de DB ou requisições às APIs de parceiros.

## 6. Arquivos e Símbolos
- `apps/api/src/integrations/providers/ifood.js`: Refatorar `reconcileCommand` e `finalizeCommand`.
- `apps/api/src/integrations/providers/deliverymuch.js`: Refatorar `reconcileCommand` e `finalizeCommand`.
- `apps/api/src/integrations/command-outbox.js`: Atualizar a passagem de parâmetro injetando `localEffect: result.localEffect || command.action`.
- `tests/integrations.test.js`: Expandir a suíte para capturar a reconciliação do `accept` frente a um `CANCELLED`.

## 7. Estratégia de Migração e Compatibilidade
Totalmente retrocompatível; os comandos "sujos" pendentes na fila receberão a reconciliação correta assim que o novo código rodar via poller.

## 8. Testes Planejados
1. Unitário/Integração para iFood: `accept` + estado externo `CANCELLED` -> resulta em `cancelled` sem chamadas de impressora ou estoque.
2. Unitário/Integração para Delivery Much: mesmo que acima.
3. Teste transacional em cenário concorrente de compensação idempotente.

## 9. Riscos, Rollback e Fora de Escopo
- **Risco:** Ausente, pois solidifica e limita os danos de cancelamento surpresa.
- **Fora de Escopo:** Habilitar endpoints reais. O teste acontecerá em mock isolado.
- **Rollback:** `git checkout main -- apps/api/src/integrations`.

## 10. Rubrica de Autoavaliação Congelada (100 pontos)

| Critério | Pontos | Avaliação/Métrica |
|---|---:|---|
| Correção funcional e preservação dos invariantes | 30 | `activateAcceptedOrder` nunca é acionado se estado for `CANCELLED`. |
| Testes de regressão, integração e casos-limite | 20 | Testes de integração na suíte oficial falham sem a mudança e passam com a mudança. |
| Segurança, integridade transacional e concorrência | 15 | Manipulação confinada no transaction callback em `command-outbox`. |
| Aderência integral à especificação | 15 | `localEffect` modelado em todos os layers. |
| Qualidade de código, clareza e manutenibilidade | 10 | Javascript claro sem magic strings espalhadas. |
| Operação, observabilidade, documentação e rollback | 5 | Compatível via fallback silencioso (`command.action`). |
| Disciplina de escopo, commit e reprodutibilidade | 5 | 1 Commit isolado na branch. |
