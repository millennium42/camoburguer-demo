# Ciclo do Pedido

## Comandas locais

Uma comanda livre identifica consumo local sem exigir cadastro fixo de mesas. O operador abre `tab` ou `table`, monta o carrinho existente e envia uma rodada. Cada rodada continua sendo um pedido confirmado do núcleo único, com `tabId`, número sequencial e ticket próprio. Pedidos de canais externos permanecem sem comanda.

Rodadas criadas diretamente na comanda não capturam forma de pagamento e não geram venda ao concluir a cozinha. Um pedido vinculado posteriormente pode preservar a forma originalmente capturada apenas como histórico, sem efeito na liquidação ou no financeiro da comanda. A comanda recebe parcelas independentes até zerar o saldo em centavos; só então pode ser encerrada, mesmo que tickets da cozinha ainda estejam em outro estado.

Itens do rascunho podem ser alterados livremente. Depois do envio, toda correção referencia a linha estável da rodada original e cria uma rodada negativa de cancelamento, com ticket próprio. Cancelamentos parciais respeitam a quantidade ainda não cancelada e não sobrescrevem pedido ou ticket original.

Um pedido local já confirmado pode ser vinculado uma única vez a comanda aberta, existente ou criada atomicamente com o vínculo. São elegíveis apenas rodadas de produção sem comanda, sem integração efetiva, sem pagamento no aplicativo ou lançamento financeiro, nos estados `confirmed`, `in_preparation` ou `ready`. `received`, `completed`, `cancelled`, delivery, retirada, corretivos e pedidos integrados são bloqueados.

O vínculo atribui `tabId`, próximo `roundNumber` e metadados auditáveis sem alterar itens, total, status, estoque, forma de pagamento histórica ou ticket emitido. A liquidação futura passa a ocorrer pelas parcelas da comanda. Não há transferência entre comandas nesta versão.

### Contrato de vínculo tardio

`POST /orders/:orderId/tab-assignment` exige o cabeçalho `Idempotency-Key` e exatamente um dos corpos:

```json
{ "tabId": "id-da-comanda-aberta" }
```

```json
{ "newTab": { "kind": "tab", "label": "Comanda 12", "customerName": "Ana" } }
```

`kind` aceita `tab` ou `table`. A primeira atribuição retorna `201`; replay da mesma chave, pedido e payload retorna `200` com `repeated: true`. Chave reutilizada com outro payload, destino fechado/duplicado ou pedido inelegível retorna `409`; pedidos e comandas inexistentes retornam `404`. A resposta contém `assignment`, `order`, `tab` e `repeated`.

Uma atribuição efetiva emite uma vez `order.tab.assigned` no stream `/events/orders`, com a mesma resposta em `payload`. Replay não emite novo evento. Depois do vínculo, desconto direto no pedido é bloqueado; correções usam rodada negativa da comanda.

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
- `order.tab.assigned`
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
- Itens `direct_handoff` aparecem no mesmo ticket como entrega direta e não governam o preparo; pedidos sem item de cozinha avançam diretamente para `ready`.
- Ao concluir, o pedido pode gerar movimento financeiro automático.
- Ao cancelar depois de concluído, o sistema gera reversão financeira.

## Pedidos externos

- Pedido iFood/Delivery Much é normalizado em `received` sem baixar estoque ou imprimir.
- Aceite/recusa cria comando idempotente para o adapter; a chave deve sobreviver a retry de rede.
- iFood só ativa o pedido local depois do evento de confirmação. Delivery Much ativa após resposta positiva ao comando, sujeito à homologação do contrato privado.
- Preparo/pronto usam o adapter quando o canal oferece a operação; diferenças ficam no adapter, não na máquina de estados visual.
- Evento externo é gravado antes do ACK e duplicatas não recriam pedidos.
