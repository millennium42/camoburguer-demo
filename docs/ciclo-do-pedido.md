---
tags: [dominio, pedido, fonte-da-verdade]
---

# Ciclo do Pedido — Camoburguer Demo

> Fonte da verdade para estados, transições e regras de pedido, comanda e
> vínculo tardio. Atualizar este documento antes de qualquer mudança de
> estado, invariante ou contrato de vínculo — o código implementa o que
> está aqui, não o contrário.

---

# Guia de uso

## Estados do pedido

- `received` — pedido externo aguardando autorização do operador
- `confirmed` — pedido persistido e na fila da cozinha
- `in_preparation` — cozinha iniciou o preparo
- `ready` — pronto para entrega ou retirada
- `completed` — entregue ao cliente; gera lançamento financeiro
- `cancelled` — cancelado; gera reversão financeira se já estava concluído

## Comandas locais

Uma comanda livre identifica consumo local sem exigir cadastro fixo de mesas.
O operador abre `tab` ou `table`, monta o carrinho existente e envia uma rodada.
Cada rodada continua sendo um pedido confirmado do núcleo único, com `tabId`,
número sequencial e ticket próprio.

- **Trava:** pedidos de canais externos permanecem sem comanda.
- Rodadas criadas diretamente na comanda não capturam forma de pagamento e não
  geram venda ao concluir a cozinha.
- A comanda recebe parcelas independentes até zerar o saldo em centavos; só
  então pode ser encerrada, mesmo que tickets da cozinha ainda estejam em outro
  estado.

## Correções (rodadas negativas)

Itens do rascunho podem ser alterados livremente. Depois do envio, toda correção
referencia a linha estável da rodada original e cria uma rodada negativa de
cancelamento, com ticket próprio.

- Cancelamentos parciais respeitam a quantidade ainda não cancelada.
- Pedido original e ticket emitido **nunca são reescritos**.
- Cancelamento antes de `in_preparation` restitui estoque; após o início do
  preparo, o corretivo comercial não repõe estoque — operador registra ajuste
  manual.

## Pedidos externos (iFood / Delivery Much)

- Pedido externo entra em `received` sem baixar estoque ou imprimir.
- Aceite/recusa cria comando idempotente para o adapter.
- iFood só ativa o pedido local depois do evento de confirmação.
- Delivery Much ativa após resposta positiva ao comando, sujeito à
  homologação do contrato privado.
- **Trava:** evento externo é gravado antes do ACK. Duplicatas não recriam pedidos.

---

# Guia de desenvolvimento

## Regras principais de implementação

- O domínio monta o pedido em `received`, mas `POST /orders` confirma e
  persiste em uma única transação; a fila pública recebe o pedido em `confirmed`.
- Seleção de produto acumula quantidade; itens distintos permanecem no mesmo pedido.
- Desconto percentual aceito entre `0` e `100` inclusive; o total aplica primeiro
  o desconto de cada item e depois o desconto geral sobre o subtotal resultante.
- Finalizar exige ao menos um item e, em `delivery`, endereço preenchido.
- A ação usa uma chave idempotente, persiste uma única vez e limpa a montagem
  somente após sucesso.
- Finalizar confirma o pedido e dispara ticket para a cozinha; **falha de
  impressão não pode apagar o pedido**.
- Repetir a mesma finalização devolve o pedido existente sem repetir impressão
  ou lançamento financeiro.
- Itens `direct_handoff` aparecem no mesmo ticket como entrega direta e não
  governam o preparo; pedidos sem item de cozinha avançam diretamente para `ready`.
- **Trava:** SKU conhecido usa nome/preço do snapshot canônico, nunca os valores
  enviados pelo navegador.

## Contrato de vínculo tardio

Um pedido local já confirmado pode ser vinculado **uma única vez** a comanda
aberta, existente ou criada atomicamente com o vínculo.

**Estados elegíveis:** `confirmed`, `in_preparation`, `ready`.

**Bloqueados:** `received`, `completed`, `cancelled`, delivery, retirada,
corretivos e pedidos integrados.

Endpoint: `POST /orders/:orderId/tab-assignment` — exige `Idempotency-Key`.

Corpo aceito:
```json
{ "tabId": "id-da-comanda-aberta" }
```
```json
{ "newTab": { "kind": "tab", "label": "Comanda 12", "customerName": "Ana" } }
```

- `kind` aceita `tab` ou `table`.
- Primeira atribuição retorna `201`; replay da mesma chave e payload retorna
  `200` com `repeated: true`.
- Chave reutilizada com outro payload, destino fechado/duplicado ou pedido
  inelegível retorna `409`.
- Replay não emite novo evento SSE.
- **Trava:** após o vínculo, desconto direto no pedido é bloqueado; correções
  usam rodada negativa da comanda.

## Eventos relevantes

- `order.created`, `order.confirmed`, `order.completed`, `order.cancelled`
- `order.tab.assigned`
- `ticket.generated`, `ticket.printed`, `ticket.print.failed`
- `order.status.changed`
- `tab.payment.recorded`, `tab.payment.reversed`, `tab.closed`

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[arquitetura-do-sistema.md](arquitetura-do-sistema.md) ·
[padrao-ticket-cozinha.md](padrao-ticket-cozinha.md) ·
[ciclo-financeiro.md](ciclo-financeiro.md) ·
[estoque.md](estoque.md)
