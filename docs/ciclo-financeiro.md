---
tags: [dominio, financeiro, fonte-da-verdade]
---

# Ciclo Financeiro — Camoburguer Demo

> Financeiro gerencial automático v1 — sem fiscal pesado e sem CMV detalhado.
> Atualizar este documento antes de qualquer mudança em caixa, lançamentos,
> filtros ou timezone. Não inferir regras de produção a partir desta versão.

---

# Guia de uso

## Gatilhos automáticos

| Evento | Lançamento gerado |
|---|---|
| `order.completed` | venda pelo total final do pedido (com descontos) |
| `order.cancelled` (após conclusão) | reversão compensatória |
| `tab.payment.recorded` | venda por parcela, com forma de pagamento real |
| `tab.payment.reversed` | cancelamento compensatório sem apagar a parcela original |
| `cash.shift.opened` | registro de abertura |
| `cash.adjustment.created` | registro de reforço ou sangria |
| `cash.shift.closed` | registro de fechamento e diferença |

## Regras do caixa

- O caixa possui apenas os estados `open` e `closed`; a tela deve mostrar o
  estado atual.
- Abrir é permitido somente quando estiver `closed`; fechar e adicionar
  movimentação são permitidos somente quando estiver `open`.
- **Reforço** e **Retirada (sangria)** são criados pelo botão **Adicionar
  movimentação**, que abre um pop-up para escolher o tipo, informar valor e
  observação e confirmar.
  - **Trava:** a retirada usa o tipo existente `withdrawal`; não existe
    categoria duplicada.
- O fechamento exige o valor declarado e registra a diferença sem ocultar
  movimentos anteriores.
- Somente parcelas de comanda **em dinheiro** alteram o caixa esperado; outros
  métodos alteram faturamento, não numerário.
- Toda parcela ou estorno de comanda exige turno aberto para manter vínculo
  temporal; estorno em dinheiro compensa o turno atual e referencia o
  pagamento/turno original nos metadados.

## Visões gerenciais disponíveis

- Faturamento bruto
- Ticket médio
- Pedidos por canal
- Recebimentos por forma de pagamento
- Movimento por data / por turno
- Diferença de caixa
- Horário de pico

O filtro por forma de pagamento e tipo de lançamento é único para a tela:
a mesma query alimenta listagem, cards, totais e distribuição por método.
**Limpar filtro** restaura o consolidado completo.

## Relatórios e fechamento (impressão)

Turnos com estado `closed` habilitam opções de impressão (client-side, via
`window.print()`):

- **Resumo:** fita consolidada (vendas, entradas, saídas, esperado vs. apurado).
- **Detalhado:** resumo financeiro acrescido de uma fita analítica com todas as
  movimentações em ordem cronológica.

- **Trava:** `window.print()` é exclusivo para relatório gerencial de turno;
  ticket de cozinha usa apenas `print_jobs` → API → bridge.

---

# Guia de desenvolvimento

## Comandas usam centavos inteiros

Na fronteira de pagamento, toda aritmética usa `amount_cents` inteiro.
Não há cálculo monetário em ponto flutuante no saldo da comanda.

- O consumo soma rodadas; o pago soma parcelas e estornos assinados; o saldo
  é a diferença exata.
- Mais de um método ativo deriva `mixed`, mas cada lançamento mantém seu
  método real.
- `paymentsByMethod` é líquido: vendas somam e cancelamentos/estornos subtraem
  no método original. Legado sem método entra em `unattributed`, nunca em
  dinheiro por suposição.

## Timezone operacional

Os instantes são persistidos como `TIMESTAMPTZ`/UTC. Relatórios, filtros civis
e tickets convertem uma única vez para `BUSINESS_TIME_ZONE`, cujo padrão
validado é `America/Sao_Paulo`.

- **Trava:** timezone do processo e do navegador não participa da regra
  financeira.
- **Pendente (antes de produção):** padronizar e testar virada de dia/DST.
  Ver [deploy-e-infraestrutura.md](deploy-e-infraestrutura.md).

## Legado sem turno

Cancelamento usa o `shift_id` do lançamento de venda original, inclusive quando
o turno já está fechado. Registros históricos com `finance_entries.shift_id IS NULL`
não são associados silenciosamente a um turno atual.

Diagnóstico recomendado:
```sql
SELECT order_id, occurred_at
FROM finance_entries
WHERE type = 'sale' AND shift_id IS NULL;
```

Não há backfill automático. Qualquer correção histórica exige plano aprovado
e trilha de auditoria separada.

## Aceito conscientemente na v1

- Sem fiscal, nota fiscal, TISS ou CMV por receita.
- Sem parcelamento de uma mesma parcela ou conciliação bancária.
- Rate limit de instância única (sem Redis ou identidade por operador).

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[arquitetura-do-sistema.md](arquitetura-do-sistema.md) ·
[pagamentos-comandas.md](pagamentos-comandas.md) ·
[ciclo-do-pedido.md](ciclo-do-pedido.md) ·
[deploy-e-infraestrutura.md](deploy-e-infraestrutura.md)
