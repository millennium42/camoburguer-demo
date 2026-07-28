# Bloquear desconto após efeito financeiro

## Requisitos exatos

- REQ-001: Desconto é permitido somente antes de qualquer `finance_entry` do pedido.
- REQ-002: Pedido `completed` ou `cancelled` rejeita desconto com `409`.
- REQ-003: Verificação do ledger e atualização do pedido ocorrem na mesma transação sob lock do pedido.
- REQ-004: Corrida desconto × conclusão serializa em desconto anterior à venda ou bloqueio após venda.
- REQ-005: Lançamentos históricos nunca são editados.
- REQ-006: Cancelamento de venda concluída usa o total congelado e lança compensação integral, resultando líquido zero.
- REQ-007: Valores continuam na representação monetária existente de duas casas.

## Restrições

- CON-001: Não criar compensação de desconto nem refatorar o ledger.
- CON-002: Não corrigir apenas a UI.
- CON-003: Legado com efeito financeiro é bloqueado conservadoramente.

## Casos extremos

- EDGE-001: Qualquer tipo de lançamento do pedido bloqueia o desconto.
- EDGE-002: Falha intermediária faz rollback.
- EDGE-003: Repetição de cancelamento não duplica compensação.

## Definição de concluído

- DONE-001: Teste PostgreSQL cobre desconto antes/depois de efeito e estados terminais.
- DONE-002: Teste concorrente cobre conclusão × desconto.
- DONE-003: Venda 100, desconto bloqueado e cancelamento fecham líquido exatamente zero.
- DONE-004: Gates e documentação passam.
