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
