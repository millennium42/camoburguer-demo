# Spec — SSE após fechamento de comanda

## Contrato recomendado

- Publicar `tab.closed` versão `1` no canal `orders`, exclusivamente após commit.
- Payload mínimo: `eventId`, `version`, `tabId`, `closedAt`, `roundOrderIds` e `at`; sem nome, endereço, itens ou pagamentos.
- O consumidor trata `eventId` de forma idempotente, agrega refresh e refaz `/tabs`, `/orders`, `/cash-shifts` e `/finance/summary`.

## Requisitos

- REQ-01: fechamento transacional retorna um envelope de evento, mas não publica dentro da transação.
- REQ-02: publicar somente após `db.transaction` resolver e apenas na primeira transição `open -> closed`.
- REQ-03: evento deve correlacionar comanda e rodadas concluídas, possuir versão compatível e não conter PII.
- REQ-04: SSE continua exigindo sessão e permissão `sse:orders`, inclusive heartbeat e reconexão.
- REQ-05: cliente deve aceitar duplicata sem inconsistência e coalescer tempestades em um refresh.
- REQ-06: `openEventStream` deve expor instrução de retry e o cliente deve fazer refetch ao conectar/reconectar.
- REQ-07: refetch após `tab.closed` converge rodadas, caixa e financeiro confirmados.

## Restrições

- CON-01: sem broker, tabela de eventos ou infraestrutura nova.
- CON-02: rollback ou resposta de conflito não publica.
- CON-03: compatibilidade: consumidores desconhecendo `tab.closed` continuam operando; rollback remove emissor/handler.

## Bordas

- EDGE-01: dois clientes recebem o mesmo evento e convergem.
- EDGE-02: publicação duplicada aciona no máximo um refresh pendente por cliente.
- EDGE-03: perda do evento/reconnect converge pelo refetch inicial.
- EDGE-04: falha de commit não produz bytes SSE.

## Pronto

- DONE-01: teste HTTP real com dois clientes autenticados comprova convergência.
- DONE-02: teste de rollback comprova ausência de evento.
- DONE-03: teste de UI comprova deduplicação/coalescimento e refetch de reconexão.
- DONE-04: contrato e payload documentados.
