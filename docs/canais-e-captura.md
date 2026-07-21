# Canais e Captura

## Fontes de pedido

- `counter`: pedido lançado diretamente pelo operador
- `whatsapp`: pedido recebido fora do sistema e digitado pelo operador
- `ifood`: pedido capturado por adapter opcional ou digitado manualmente com origem preservada
- `deliverymuch`: pedido capturado por adapter opcional
- `olaclick`: pedido capturado manualmente ou por adapter futuro

## Estratégia v1

- O sistema continua `manual-first`; os adapters ficam desligados por padrão.
- Todos os canais entram no mesmo payload de pedido.
- A origem do pedido é preservada como metadado operacional e financeiro.
- Nenhuma regra de UI pode depender do canal para funcionar.

## Estado das integrações

- iFood: autenticação, polling do módulo Events, detalhe de pedido, comandos e ACK pós-commit estão implementados, mas não homologados com credenciais/sandbox.
- Delivery Much: autenticação e polling/comandos estão implementados contra o contrato disponível, mas as rotas detalhadas precisam ser confirmadas na documentação privada do parceiro.
- Um pedido externo entra em `received` e aguarda autorização. Só após confirmação do canal ele é ativado no núcleo local, baixa estoque e reserva ticket.
- `channel_events`, `channel_mappings` e `channel_commands` são mecanismos de idempotência/sincronização; não são um segundo núcleo de pedidos.
- Não habilitar integrações reais enquanto API/SSE estiverem sem autenticação de operador.

## Campos mínimos por captura

- origem
- nome do cliente
- atendimento: `delivery`, `pickup` (Retirada) ou `local`
- endereço completo, obrigatório somente em `delivery`
- itens
- observações
- forma de pagamento

`counter`, WhatsApp, iFood, Delivery Much e OlaClick são origens do pedido; não substituem a escolha de atendimento. A demo não coleta operador, login ou perfil administrativo.
