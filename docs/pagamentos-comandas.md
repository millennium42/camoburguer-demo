---
tags: [dominio, financeiro, comanda]
---

# Pagamentos Múltiplos em Comandas — Camoburguer Demo

> Contrato de pagamento, estorno e encerramento de comanda. Não há troco,
> parcelamento de parcela, estorno parcial, adquirente, conciliação bancária
> ou lógica fiscal nesta versão — esses temas exigem requisitos próprios e não
> são inferidos pela demo.

---

# Guia de uso

## Contrato comercial

Uma comanda pode receber quantas parcelas forem necessárias até que seu saldo
chegue exatamente a zero centavos.

Métodos aceitos: `dinheiro`, `pix`, `crédito`, `débito`, `app_paid`.

- **Trava:** `mixed` nunca é gravado — a API o deriva quando os pagamentos
  líquidos ativos usam mais de um método.
- O total comercial é calculado pelas rodadas de produção menos os tickets
  corretivos. Pagamentos não alteram pedidos nem tickets de cozinha.

## Valores e idempotência

- `amount_cents` é inteiro; sem cálculo monetário em ponto flutuante no saldo.
- `POST /tabs/:tabId/payments` exige `Idempotency-Key`, método e valor positivo
  em centavos.
- Uma parcela não pode ultrapassar `balanceCents`; excesso responde `409` sem
  lançar no financeiro ou alterar caixa.
- Repetir a mesma chave e payload recupera o pagamento.
- Reutilizar a chave em outra operação responde `409`.
- **Trava:** a linha da comanda é bloqueada durante pagamento; duas parcelas
  concorrentes não conseguem exceder o saldo.
- Pagamento ou estorno local exige turno de caixa aberto, inclusive para métodos
  sem numerário, garantindo vínculo temporal completo.

## Estornos

`POST /tabs/:tabId/payments/:paymentId/reversals` cria uma linha negativa ligada
ao pagamento original.

- O pagamento e o lançamento financeiro originais **nunca são apagados**.
- Cada pagamento admite um único estorno integral nesta versão.
- Depois do estorno, o saldo volta a ficar pendente e pode ser pago por outro
  método.

## Encerramento de comanda

`POST /tabs/:tabId/close` aceita somente `balanceCents === 0`.

- Grava o total final consumido.
- **Não depende** do estado posterior dos tickets da cozinha.

---

# Guia de desenvolvimento

## Caixa e financeiro

- Cada parcela cria um `finance_entries` próprio com `tab_id`, `payment_id`,
  método e turno disponível.
- Somente dinheiro altera `cash_shifts.expected_amount`; Pix, cartões e pago
  no aplicativo afetam faturamento sem modificar numerário esperado.
- O pagamento preserva seu turno original.
- Estorno em dinheiro compensa o turno aberto no momento da devolução.

## Vínculo tardio e pagamentos

Quando um pedido elegível é vinculado posteriormente a uma comanda, nenhum
lançamento é criado ou removido. A forma de pagamento originalmente capturada
permanece histórica; a liquidação futura passa a ser calculada exclusivamente
pelas parcelas da comanda.

- **Trava:** pedidos já concluídos, pagos no aplicativo ou com lançamento
  financeiro não podem ser vinculados. Ver regras completas em
  [ciclo-do-pedido.md](ciclo-do-pedido.md).

## Limites aceitos conscientemente na v1

- Sem troco.
- Sem parcelamento de uma mesma parcela.
- Sem estorno parcial.
- Sem adquirente, conciliação bancária ou lógica fiscal.

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[ciclo-financeiro.md](ciclo-financeiro.md) ·
[ciclo-do-pedido.md](ciclo-do-pedido.md) ·
[arquitetura-do-sistema.md](arquitetura-do-sistema.md)
