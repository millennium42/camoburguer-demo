---
tags: [cronograma, roadmap]
---

# Trilha de Desenvolvimento — Plano de Evolução (Demo → Produção)

> Fonte da verdade para o sequenciamento das entregas de evolução do Camoburguer. Este documento formaliza os gates operacionais e de infraestrutura exigidos para transformar a atual *demo isolada* em um sistema SaaS multi-canal de produção, seguindo as diretrizes rigorosas adotadas em Fono.

## Cronograma Geral

| Entrega | Etapa | Foco Principal | Resultado |
|---|---|---|---|
| 01 | Fundação Segura | Autenticação, RBAC e fechamento de APIs públicas | Proteção contra acessos anônimos e vazamentos |
| 02 | Dados e Recuperação | Migrations, Backup, LGPD e ambientes isolados | Operação persistente, resiliente e auditável |
| 03 | Canal iFood | Sandbox, webhook idempotente e conciliação | Recebimento automático e seguro do iFood |
| 04 | Canal Delivery Much | Contrato privado, polling e deduplicação | Integração multi-canal estabilizada |
| 05 | Fila e Resiliência | Padrão Outbox, retry, dead-letter | Estabilidade de I/O, filas e reprocessamento |
| 06 | Impressão e Produção | Agente local ESC/POS e gates de release | Versão 1.0 validada em infraestrutura real |

---

## Entrega 01 — Fundação Segura e Autenticação (Gate 0)

**Objetivo**: Blindar a aplicação contra acessos indesejados, viabilizando o uso de dados financeiros reais.

### Bloco 1.1: Estrutura Base de Usuários
- [x] Criar migration para tabela `users` (id, name, email, password_hash, role, created_at).
- [x] Criar lógica de hash seguro (ex: `bcrypt` ou `argon2`) para senhas.
- [x] Implementar script de *bootstrap* administrativo acionado no primeiro boot.
- [x] Definir o schema TypeScript/Joi para validação de criação e edição de usuários.

### Bloco 1.2: Motor de Autenticação
- [x] Implementar rota `POST /auth/login` retornando token JWT ou gerando *Session Cookie* (SameSite=Strict, HTTPOnly).
- [x] Implementar rota `POST /auth/logout` para revogação da sessão atual.
- [x] Criar middleware de autenticação (`requireAuth`) para injetar o usuário no *context* da requisição.
- [x] Configurar tempo de expiração da sessão e política de renovação.

### Bloco 1.3: Controle de Acesso (RBAC)
- [x] Definir catálogo de perfis: `Admin`, `Manager`, `Operator`.
- [x] Criar middleware de autorização (`requireRole(roles)`) aplicado nas rotas protegidas.
- [x] Bloquear endpoints do Spool da Print Bridge contra requisições não autorizadas.
- [x] Proteger a infraestrutura SSE (Server-Sent Events) checando a sessão no handshake de conexão.

### Bloco 1.4: Proteção do Frontend
- [x] Desenvolver tela de Login legado em `/app/login`.
- [x] Adicionar *Auth Guard* global no roteador do frontend para bloquear acesso a rotas operacionais.
- [x] Condicionar a renderização de botões destrutivos (ex: "Cancelar Pedido", "Estornar Pagamento") ao perfil do usuário logado.

### Bloco 1.5: Trilha de Auditoria
- [x] Criar tabela de auditoria `audit_logs` (id, user_id, action, entity, entity_id, payload_snapshot, timestamp).
- [x] Acoplar gravação de auditoria em ações críticas: estorno, aplicação de desconto, saque de caixa.

---

## Entrega 02 — Estabilidade de Dados e Compliance (Gate 1)

**Objetivo**: Garantir a integridade dos dados e prevenir perda de histórico transacional em atualizações.

### Bloco 2.1: Sistema de Migrations
- [ ] Extrair o `schema.sql` atual e convertê-lo na migration `001_initial_schema`.
- [ ] Adicionar um gerenciador formal de migrações ao repositório (ex: `node-pg-migrate`, `flyway` ou `prisma`).
- [ ] Configurar rotina de CI para validar rollback automático (down migrations) em ambiente de teste.

