# H-04: Preservar meios de pagamento externos

## 1. Problema e Evidências
O adapter iFood converte falhamente múltiplos pagamentos offline ou não correspondentes em `app_paid` (pagamento online do aplicativo) nas linhas 104 e 105. O Delivery Much simplesmente não envia nenhum `paymentMethod`, fazendo a lógica de ingestão (`order-ingestion.js:35`) assumir `app_paid`. Essa sobre-substituição elimina o saldo de "a receber" local e distorce contabilidade (caixa e conciliações online). 

## 2. Comportamento Atual x Desejado
**Atual:** Múltiplas entradas offline do iFood viram `app_paid`. Entradas não formatadas do DM viram `app_paid`. Na sumarização, tudo de `app_paid` é computado no montante final ou descartado cegamente, não permitindo divisão correta em métodos `mixed`.
**Desejado:**
1. Os adaptadores deverão analisar os campos de `payments.methods` e exportá-los em uma nova propriedade `metadata.externalPayments` no formato `[{ method, amount, type }]`.
2. Se houver mais de um método originado, o `paymentMethod` principal do pedido virará `mixed`. 
3. Se um adaptador falhar em identificar pagamentos ou não houver meios, adotará `payment_reconciliation_required` em vez de presumir `app_paid`.
4. O resumo financeiro iterará por `metadata.externalPayments` caso o tipo seja `mixed`, segregando corretamente os montantes por tipo, desprezando `type: "online"` do balanço de Caixa mas contando nas vendas.

## 3. Invariantes de Domínio e Segurança
- `finance_entries` mantém sua unicidade via INDEX `finance_entries_one_order_effect (order_id, type)`. NENHUMA linha a mais é introduzida para as vendas (`sale`).
- Os somatórios brutos e totais se manterão exatos, a granularidade afeta apenas a métrica de "Caixa".
- Operações de rollback financeiro (ex: cancelamentos) usarão os mesmos `externalPayments` na mutação do log.

## 4. Estados, Transições e Arquivos
- **Adapters (`apps/api/src/integrations/providers/ifood.js` e `deliverymuch.js`)**: Adaptar parsers para derivar os `externalPayments` reais de recebimentos.
- **Ingestão (`apps/api/src/integrations/order-ingestion.js`)**: Abolir o default silencioso `"app_paid"` -> aplicar `"payment_reconciliation_required"`. Repassar `input.externalPayments` para a persistência em `metadata.externalPayments`.
- **Core (`packages/finance-core/index.js`)**: Extrair as parcelas em `summarizeFinance()` e passá-las na `buildEntriesFromOrder()` dentro do payload de `metadata`.

## 5. Estratégia de Migração e Compatibilidade
- Pedidos antigos (`order`) que não possuem `metadata.externalPayments` e têm tipo nativo continuarão utilizando `order.paymentMethod` em `summarizeFinance`, suportando transição fluída (100% retrocompatível).

## 6. Testes Específicos
- Fixtures online puros (iFood e Delivery Much).
- Fixtures de offline único (ex: cash, pix)
- Fixture mistos (ex: cash e credit).
- Validação em pipeline de relatórios e de caixa sem duplicidade online.
- Teste de idempotência validando `repeated: true`.

## 7. Critérios de Aceitação e Riscos
- Testes listados acima aprovados.
- Nenhuma string "mágica" nova, adoção apenas da flag de reconciliação.
- Risco zero, visto que falhas de detecção acionam `payment_reconciliation_required` invés de fingir um pagamento e roubar dinheiro contábil.

## 8. Rubrica de Autoavaliação
| Critério | Pontos | Como será medido |
|---|---:|---|
| Funcional | 30 | `finance-core` distribui múltiplos meios e os converte para frontend via JSON `externalPayments` |
| Testes | 20 | Adicionadas e passadas fixtures E2E rigorosas em suítes para pagamentos mistos e nulos |
| Integridade e Concorrência | 15 | Unicidade de `finance_entries` respeitada perante pagamentos múltiplos e transação segura mantida. |
| Aderência | 15 | Reconciliação sem omissões e ausência total de preenchimentos fantasma de `app_paid`. |
| Qualidade de código | 10 | Evitou refs circulares, padronizou nome dos arrays JSON |
| Observabilidade e Rollback | 5 | Inseriu tag `payment_reconciliation_required` em falta de informação, permitindo ação humana, compatibilidade total com pedidos velhos |
| Disciplina Git | 5 | Commit único limpo ao final |
