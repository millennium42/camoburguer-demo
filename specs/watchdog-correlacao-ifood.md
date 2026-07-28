# Watchdog e correlação exata iFood

## Requisitos exatos

- REQ-001: Comando iFood em `awaiting_event` recebe deadline persistido de dois minutos.
- REQ-002: Deadline vencido entra no mesmo claim com lease e reconcilia antes de qualquer decisão.
- REQ-003: No máximo três tentativas totais levam a `dead_letter`, nunca espera infinita.
- REQ-004: Evento correlaciona por pedido, ação, external id e, quando presente, `correlationId` exato.
- REQ-005: Sem correlationId, somente um único candidato não terminal inequívoco pode ser concluído.
- REQ-006: `CANCELLATION_REQUEST_FAILED` afeta somente comando `cancel`, jamais `accept`.
- REQ-007: Evento tardio/duplicado não reabre nem altera comando terminal.
- REQ-008: Reprocessamento administrativo de dead-letter volta para reconciliação, não reenvio.

## Restrições

- CON-001: Watchdog reutiliza lease/outbox e não cria timer por comando.
- CON-002: Sem chamadas reais em teste.
- CON-003: Migração de `awaiting_event` sem deadline agenda reconciliação imediata.

## Casos extremos

- EDGE-001: Dois watchdogs não possuem o mesmo comando.
- EDGE-002: Ordem invertida não regride domínio.
- EDGE-003: Ambiguidade de múltiplos candidatos permanece observável.

## Definição de concluído

- DONE-001: Relógio controlado cobre deadline, reconciliação e dead-letter.
- DONE-002: Eventos normal, duplicado, tardio e falha de cancelamento são testados.
- DONE-003: Reprocessamento controlado e migração são testados.
- DONE-004: Gates passam.