### Bloco 2.2: Isolamento do Seed
- [ ] Remover ou desativar completamente a variável `AUTO_SEED` no boot global.
- [ ] Criar endpoint `POST /admin/seed` restrito a administradores.
- [ ] Adicionar trava de segurança: o *seed* só pode ocorrer se o banco não contiver turnos fechados (`cash_shifts`).

### Bloco 2.3: Configuração de Backup e Fuso Horário
- [ ] Travar o fuso horário (Timezone) em `America/Sao_Paulo` nos contêineres e no DSN do PostgreSQL.
- [ ] Escrever teste automatizado provando que lançamentos da meia-noite seguem a data local, não UTC.
- [ ] Configurar rotinas de Backup Contínuo no banco de dados gerenciado (PITR - Point in Time Recovery).

### Bloco 2.4: Compliance LGPD
- [ ] Criar cron job (script executável diário) para rotinas de retenção de dados.
- [ ] Implementar dry-run do script de anonimização (substituição de nome/telefone/endereço de clientes com +30 dias da entrega).
- [ ] Garantir que hashes de segurança e integridade transacional financeira (valor da comanda) não sejam quebrados pela anonimização.

---

## Entrega 03 — Integração iFood (Gate 2)

**Objetivo**: Habilitar o principal canal de delivery sem quebrar as invariantes financeiras de caixa e estoque.

### Bloco 3.1: Infraestrutura e Credenciais
- [ ] Registrar a aplicação no portal de desenvolvedores iFood (Sandbox).
- [ ] Isolar as chaves (`CLIENT_ID`, `CLIENT_SECRET`, `MERCHANT_ID`) no secret manager, fora do versionamento.
- [ ] Criar tabela de mapeamento `channel_orders` (id, local_order_id, external_id, channel_name).

### Bloco 3.2: Motor de Integração (Webhooks / Polling)
- [ ] Criar módulo `ifood-adapter` isolado do domínio local.
- [ ] Implementar endpoint de *webhook* para recebimento de eventos ou rotina de *polling*.
- [ ] Criar *fixtures* de teste baseadas na documentação oficial para `placed`, `concluded`, `cancelled`.
- [ ] Logar de forma bruta (`raw_payload`) os eventos recebidos para auditoria de falhas de parse.

### Bloco 3.3: Idempotência e Tratamento de Concorrência
- [ ] Criar lógica rigorosa de deduplicação (hash de `eventId` + `orderId`).
- [ ] Gravar a intenção localmente **antes** de responder status 200 (ACK) ao iFood.
- [ ] Lidar com eventos lógicos desordenados (ex: `cancel` chegando milissegundos antes do `placed` devido a instabilidade de rede).

### Bloco 3.4: Tradução de Domínio
- [ ] Mapear o JSON do pedido iFood para a estrutura genérica `Order` do Camoburguer.
- [ ] Estabelecer estratégia de *fallback* para SKUs não mapeados (salvar com preço do iFood e marcar como "Não Vinculado").
- [ ] Criar lógica para injeção de taxas de entrega na rodada de fechamento (Comanda).

---

## Entrega 04 — Integração Delivery Much (Gate 3)

**Objetivo**: Consolidar as regras de abstração generalizando os adaptadores para o segundo canal.

### Bloco 4.1: Conexão e Autenticação DM
- [ ] Homologar o acesso ao contrato privado de API da Delivery Much via Postman/cURL.
- [ ] Criar rotina de geração e renovação automática do Token OAuth2 do DM.
- [ ] Gravar fixtures locais sanitizadas para autorização, recepção e aceite.

### Bloco 4.2: Polling e Recebimento
- [ ] Desenvolver job de Polling que consome a API de eventos a cada 30 segundos.
- [ ] Implementar estratégia de *cursor* (`lastEventId`) para evitar consumo duplicado na mesma sessão.
- [ ] Separar lógicas de transporte (Webhook do iFood vs Polling da DM), mantendo interface comum.

### Bloco 4.3: Interface Multi-Canal
- [ ] Adaptar a tela de "Operação / Cozinha" para exibir a logomarca e o `ID externo` do canal.
- [ ] Criar testes garantindo que o cancelamento disparado na UI local propaga via API para a rede correta do parceiro.
- [ ] O atendente local deve interagir sempre com a entidade `Order` genérica, sem conhecer detalhes de transporte.

---

## Entrega 05 — Worker e Resiliência de Fila (Gate 4)

