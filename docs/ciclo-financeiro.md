# Ciclo Financeiro

## Escopo da v1

Financeiro gerencial automático, sem fiscal pesado e sem CMV detalhado.

## Gatilhos automáticos

- `order.completed` gera lançamento de venda
- `order.cancelled` após conclusão gera reversão
- `tab.payment.recorded` gera uma venda por parcela, preservando a forma de pagamento
- `tab.payment.reversed` gera cancelamento compensatório sem apagar a parcela original
- `cash.shift.opened` registra abertura
- `cash.adjustment.created` registra reforço ou sangria
- `cash.shift.closed` registra fechamento e diferença

O lançamento de venda usa o total final do pedido, já considerando os descontos por item e o desconto geral.

Comandas usam centavos inteiros: o consumo soma rodadas, o pago soma parcelas e estornos assinados, e o saldo é a diferença exata. Mais de um método ativo deriva `mixed`, mas cada lançamento mantém seu método real.

## Regras do caixa

- O caixa possui apenas os estados `open` e `closed`; a tela deve mostrar o estado atual.
- Abrir é permitido somente quando estiver `closed`; fechar e adicionar movimentação são permitidos somente quando estiver `open`.
- Reforço e **Retirada (sangria)** são criados pelo botão **Adicionar movimentação**, que abre um pop-up para escolher o tipo, informar valor e observação e confirmar. A retirada usa o tipo existente `withdrawal`; não existe categoria duplicada.
- O fechamento exige o valor declarado e registra a diferença sem ocultar movimentos anteriores.
- Somente parcelas de comanda em dinheiro alteram o caixa esperado; outros métodos alteram faturamento, não numerário.
- Toda parcela ou estorno de comanda exige turno aberto para manter vínculo temporal; estorno em dinheiro compensa o turno atual e referencia o pagamento/turno original nos metadados.

## Visões gerenciais

- faturamento bruto
- ticket médio
- pedidos por canal
- recebimentos por forma de pagamento
- movimento por data
- movimento por turno
- diferença de caixa
- horário de pico

O filtro por forma de pagamento e tipo de lançamento é único para a tela: a mesma query alimenta listagem, cards, totais e distribuição por método. **Limpar filtro** restaura o consolidado completo.

## Relatórios e Fechamento (Impressão)
Turnos de caixa com o estado closed habilitam opções de impressão (Client-side, via window.print()):
- **Resumo**: Fita consolidada (vendas, entradas, saídas, esperado vs. apurado).
- **Detalhado**: Resumo financeiro acrescido de uma fita analítica listando cronologicamente todas as movimentações.
## Timezone operacional e reconciliação

Os instantes são persistidos como `TIMESTAMPTZ`/UTC. Relatórios, filtros civis
e tickets convertem uma única vez para `BUSINESS_TIME_ZONE`, cujo padrão
validado é `America/Sao_Paulo`; o timezone do processo e do navegador não
participa da regra financeira.

`paymentsByMethod` é líquido: vendas somam e cancelamentos/estornos subtraem no
método original. Legado sem método entra em `unattributed`, nunca em dinheiro
por suposição. A soma por método é publicada com uma reconciliação contra
`netSales`. A mudança é apenas de interpretação do relatório; não reescreve
timestamps históricos e pode ser revertida sem migração de dados.

## Legado sem turno

Cancelamento usa o `shift_id` do lançamento de venda original, inclusive quando
o turno já está fechado. Registros históricos com venda concluída e
`finance_entries.shift_id IS NULL` não são associados silenciosamente a um
turno atual; o estorno permanece sem turno para preservar a verdade histórica.
O diagnóstico recomendado é:

```sql
SELECT order_id, occurred_at
FROM finance_entries
WHERE type = 'sale' AND shift_id IS NULL;
```

Não há backfill automático. Rollback de aplicação não remove ou reatribui
lançamentos; qualquer correção histórica exige plano aprovado e trilha de
auditoria separada.
