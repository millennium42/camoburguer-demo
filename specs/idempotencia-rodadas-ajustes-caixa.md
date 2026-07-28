# Idempotência de rodadas e ajustes de caixa

## Requisitos exatos

- REQ-001: A UI mantém a chave da rodada enquanto payload e comanda não mudarem.
- REQ-002: Sucesso ou mudança material gera nova tentativa.
- REQ-003: Reforço/sangria exige `Idempotency-Key`.
- REQ-004: Fingerprint de ajuste inclui turno, tipo, valor em centavos e motivo.
- REQ-005: Replay idêntico não duplica lançamento nem esperado.
- REQ-006: Divergência de turno/tipo/valor/motivo retorna `409`.
- REQ-007: Claim, lançamento e atualização do turno são uma transação.

## Restrições

- CON-001: Reutilizar o mecanismo canônico da correção 06.
- CON-002: Não abranger outros movimentos financeiros.

## Casos extremos

- EDGE-001: Resposta perdida e duplo clique produzem um efeito.
- EDGE-002: Falha após claim faz rollback.
- EDGE-003: Registro legado sem fingerprint falha fechado.

## Definição de concluído

- DONE-001: Testes UI cobrem ciclo da chave.
- DONE-002: PostgreSQL real cobre replay, divergência e concorrência.
- DONE-003: Gates gerais passam.
