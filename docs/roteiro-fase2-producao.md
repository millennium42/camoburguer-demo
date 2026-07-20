# Roteiro de Implementação: Fase 2 e Integrações (Production-Ready)

Este documento descreve detalhadamente as lacunas arquiteturais e os próximos passos necessários para evoluir o sistema da versão de demonstração (v1) para um ambiente de produção "Full-Scale", com foco especial nas integrações de canais externos (APIs) e resiliência de infraestrutura.

## 1. Integração Bidirecional: iFood (API v2)

A infraestrutura atual provê as tabelas de mapeamento (`channel_mappings`), eventos (`channel_events`) e comandos (`channel_commands`), além de uma máquina de estados na camada de apresentação (fila de autorização). Para o funcionamento pleno em produção, os seguintes componentes de back-end devem ser implementados:

### 1.1. Autenticação e Gestão de Tokens (OAuth2)
- **Implementação:** Desenvolver um serviço/worker (`apps/workers/ifood-auth`) que realize o grant flow de OAuth2 (`client_credentials` ou `authorization_code`) via endpoint `https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token`.
- **Persistência:** Armazenamento seguro de access tokens e refresh tokens em cache distribuído (ex: Redis) ou em tabela encriptada do PostgreSQL, com job cronometrado para renovação preventiva antes da expiração (tempo de vida usual: 1 a 6 horas).

### 1.2. Ingestão de Eventos (Webhooks vs. Polling)
- **Polling:** Implementar um loop assíncrono (usando `setInterval` ou message queue como RabbitMQ/BullMQ) consultando o endpoint `/order/v1.0/events:polling`.
- **Armazenamento Seguro (Event Sourcing):** Inserção imutável de todo evento recebido (ex: `PLC` - Placed, `CAN` - Cancelled) na tabela `channel_events`. 
- **Acknowledgment (ACK):** Disparar chamadas HTTP POST para `/order/v1.0/events/acknowledgment` imediatamente após o persist, garantindo a semântica "at-least-once" e destravando a fila do iFood.

### 1.3. Handshake e Mapeamento de Catálogo
- **Matching de SKUs:** Implementar rotinas para correlacionar os UUIDs/External IDs dos produtos do JSON do iFood com os IDs numéricos locais do `catalog-snapshot`.
- **Conversão de Payload:** Mapeamento do objeto estruturado do agregador para o contrato interno (`source`, `fulfillmentMode`, `deliveryAddress`, `items`, `paymentMethod`). Os pedidos devem ser inseridos na base com `sync_status = 'accept_pending'`.

### 1.4. Despacho de Comandos (Outbound)
- **Aceite/Rejeição:** Quando a UI disparar a chamada `POST /orders/:id/accept`, o back-end deve acionar o endpoint do iFood (`/order/v1.0/orders/{id}/confirm`) paralelamente à transição de estado interno. Em caso de recusa, usar `/order/v1.0/orders/{id}/requestCancellation`.
- **Despacho (Dispatch):** Acionamento do endpoint de dispatch quando o pedido for concluído na cozinha.

## 2. Integração Bidirecional: Delivery Much

Similar ao iFood, a API da Delivery Much requer uma topologia de integração robusta:

### 2.1. Webhooks de Notificação
- Exposição de uma rota REST pública e autenticada (ex: via API Key estática no header) para recepção push-based dos pedidos da Delivery Much.
- Conversão da árvore estrutural (que difere do formato do iFood) para o schema canonizado do domínio local.
- Uso mandatório de filas (Pub/Sub) para absorver picos de I/O em horários de janta (High-Throughput), evitando perda de payloads por timeouts no webhook receiver.

## 3. Topologia de Infraestrutura e Resiliência (Cloud)

A atual stack via `docker-compose` atende ao escopo de demonstração. Para cloud, as seguintes abstrações são mandatórias:

### 3.1. Roteamento Edge e Terminação TLS
- **API Gateway/Reverse Proxy:** Substituir o binding direto de portas (8081/3001) por um Nginx/Traefik ou Cloudflare Tunnel.
- **TLS/SSL:** Configuração de certificados X.509 (Let's Encrypt / Certbot) para criptografia em trânsito (HTTPS/WSS) em todos os fluxos.

### 3.2. Banco de Dados (PostgreSQL)
- Migração de instâncias efêmeras em container para um RDS (Relational Database Service) gerenciado (ex: AWS RDS, Supabase, Neon).
- Implementação de replicação de leitura (Read Replicas) caso as queries dos dashboards financeiros saturem os IOPS de disco primário.
- Jobs automatizados de `pg_dump` (Point-in-Time Recovery - PITR).

### 3.3. Alta Disponibilidade (Stateless API)
- A API Node.js deve manter estado restrito ao banco de dados. Sessões, chaves de idempotência e rate limits devem migrar da memória RAM do Node para Redis (`ioredis`).
- Scaling horizontal (múltiplos containers da API via Kubernetes ou AWS ECS) por meio de um Load Balancer (Round Robin).

## 4. Evoluções de Domínio (V2)

### 4.1. Gestão Ativa de Catálogo (Backoffice)
- Substituir o arquivo estático gerado do snapshot `OlaClick` (`apps/api/src/catalog-snapshot.json`) por CRUD completo (Tabelas `products`, `categories`, `addons`).
- Relacionamento complexo para gestão de grade de produtos (tamanhos, variações de blend de carne).

### 4.2. Estoque Estrito de Ficha Técnica (CMV)
- Tabelas de `ingredients` (Pão, Carne 150g, Cheddar) e `recipes` associadas aos SKUs.
- Engine transacional avançada que debita componentes (em gramas/unidades) a cada conclusão de pedido, prevenindo desvios operacionais.

### 4.3. Impressão via Local Network (Print Bridge)
- Para o POS (Ponto de Venda) em cloud, a UI client-side soluciona a impressão local. Contudo, impressões de comandas para a ilha de preparo ("boqueta" da cozinha) requerem um driver TCP/IP.
- O daemon `print-bridge` deve ser evoluído de um leitor de File System spooler para um microserviço WebSockets (Socket.io) ou Long-Polling que receba comandos da API na Nuvem e injete pacotes ESC/POS direto via rede LAN (IP:Porta) ou porta Serial/USB local da impressora térmica.
