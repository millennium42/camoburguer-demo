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

## Formato de Impressão (Client-Side)
Os tickets da cozinha (normais e corretivos) agora são renderizados via HTML/CSS em um <div id="print-area"> escondido na UI principal e disparados via window.print(), removendo a necessidade de ler do spooler e delegando a impressão ao diálogo nativo do sistema operacional do operador para melhor demonstração tátil.
