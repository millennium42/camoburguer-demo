# Spec — Fila de impressão com dead-letter

## Decisões recomendadas

- Tamanho máximo: 64 KiB medidos em `Buffer.byteLength(JSON.stringify(payload), "utf8")`, antes de persistir e antes de enviar.
- Status canônicos: `pending`, `sending`, `retry_wait`, `printed`, `dead_letter`.
- Máximo de 5 tentativas; backoff exponencial de base 5 s, teto 5 min e jitter determinístico por job.
- Reprocessamento manual somente por admin, a partir de `dead_letter`, sem alterar conteúdo ou identificador.

## Requisitos

- REQ-01: reserva rejeita ticket cujo payload HTTP exato ultrapassa 64 KiB; não trunca.
- REQ-02: worker reivindica job atomicamente com lease, `FOR UPDATE SKIP LOCKED` e dono explícito.
- REQ-03: classificar timeout, rede, 408, 425, 429 e 5xx como transitórios; demais 4xx, payload inválido e ticket grande como permanentes.
- REQ-04: falha transitória agenda `retry_wait`; no máximo de tentativas vira `dead_letter`.
- REQ-05: aceitar do bridge somente `printed` e `already_printed`; status desconhecido é erro permanente controlado.
- REQ-06: antes de reenviar caso ambíguo, consultar o bridge pelo `jobId`; `printed`/`already_printed` reconcilia sem POST cego.
- REQ-07: bridge mantém recibo persistente por `jobId`; POST repetido retorna `already_printed` e não sobrescreve/reimprime.
- REQ-08: endpoint admin de reprocessamento registra `audit_events`, preserva payload/jobId e agenda reconciliação.
- REQ-09: anonimização LGPD continua sobrescrevendo artefatos do spool e metadados relacionados.

## Restrições

- CON-01: preservar `domínio -> print_jobs -> API -> print-bridge -> spool`.
- CON-02: não prometer exatamente uma impressão física sem prova do hardware; garantir dedupe lógico no bridge.
- CON-03: migração converte `failed` para `retry_wait`, `sending` expirado para reconciliação e não reabre `dead_letter`.
- CON-04: rollback de código mantém colunas novas; downgrade de estados só por procedimento explícito.

## Bordas

- EDGE-01: Unicode é medido pelos bytes realmente enviados.
- EDGE-02: dois workers não adquirem o mesmo lease.
- EDGE-03: ACK perdido após spool converge via GET de recibo.
- EDGE-04: dead-letter cresce de forma consultável e reprocessamento é unitário.

## Pronto

- DONE-01: testes cobrem bytes, classificação, backoff, limite, concorrência, status desconhecido e ACK perdido.
- DONE-02: testes do bridge usam spool temporário e provam idempotência persistente.
- DONE-03: RBAC e auditoria do reprocessamento são comprovados.
- DONE-04: contrato textual do ticket registra limites físicos e política LGPD.
