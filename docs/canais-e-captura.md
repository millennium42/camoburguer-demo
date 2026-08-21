---
tags: [integracao, canais]
---

# Canais e Captura — Camoburguer Demo

> Estratégia de captura de pedidos e estado atual de cada integração. O sistema
> é `manual-first`: adapters ficam desligados por padrão e todos os canais
> entram no mesmo payload de pedido. Nenhuma regra de UI pode depender do canal
> para funcionar.

---

# Guia de uso

## Fontes de pedido

| Canal | Como entra |
|---|---|
| `counter` | Pedido lançado diretamente pelo operador |
| `whatsapp` | Pedido recebido fora do sistema e digitado pelo operador |
| `ifood` | Pedido capturado por adapter opcional ou digitado manualmente com origem preservada |
| `deliverymuch` | Pedido capturado por adapter opcional |
| `olaclick` | Pedido capturado manualmente ou por adapter futuro |

A origem do pedido é preservada como metadado operacional e financeiro.

## Campos mínimos por captura

- **Origem:** canal que gerou o pedido
- **Nome do cliente**
- **Atendimento:** `delivery`, `pickup` (retirada) ou `local`
- **Endereço completo:** obrigatório somente em `delivery`
- **Itens:** SKU, quantidade, adicionais e observações por item
- **Observações gerais**
- **Forma de pagamento**

- **Trava:** `counter`, WhatsApp, iFood, Delivery Much e OlaClick são origens
  do pedido — não substituem a escolha de atendimento. A demo não coleta operador,
  login ou perfil administrativo.

## Fila de autorização (pedidos externos)

Pedidos de canais externos (iFood, Delivery Much) não entram diretamente na fila
da cozinha. Ficam em `received` até o operador Aceitar ou Recusar explicitamente.

- Só após confirmação o pedido é ativado no núcleo local, baixa estoque e
  reserva ticket.
- **Trava:** não habilitar integrações reais enquanto API/SSE estiverem sem
  autenticação de operador.

---

# Guia de desenvolvimento

## Estado das integrações

| Canal | Estado atual |
|---|---|
| **iFood** | Autenticação, polling do módulo Events, detalhe de pedido, comandos e ACK pós-commit implementados — **não homologados** com credenciais/sandbox reais |
| **Delivery Much** | Autenticação e polling/comandos implementados contra o contrato disponível — rotas detalhadas **precisam ser confirmadas** na documentação privada do parceiro |
| **OlaClick** | Captura manual disponível; adapter futuro não planejado para esta versão |

## Mecanismos de idempotência e sincronização

- `channel_events` — deduplicação do evento bruto do parceiro
- `channel_mappings` — vínculo merchant/pedido externo ao único `order` local,
  expõe estado de sincronização
- `channel_commands` — outbox de aceite, cancelamento, preparo e pronto

Esses mecanismos **não são um segundo núcleo de pedidos** — são instrumentos
de sincronização ligados ao agregado `orders`.

## Estratégia v1

- Manual-first: adapters desligados por padrão.
- Todos os canais normalizam para o mesmo payload de pedido.
- Comportamento de canal fica em adapters ou regras de cenário, nunca na UI.

## Pendentes antes de habilitar integrações reais

1. Autenticação e autorização de operador em API/SSE (gate P0).
2. Fixtures sanitizadas de token, evento, detalhe e comando por parceiro.
3. Testes de duplicata, fora de ordem, timeout, `401`, `429` e `5xx`.
4. Prova de commit local antes do ACK e reconciliação de dead-letter.
5. **iFood:** sandbox e credenciais oficiais.
6. **Delivery Much:** acesso ao contrato privado (Postman/portal oficial).

Ver gates detalhados em [deploy-e-infraestrutura.md](deploy-e-infraestrutura.md).

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[arquitetura-do-sistema.md](arquitetura-do-sistema.md) ·
[ciclo-do-pedido.md](ciclo-do-pedido.md) ·
[automacoes-por-cenario.md](automacoes-por-cenario.md)
