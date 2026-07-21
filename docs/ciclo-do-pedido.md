# Ciclo do Pedido

## Comandas locais

Uma comanda livre identifica consumo local sem exigir cadastro fixo de mesas. O operador abre `tab` ou `table`, monta o carrinho existente e envia uma rodada. Cada rodada continua sendo um pedido confirmado do núcleo único, com `tabId`, número sequencial e ticket próprio. Pedidos de canais externos permanecem sem comanda.

Rodadas não carregam forma de pagamento e não geram venda ao concluir a cozinha. A comanda recebe parcelas independentes até zerar o saldo em centavos; só então pode ser encerrada, mesmo que tickets da cozinha ainda estejam em outro estado.

Itens do rascunho podem ser alterados livremente. Depois do envio, toda correção referencia a linha estável da rodada original e cria uma rodada negativa de cancelamento, com ticket próprio. Cancelamentos parciais respeitam a quantidade ainda não cancelada e não sobrescrevem pedido ou ticket original.

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
- `tab.payment.recorded`
- `tab.payment.reversed`
- `tab.closed`

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

## Pedidos externos

- Pedido iFood/Delivery Much é normalizado em `received` sem baixar estoque ou imprimir.
- Aceite/recusa cria comando idempotente para o adapter; a chave deve sobreviver a retry de rede.
- iFood só ativa o pedido local depois do evento de confirmação. Delivery Much ativa após resposta positiva ao comando, sujeito à homologação do contrato privado.
- Preparo/pronto usam o adapter quando o canal oferece a operação; diferenças ficam no adapter, não na máquina de estados visual.
- Evento externo é gravado antes do ACK e duplicatas não recriam pedidos.
