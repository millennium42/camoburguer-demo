# Ciclo do Pedido

## Comandas locais

Uma comanda livre identifica consumo local sem exigir cadastro fixo de mesas. O operador abre `tab` ou `table`, monta o carrinho existente e envia uma rodada. Cada rodada continua sendo um pedido confirmado do núcleo único, com `tabId`, número sequencial e ticket próprio. Pedidos de canais externos permanecem sem comanda.

Rodadas não carregam forma de pagamento e não geram venda ao concluir a cozinha. O endpoint de fechamento já protege comandas com saldo, mas o encerramento de uma comanda utilizada só se torna operacional após o registro dos pagamentos na PR específica.

## Estados

- `received`
- `confirmed`
- `in_preparation`
- `ready`
- `completed`
- `cancelled`

## Eventos relevantes

- `order.created`
- `order.confirmed`
- `ticket.generated`
- `ticket.printed`
- `ticket.print.failed`
- `order.status.changed`
- `order.completed`
- `order.cancelled`

## Regras principais

- O domínio monta o pedido em `received`, mas `POST /orders` confirma e persiste a finalização em uma única transação; por isso a fila pública recebe o pedido em `confirmed`.
- A seleção de produto adiciona uma linha ao pedido em montagem; seleções repetidas acumulam quantidade e itens distintos permanecem no mesmo pedido.
- Cada item e o pedido completo aceitam desconto percentual digitável entre `0` e `100`, inclusive; valores fora desse intervalo são rejeitados também no domínio e no banco.
- O total aplica primeiro o desconto de cada item e depois o desconto geral sobre o subtotal resultante.
- Finalizar exige ao menos um item e, em `delivery`, endereço preenchido; a ação usa uma chave idempotente, persiste uma única vez e limpa a montagem somente após sucesso.
- Finalizar confirma o pedido e dispara a geração e impressão do ticket para a cozinha; falha de impressão não pode apagar o pedido.
- Repetir a mesma finalização devolve o pedido existente sem repetir impressão ou lançamento financeiro.
- Cozinha trabalha sobre a fila operacional, não sobre o canal.
- Ao concluir, o pedido pode gerar movimento financeiro automático.
- Ao cancelar depois de concluído, o sistema gera reversão financeira.
