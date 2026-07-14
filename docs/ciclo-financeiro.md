# Ciclo Financeiro

## Escopo da v1

Financeiro gerencial automático, sem fiscal pesado e sem CMV detalhado.

## Gatilhos automáticos

- `order.completed` gera lançamento de venda
- `order.cancelled` após conclusão gera reversão
- `cash.shift.opened` registra abertura
- `cash.adjustment.created` registra reforço ou sangria
- `cash.shift.closed` registra fechamento e diferença

## Regras do caixa

- O caixa possui apenas os estados `open` e `closed`; a tela deve mostrar o estado atual.
- Abrir é permitido somente quando estiver `closed`; fechar e adicionar movimentação são permitidos somente quando estiver `open`.
- Reforço e sangria são criados pelo botão **Adicionar movimentação**, que abre um pop-up para escolher o tipo, informar valor e observação e confirmar.
- O fechamento exige o valor declarado e registra a diferença sem ocultar movimentos anteriores.

## Visões gerenciais

- faturamento bruto
- ticket médio
- pedidos por canal
- recebimentos por forma de pagamento
- movimento por data
- movimento por turno
- diferença de caixa
- horário de pico
