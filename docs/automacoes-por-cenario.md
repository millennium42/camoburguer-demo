# Automações por Cenário

## Estratégia

A v1 não cria personalização bespoke por cliente. Em vez disso, usa regras configuráveis por cenário.

## Cenários iniciais

- ticket diferente por canal
- destaque para observações críticas
- impressora por tipo de atendimento
- prioridade para retirada
- checklist de fechamento de turno

## Automações operacionais implementadas

| Evento | Condição | Ação automática | Proteção |
| --- | --- | --- | --- |
| envio de rodada | saldo suficiente nas categorias controladas | cria pedido/ticket e baixa estoque na mesma transação | locks ordenados e idempotência |
| envio sem estoque | alguma categoria ficaria negativa | responde `409` sem pedido, ticket ou baixa parcial | rollback transacional |
| cancelamento antes do preparo | rodada original ainda não entrou em `in_preparation` | gera ticket corretivo e restitui estoque | referência à linha e efeito único |
| cancelamento após início do preparo | item já entrou em produção | mantém consumo; eventual correção é ajuste manual | trilha append-only |
| pagamento de comanda | turno aberto e valor dentro do saldo | cria parcela e lançamento financeiro vinculados | centavos, lock e chave idempotente |
| pagamento em dinheiro | método `cash` | altera caixa esperado do turno | vínculo explícito ao turno |
| estorno | parcela reversível e turno aberto | cria compensação sem apagar o original | unicidade por pagamento |
| retirada | turno aberto | reduz caixa esperado sem alterar faturamento | tipo canônico `cash_withdrawal` |

Os filtros financeiros são de consulta: a mesma combinação de tipo e forma de pagamento alimenta listagem, cards e totais, sem criar ou modificar lançamento.

## Estrutura esperada de regra

- nome
- evento
- condição
- ação
- ativo
