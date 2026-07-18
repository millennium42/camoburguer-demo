# Estoque por Categoria

## Escopo

A v1 controla unidades prontas para venda em três categorias: `xis`, `dog` e `hamburguer`. Bebidas, fritas, adicionais e ingredientes não entram neste saldo. Cada categoria inicia em zero; a quantidade real é informada por carga inicial auditada.

## Fluxo

1. Entrada ou retirada manual exige inteiro, motivo e `Idempotency-Key`.
2. Ao confirmar um pedido externo ou enviar uma rodada, a API agrega os itens por categoria.
3. Saldo é bloqueado e atualizado na mesma transação do pedido e do print job.
4. Insuficiência responde `409` e reverte pedido, movimento e impressão.
5. Retry da mesma operação recupera o pedido existente e não baixa novamente.
6. Cancelamento antes de `in_preparation` restitui as unidades canceladas uma vez.
7. Após o preparo, o corretivo comercial não repõe estoque; o operador registra ajuste manual após conferir perda ou reaproveitamento.

## Corte de migração

Pedidos que já estavam no banco antes da criação de `stock_movements` não geram saldo retroativo. Por isso, o cancelamento automático só restitui uma categoria quando encontra o movimento `sale` original daquela mesma rodada e categoria. Essa regra impede que pedidos legados criem estoque fictício. A carga inicial continua sendo uma decisão explícita do operador.

## Auditoria e limites

`stock_movements` é append-only e registra categoria, delta, motivo, pedido, chave idempotente, metadados e data. Constraints impedem saldo negativo, delta zero, categoria desconhecida e efeito duplicado por pedido/categoria/motivo. A mesma `Idempotency-Key` manual só pode repetir exatamente categoria, delta e motivo; payload diferente responde `409`, inclusive sob corrida entre categorias. Escalar para ingredientes ou receitas exige um novo modelo e está fora desta versão.
