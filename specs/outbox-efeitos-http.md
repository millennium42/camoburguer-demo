# Outbox para efeitos HTTP externos

## Objetivo

Garantir que nenhuma chamada ao parceiro ocorra dentro de transação PostgreSQL e que comandos sobrevivam a concorrência, crash e resultado ambíguo sem reenvio cego.

## Requisitos exatos

- REQ-001: Claim de comando ocorre em transação curta com `FOR UPDATE SKIP LOCKED`, owner e lease de 60 segundos.
- REQ-002: HTTP ocorre somente após commit do claim.
- REQ-003: Finalização ocorre em nova transação e exige o mesmo owner.
- REQ-004: Lease expirado após tentativa enviada muda o comando para reconciliação; não o reenvia.
- REQ-005: Reconciliação consulta o parceiro e decide `applied`, `not_applied` ou `unknown`.
- REQ-006: Somente `not_applied` comprovado volta a `pending`; `unknown` permanece ambíguo com backoff.
- REQ-007: Erro comprovadamente anterior ao envio pode tentar novamente, com no máximo três tentativas e backoff.
- REQ-008: Dois workers não podem possuir o mesmo comando simultaneamente.
- REQ-009: Cada chamada envia correlação/idempotência estável derivada do comando.
- REQ-010: Polling de entrada busca HTTP fora da transação; apenas dedupe, ingestão e transições persistem dentro dela.
- REQ-011: Resposta, erro, tentativas, timestamps, correlação, owner e lease são auditáveis sem segredos.
- REQ-012: Comandos iFood aguardam evento correlacionado; Delivery Much finaliza estado local após sucesso/reconciliação aplicada.

## Restrições

- CON-001: Não adicionar broker nem dependência de runtime.
- CON-002: Não registrar token, senha, header Authorization ou payload pessoal desnecessário.
- CON-003: Migração é aditiva e mantém comandos pendentes existentes.
- CON-004: Rollback não remove colunas nem comandos; versão anterior deve permanecer desligada durante retorno.

## Casos extremos

- EDGE-001: Crash antes do HTTP deixa lease recuperável e reconcilia.
- EDGE-002: Parceiro aceita e a finalização falha; próxima execução reconcilia sem segundo POST/PATCH.
- EDGE-003: Dois workers concorrentes processam um comando uma vez.
- EDGE-004: Worker sem ownership não finaliza o comando.
- EDGE-005: Timeout/5xx é ambíguo; 4xx determinístico falha ou reprograma conforme classe.
- EDGE-006: Lease é maior que o timeout HTTP, impedindo perda silenciosa durante worker vivo.

## Definição de concluído

- DONE-001: Teste afirma HTTP sempre fora de transação.
- DONE-002: Fault injection cobre crash antes/depois de cada fronteira.
- DONE-003: Teste concorrente cobre exclusão de workers e recuperação de lease.
- DONE-004: Testes cobrem ambiguidade, reconciliação e limite/backoff.
- DONE-005: Migração/rollback e diagrama de estados estão documentados.
- DONE-006: Gates gerais e smoke com adapters falsos passam.
