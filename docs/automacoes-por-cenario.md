---
tags: [automacao, operacional]
---

# Automações por Cenário — Camoburguer Demo

> Catálogo de automações implementadas na v1. A estratégia não cria
> personalização bespoke por cliente — usa regras configuráveis por cenário.
> Não inferir automações adicionais sem decisão explícita; cada nova automação
> exige atualização deste documento antes do código.

---

# Guia de uso

## Automações operacionais implementadas

| Evento | Condição | Ação automática | Proteção |
|---|---|---|---|
| Envio de rodada | Saldo suficiente nas categorias controladas | Cria pedido/ticket e baixa estoque na mesma transação | Locks ordenados e idempotência |
| Envio sem estoque | Alguma categoria ficaria negativa | Responde `409` sem pedido, ticket ou baixa parcial | Rollback transacional |
| Cancelamento antes do preparo | Rodada original ainda não entrou em `in_preparation` | Gera ticket corretivo e restitui estoque | Referência à linha e efeito único |
| Cancelamento após início do preparo | Item já entrou em produção | Mantém consumo; eventual correção é ajuste manual | Trilha append-only |
| Pagamento de comanda | Turno aberto e valor dentro do saldo | Cria parcela e lançamento financeiro vinculados | Centavos, lock e chave idempotente |
| Pagamento em dinheiro | Método `cash` | Altera caixa esperado do turno | Vínculo explícito ao turno |
| Estorno | Parcela reversível e turno aberto | Cria compensação sem apagar o original | Unicidade por pagamento |
| Retirada | Turno aberto | Reduz caixa esperado sem alterar faturamento | Tipo canônico `cash_withdrawal` |
| Evento externo novo | Adapter habilitado e payload válido | Persiste evento, normaliza pedido em `received` e cria mapping | Unicidade canal/evento e canal/merchant/pedido |
| Aceite externo | Confirmação recebida do parceiro | Ativa pedido local, baixa estoque e reserva ticket | Comando idempotente e transação única |
| ACK iFood | Evento local já commitado | Confirma recebimento ao parceiro | ACK pós-commit; duplicata não recria pedido |

Os filtros financeiros são de **consulta**: a mesma combinação de tipo e forma de
pagamento alimenta listagem, cards e totais, sem criar ou modificar lançamento.

## Cenários iniciais de configuração (roadmap)

- Ticket diferente por canal
- Destaque para observações críticas
- Impressora por tipo de atendimento
- Prioridade para retirada
- Checklist de fechamento de turno

---

# Guia de desenvolvimento

## Estrutura esperada de regra

```json
{
  "nome": "string",
  "evento": "string",
  "condicao": "string",
  "acao": "string",
  "ativo": true
}
```

## Estratégia v1

- Não criar personalização bespoke por cliente.
- Usar regras configuráveis por cenário.
- Comportamento de canal fica em adapters — não criar tela ou máquina de estados
  paralela.
- Ação não suportada deve falhar de forma visível; não marcar como concluída.

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[ciclo-do-pedido.md](ciclo-do-pedido.md) ·
[ciclo-financeiro.md](ciclo-financeiro.md) ·
[canais-e-captura.md](canais-e-captura.md) ·
[estoque.md](estoque.md)
