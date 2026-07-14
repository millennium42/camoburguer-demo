# Canais e Captura

## Fontes de pedido

- `counter`: pedido lançado diretamente pelo operador
- `whatsapp`: pedido recebido fora do sistema e digitado pelo operador
- `ifood`: pedido capturado manualmente ou por adapter futuro
- `olaclick`: pedido capturado manualmente ou por adapter futuro

## Estratégia v1

- O sistema nasce `manual-first`.
- Todos os canais entram no mesmo payload de pedido.
- A origem do pedido é preservada como metadado operacional e financeiro.
- Nenhuma regra de UI pode depender do canal para funcionar.

## Campos mínimos por captura

- origem
- nome do cliente
- atendimento: `delivery`, `pickup` (Retirada) ou `local`
- endereço completo, obrigatório somente em `delivery`
- itens
- observações
- forma de pagamento

`counter`, WhatsApp, iFood e OlaClick são origens do pedido; não substituem a escolha de atendimento. A v1 não coleta operador, login ou perfil administrativo.
