# Padrão de Ticket de Cozinha

## Campos obrigatórios

- identificador curto do pedido
- identificador da comanda/mesa e número da rodada, quando o pedido for consumo local em comanda
- horário de criação do pedido no fuso `America/Sao_Paulo`
- canal
- cliente
- modo de entrega
- endereço, somente em `delivery`
- itens
- adicionais em linhas recuadas logo abaixo do respectivo item
- observações por item e gerais, quando informadas
- forma de pagamento

## Regras de legibilidade

- itens em destaque
- observações sempre depois do item
- adicionais sempre prefixados por `+`, preservando o nome congelado na venda
- separação clara entre dados do cliente e preparo
- texto simples e de leitura rápida
- retries do mesmo job devem reutilizar o mesmo arquivo de spool

## Ticket corretivo

Item já enviado nunca é apagado ou reimpresso como se fosse novo. O cancelamento gera ticket separado com `CANCELAMENTO / RETIRAR`, comanda, nova rodada, referência curta ao pedido original, quantidades canceladas e motivo. O ticket original permanece imutável.

## Transporte de impressão

O domínio gera o texto canônico; a API persiste um `print_job` na mesma transação do pedido/estoque e o envia ao `print-bridge` autenticado. O bridge grava uma única entrada de spool por `jobId`. Retry reutiliza o ID e nunca sobrescreve conteúdo existente.

O frontend não imprime ticket de cozinha em paralelo. `window.print()` permanece apenas para relatório gerencial de turno, que não faz parte deste contrato.

O bridge hospedado em nuvem é apenas demonstração de spool. Impressão térmica física exige um agente na rede local e validação separada de ESC/POS, USB/serial ou TCP.