**Objetivo**: Isolar processos síncronos da fila assíncrona, tolerando alta latência e quedas de internet.

### Bloco 5.1: Padrão Outbox (Banco de Dados)
- [ ] Criar a tabela `outbox_events` (id, aggregate_type, aggregate_id, payload, status, retries, next_attempt).
- [ ] Modificar operações de persistência de pedidos para salvar *events* associados na mesma transação SQL.

### Bloco 5.2: Motor de Despacho (Worker)
- [ ] Desenvolver o processo `worker.js` que roda em paralelo à API principal.
- [ ] Implementar leitura atômica da fila usando mecanismo de lock do PostgreSQL (`FOR UPDATE SKIP LOCKED`).
- [ ] Roteamento de eventos lidos do outbox para os *Adapters* corretos (iFood, DM, Print Bridge).

### Bloco 5.3: Resiliência Externa (Backoff e Retry)
- [ ] Implementar *Backoff Exponencial* em falhas HTTP transitórias (429 Rate Limit, 502 Bad Gateway).
- [ ] Desenvolver Circuit Breaker: pausar tentativas caso o parceiro apresente >50% de falha nos últimos 2 minutos.

### Bloco 5.4: Dead Letter Queue (DLQ)
- [ ] Mover tarefas permanentemente falhas (ex: > 5 tentativas) para a tabela `dlq_events`.
- [ ] Criar interface na área de "Integrações" do painel para revisar e realizar reprocessamento manual (*replay*) de itens da DLQ.

---

## Entrega 06 — Impressão Física e Release de Produção (Gates 5 e 6)

**Objetivo**: Transição do "simulador em nuvem" para execução estável no ambiente hostil do restaurante.

### Bloco 6.1: Agente Local de Impressão (ESC/POS)
- [ ] Desenvolver script leve (Node/Python) para atuar como *Agent* local outbound-only na mesma rede da impressora.
- [ ] Implementar biblioteca ESC/POS para formatação física de caracteres (cortes de papel, bipes térmicos, expansão de fonte).
- [ ] Conectar o Agente Local ao `print_bridge` da nuvem via Polling seguro com `PRINT_BRIDGE_TOKEN`.

### Bloco 6.2: Tratamento de Hardware e Contingência
- [ ] Implementar detecção de falha de conexão USB/Ethernet com a impressora.
- [ ] Simular queda de papel: o agente deve reportar falha ao Bridge, que colocará o ticket na DLQ.
- [ ] Criar botão "Forçar Reimpressão" na UI legada referenciando explicitamente o identificador da via original (marcando como "CÓPIA").

### Bloco 6.3: Validações Visuais e E2E
- [ ] Rodar testes em viewports mínimos (390px - celular) em todas as abas legadas (Caixa, Pedidos, Cozinha).
- [ ] Executar bateria completa de regressão do `Playwright` autenticado.
- [ ] Garantir 100% de passagem nos testes do `axe` (Acessibilidade).

### Bloco 6.4: Carga e Monitoramento
- [ ] Rodar script de simulação de carga (K6/Artillery) correspondente ao volume de um jantar de pico (+300 pedidos simultâneos).
- [ ] Estabelecer métricas vitais e alertas proativos (uptime, uso de memória, lag do Outbox).
- [ ] Assinatura final da documentação (Graphify atualizado) declarando **Versão 1.0 Release Candidate**.

---

## Critérios de Qualidade Fono (Definição de Pronto)

Para todas as entregas quinzenais, uma *feature* só é declarada "Pronta" caso satisfaça os padrões sistêmicos já documentados:
1. Toda mudança técnica inicia atualizando primeiro o arquivo de arquitetura associado (ex: `arquitetura-do-sistema.md`, `ciclo-do-pedido.md`).
2. Atualização obrigatória do **Graphify** para manter a árvore de dependências local sã e mapeável por IA.
3. PRs acompanhados de Testes de Regressão.
4. Passar pelas automações de diff (`npm run check`) em CRLF-aware para garantir sanitização do repositório.

## Ver também

[00-mapa-do-projeto.md](../00-mapa-do-projeto.md) ·
[guia-de-desenvolvimento.md](guia-de-desenvolvimento.md) ·
[deploy-e-infraestrutura.md](deploy-e-infraestrutura.md) ·
[relatorio-validacao.md](relatorio-validacao.md)
