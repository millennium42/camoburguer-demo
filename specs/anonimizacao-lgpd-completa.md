# Anonimização LGPD completa e verificável

## Política técnica da demo

Não há aconselhamento jurídico. Para dados sintéticos da demo, identificadores e texto pessoal são anonimizados irreversivelmente; fatos financeiros numéricos e IDs internos são retidos sem PII. Backups gerenciados permanecem sob a política do provedor e nunca são declarados apagados por esta operação.

## Requisitos exatos

- REQ-001: Inventário cobre pedidos, comandas, itens/metadados, financeiro, mappings, eventos, comandos, atribuições, pagamentos, estoque, caixa, tickets e spool.
- REQ-002: Banco é anonimizado em uma transação.
- REQ-003: JSON relacionado tem todas as strings substituídas; números/estrutura financeira podem ser retidos.
- REQ-004: External IDs são pseudonimizados sem cópia reversível.
- REQ-005: Ticket persistido é substituído e o bridge recebe limpeza por IDs, fora da transação.
- REQ-006: Falha no bridge retorna `202 pending_external_cleanup`; não retorna sucesso falso.
- REQ-007: Operação exige `Idempotency-Key`; replay idêntico retorna o estado persistido e divergência retorna `409`.
- REQ-008: Auditoria registra ator/ação/IDs internos, nunca o termo pesquisado.
- REQ-009: Busca textual pelo canário não encontra cópia nas superfícies síncronas após conclusão.

## Restrições

- CON-001: Anonimização concluída é irreversível.
- CON-002: Não alegar eliminação de backup sem mecanismo do provedor.
- CON-003: Logs e respostas não incluem o termo.

## Casos extremos

- EDGE-001: Falha intermediária no banco faz rollback integral.
- EDGE-002: Spool ausente é idempotente; indisponível vira pendência explícita.
- EDGE-003: Retry não restaura nem duplica PII.

## Definição de concluído

- DONE-001: Canário PostgreSQL cobre cada superfície.
- DONE-002: Teste do bridge cobre limpeza e replay.
- DONE-003: Falhas de banco/bridge e estados da operação são testados.
- DONE-004: Limites de backup/log estão documentados.
- DONE-005: Gates passam.
