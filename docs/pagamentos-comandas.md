# Pagamentos Múltiplos em Comandas

## Contrato comercial

Uma comanda pode receber quantas parcelas forem necessárias até que seu saldo chegue exatamente a zero centavos. Cada parcela usa um único método entre dinheiro, Pix, crédito, débito e pago no aplicativo. `mixed` nunca é gravado: a API o deriva quando os pagamentos líquidos ativos usam mais de um método.

O total comercial continua sendo calculado pelas rodadas de produção menos os tickets corretivos. Os pagamentos não alteram pedidos nem tickets de cozinha.

## Valores e idempotência

- `amount_cents` é inteiro; não há cálculo monetário em ponto flutuante no saldo.
- `POST /tabs/:tabId/payments` exige `Idempotency-Key`, método e valor positivo em centavos.
- Uma parcela não pode ultrapassar `balanceCents`; excesso responde `409` sem lançar no financeiro ou alterar caixa.
- Repetir a mesma chave e payload recupera o pagamento. Reutilizar a chave em outra operação responde `409`.
- A linha da comanda é bloqueada durante pagamento, portanto duas parcelas concorrentes não conseguem exceder o saldo.
- Pagamento ou estorno local exige turno de caixa aberto, inclusive para métodos sem numerário, garantindo vínculo temporal completo.

## Estornos

`POST /tabs/:tabId/payments/:paymentId/reversals` cria uma linha negativa ligada ao pagamento original. O pagamento e o lançamento financeiro originais nunca são apagados. Cada pagamento admite um único estorno integral nesta versão; depois dele, o saldo volta a ficar pendente e pode ser pago por outro método.

## Caixa e financeiro

Cada parcela cria um `finance_entries` próprio com `tab_id`, `payment_id`, método e turno disponível. Somente dinheiro altera `cash_shifts.expected_amount`; Pix, cartões e pago no aplicativo afetam faturamento sem modificar numerário esperado. O pagamento preserva seu turno original e o estorno em dinheiro compensa o turno aberto no momento em que a devolução acontece.

## Encerramento

A comanda pode permanecer parcialmente paga. `POST /tabs/:tabId/close` aceita somente `balanceCents === 0`, grava o total final consumido e não depende do estado posterior dos tickets da cozinha.

## Limites da versão

Não há troco, parcelamento de uma mesma parcela, estorno parcial, adquirente, conciliação bancária ou lógica fiscal. Esses temas exigem requisitos próprios e não são inferidos pela demo.
