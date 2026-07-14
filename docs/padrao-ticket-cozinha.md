# Padrão de Ticket de Cozinha

## Campos obrigatórios

- identificador curto do pedido
- horário de criação do pedido no fuso `America/Sao_Paulo`
- canal
- cliente
- modo de entrega
- endereço, somente em `delivery`
- itens
- observações por item e gerais, quando informadas
- forma de pagamento

## Regras de legibilidade

- itens em destaque
- observações sempre depois do item
- separação clara entre dados do cliente e preparo
- texto simples e de leitura rápida
- retries do mesmo job devem reutilizar o mesmo arquivo de spool
