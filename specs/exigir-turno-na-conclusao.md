# Exigir turno na conclusão

## Requisitos exatos

- REQ-001: Todo pedido avulso concluído por rota manual exige turno aberto, independentemente de dinheiro, PIX ou cartão.
- REQ-002: Ausência de turno retorna `409 CASH_SHIFT_REQUIRED` antes de alterar pedido ou ledger.
- REQ-003: Turno é lido com lock na mesma transação da transição e do lançamento.
- REQ-004: Toda venda manual persiste `shift_id` não nulo.
- REQ-005: Fechamento concorrente e conclusão serializam pelo lock do turno.
- REQ-006: `app_paid` integrado não atravessa a rota manual; comandas continuam pelo contrato de pagamentos próprio.
- REQ-007: Cancelamento de venda usa o turno histórico da venda, ainda que já fechado.

## Restrições

- CON-001: Não alterar fiscal/CMV nem redesenhar caixa.
- CON-002: Não inventar turno para legado.

## Casos extremos

- EDGE-001: Sem turno não há status, ledger, SSE, ticket ou caixa parcial.
- EDGE-002: Retry de conclusão não duplica venda.
- EDGE-003: Fechamento simultâneo não deixa `shift_id=null`.

## Definição de concluído

- DONE-001: PostgreSQL real cobre matriz cash/PIX/cartão.
- DONE-002: Concorrência conclusão × fechamento é testada.
- DONE-003: Diagnóstico de legado nulo e rollback estão documentados.
- DONE-004: Gates gerais passam.
