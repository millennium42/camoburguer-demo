# Graph Report - camoburguer-demo  (2026-08-27)

## Corpus Check
- 205 files · ~132,963 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1698 nodes · 2475 edges · 160 communities (151 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f21ddc72`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ifood.js
- main.js
- domain/index.js
- sidecar_digests
- auth.js
- api/src/server.js
- scripts
- smoke.mjs
- seed-demo-postgres.test.js
- createPrintDispatcher
- dependencies
- db.js
- Trilha de Desenvolvimento — Plano de Evolução (Demo → Produção)
- Guia de uso
- 00-mapa-do-projeto.md
- domain/package.json
- print-bridge/src/server.js
- order-tab-assignment.js
- includes
- config.js
- finance-core/package.json
- Guia de Desenvolvimento — Camoburguer Demo
- order-actions.js
- shared-types/index.js
- event-simulator/package.json
- print-bridge/package.json
- reconcile-shifts.js
- shared-types/package.json
- command-outbox.js
- ops-shell.spec.js
- createSseHub
- check-syntax.mjs
- l02-rota-raiz.test.js
- integration-repository.js
- m06-print-bridge-auth.test.js
- finance-core/index.js
- demo-simulator-client.mjs
- integrations.test.js
- graphify-update-wsl.sh
- idempotency.js
- L-01: Alinhar README, segurança e resultados de CI ao estado atual
- L-02: Corrigir a rota raiz rejeitada pelo middleware
- Especificação: M-05 Remover fechamento financeiro silencioso durante migração
- M-07: Limitar estruturas de autenticação em memória e reduzir write amplification
- UI-01: Modernizar o frontend operacional com React e design system consistente
- H-01 — Impedir criação avulsa de rodadas e cancelamentos forjados
- Roteiro da demo à produção
- H-01 — Impedir criação avulsa de rodadas e cancelamentos forjados
- M-03: Garantir cardinalidade consistente entre pedido e channel mapping
- Impedir auto-seed destrutivo
- HANDOFF.md
- Especificação H-02: Impedir Fechamento de Comanda com Produção Pendente
- Especificação H-03: Reconciliar Cancelamento sem Confirmar Pedido
- M-04: Mapear erros de entrada do PostgreSQL para respostas HTTP corretas
- M-06: Fechar autenticação do print bridge por padrão
- Autenticacao obrigatoria e RBAC na API e SSE
- Fingerprint para replay idempotente divergente
- Camoburguer Demo — AGENTS
- M-02: Alinhar fingerprint idempotente a toda semântica persistida
- Corrigir escalada de privilégio da função kitchen (C-01)
- Entrega Total CI E2E Docs
- Guia de desenvolvimento
- Design System e Interface — Camoburguer Demo
- H-04: Preservar meios de pagamento externos
- H-05: Unificar política de estoque entre cancelamentos avulsos e de comanda
- H-06: Auditoria Transacional Útil
- Corrigir escalada de privilégio da função kitchen (C-01)
- Camoburguer Demo — papéis de revisão por IA
- Guia de uso
- Prompt 01 — Impedir `AUTO_SEED` destrutivo
- Prompt 02 — Autenticação obrigatória e RBAC na API/SSE
- Camoburguer Demo — Mapa do Projeto
- Prompt 03 — Bloquear desconto após efeito financeiro
- Prompt 04 — Exigir turno na conclusão de pedido avulso
- Prompt 05 — Corrigir cancelamento manual na interface
- Prompt 07 — Idempotência de rodadas e ajustes de caixa
- Prompt 09 — Tratar adapter de integração desligado
- Prompt 10 — Outbox para efeitos HTTP externos
- Prompt 12 — Sincronizar mudanças externas da Delivery Much
- Prompt 13 — Anonimização LGPD completa e verificável
- Prompt 14 — Tornar o simulador de eventos confiável
- Prompt 15 — Emitir SSE após fechamento de comanda
- Prompt 16 — Dead-letter e retries seguros na impressão
- Prompt 17 — Timezone e reconciliação dos relatórios financeiros
- Incrementos validados (Sprint de transição)
- Anonimização LGPD completa e verificável
- Spec — Fila de impressão com dead-letter
- Isolar fluxos manual e integrado
- Outbox para efeitos HTTP externos
- Spec — Simulador de eventos confiável
- Sincronização Delivery Much
- Spec — SSE após fechamento de comanda
- Spec — Timezone dos relatórios financeiros
- Tratar adapter de integração desligado
- execucao-bloco-2.md
- Guia de uso
- Guia de desenvolvimento
- Guia de desenvolvimento
- Guia de desenvolvimento
- Runbook: Múltiplos Caixas Abertos (Duplicatas)
- Guia de desenvolvimento
- Prompt 06 — Fingerprint para replay idempotente divergente
- Prompt 08 — Isolar pedidos manuais e integrados
- Prompt 11 — Watchdog e correlação exata de comandos iFood
- Bloquear desconto após efeito financeiro
- Corrigir cancelamento manual na interface
- Exigir turno na conclusão
- Idempotência de rodadas e ajustes de caixa
- Watchdog e correlação exata iFood
- Documentação Central — Camoburguer Demo
- Guia de uso
- Guia de desenvolvimento
- Guia de uso
- Guia de desenvolvimento
- Guia de uso
- Guia de desenvolvimento
- Guia de uso
- Camoburguer Demo
- Architecture Gate Review
- Backend Gate Review
- Domain DB Gate Review
- Frontend Gate Review
- Infra Gate Review
- Operator UI Builder
- Order Finance Domain Modeler
- Print Infra Specialist
- Process Gate Review
- Release Readiness Review
- Restaurant Architecture Designer
- Restaurant Backend Builder
- Restaurant Demo QA
- Restaurant Process Orchestrator
- Template de Revisão
- Guia de desenvolvimento
- Guia de uso
- Guia de uso
- Guia de desenvolvimento
- Finance Insight Curator
- Kitchen Ticket Ergonomics Review
- Operator Friction Audit
- Scenario Automation Planner
- Guia de uso
- devDependencies
- package.json
- catalog-repository.js
- test-db.js
- Consolidação de Especificações (Fase de Integridade: C-01 a H-06)
- camoburguer-implementation-flow.md
- workspaces
- user-schema.js
- Guia de uso
- Guia de desenvolvimento
- retention-daily.sh

## God Nodes (most connected - your core abstractions)
1. `scripts` - 29 edges
2. `toMoney()` - 25 edges
3. `wireCart()` - 24 edges
4. `createIFoodAdapter()` - 20 edges
5. `refreshAll()` - 17 edges
6. `sidecar_digests` - 17 edges
7. `getOrderWithMapping()` - 15 edges
8. `createPrintDispatcher()` - 15 edges
9. `money()` - 15 edges
10. `Guia de Desenvolvimento — Camoburguer Demo` - 15 edges

## Surprising Connections (you probably didn't know these)
- `mapCatalogItem()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/catalog-repository.js → packages/shared-types/index.js
- `withDb()` --calls--> `createDb()`  [EXTRACTED]
  tests/migrations.test.js → apps/api/src/db.js
- `mapOrder()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js
- `mapTab()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js
- `mapTabPayment()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js

## Import Cycles
- None detected.

## Communities (160 total, 9 thin omitted)

### Community 0 - "ifood.js"
Cohesion: 0.13
Nodes (27): clearIFoodToken(), createIFoodAdapter(), completeCommand(), eventCorrelation(), failCommand(), fetchBatch(), fetchEvents(), fetchOrderDetails() (+19 more)

### Community 1 - "main.js"
Cohesion: 0.08
Nodes (74): activeShift(), addOrAccumulateItem(), api(), applyAuthenticatedSession(), calculateOrderPreviewTotal(), catalogAdminApi(), catalogAdminSession(), catalogAdminSessionIsCurrent() (+66 more)

### Community 2 - "domain/index.js"
Cohesion: 0.16
Nodes (25): changeStock(), normalizeCatalogItem(), ADD_ONS, addonCategories, CATALOG, CATALOG_CAPTURED_AT, CATALOG_SOURCE_URL, directHandoffCategories (+17 more)

### Community 3 - "sidecar_digests"
Cohesion: 0.05
Nodes (41): brain_id, checkpoint_id, created_at_unix_ms, epoch, external_authority_refs, authority_wal_root_digest, autonomy_epoch_record_digest, intent_core_store_root_digest (+33 more)

### Community 4 - "auth.js"
Cohesion: 0.10
Nodes (27): allowedLogin(), authenticate(), canRoleTransitionOrderStatus(), changePassword(), createCsrfToken(), ensureBootstrapAdmin(), hashPassword(), hashToken() (+19 more)

### Community 5 - "api/src/server.js"
Cohesion: 0.05
Nodes (37): mapFinanceEntry(), mapOrder(), mapShift(), mapTab(), mapTabPayment(), app, auditMutation(), db (+29 more)

### Community 6 - "scripts"
Cohesion: 0.07
Nodes (29): scripts, build, check, check:backend, fix, graph:extract, graph:extract:code, graph:update (+21 more)

### Community 7 - "smoke.mjs"
Cohesion: 0.14
Nodes (16): advanceAndClose(), api(), authHeaders, bridgePayload, catalogDrink, cookies, createOrder(), currentShift (+8 more)

### Community 8 - "seed-demo-postgres.test.js"
Cohesion: 0.06
Nodes (27): CANONICAL_CATALOG, DemoSeedRefusal, isSanitizedTarget(), lockProtectedTables(), normalizedCatalogItem(), OPERATIONAL_TABLES, PROTECTED_TABLES, requestDemoSeed() (+19 more)

### Community 9 - "createPrintDispatcher"
Cohesion: 0.18
Nodes (23): assertBridgeStatus(), assertPrintPayloadSize(), BRIDGE_SUCCESS_STATUSES, classifyPrintFailure(), PRINT_MAX_ATTEMPTS, PRINT_MAX_BYTES, printBackoffMs(), printPayload() (+15 more)

### Community 10 - "dependencies"
Cohesion: 0.07
Nodes (29): dependencies, @camoburguer/domain, @camoburguer/finance-core, @camoburguer/shared-types, dotenv, fastify, @fastify/cookie, @fastify/cors (+21 more)

### Community 11 - "db.js"
Cohesion: 0.06
Nodes (38): createDb(), mapPostgresError(), assertEmptyForRollback(), assertRollbackTarget(), checksum(), initialSql, migrationManifest, runMigrations() (+30 more)

### Community 12 - "Trilha de Desenvolvimento — Plano de Evolução (Demo → Produção)"
Cohesion: 0.06
Nodes (34): Bloco 1.1: Estrutura Base de Usuários, Bloco 1.2: Motor de Autenticação, Bloco 1.3: Controle de Acesso (RBAC), Bloco 1.4: Proteção do Frontend, Bloco 1.5: Trilha de Auditoria, Bloco 2.1: Sistema de Migrations, Bloco 2.2: Isolamento do Seed, Bloco 2.3: Configuração de Backup e Fuso Horário (+26 more)

### Community 13 - "Guia de uso"
Cohesion: 0.67
Nodes (3): Auditoria commit a commit (Julho 2026), Guia de uso, Histórico de evolução 5W2H

### Community 14 - "00-mapa-do-projeto.md"
Cohesion: 0.18
Nodes (12): Arquitetura do Sistema — Camoburguer Demo, Automações por Cenário — Camoburguer Demo, Canais e Captura — Camoburguer Demo, Ciclo do Pedido — Camoburguer Demo, Ciclo Financeiro — Camoburguer Demo, Contexto Operacional — Camoburguer Demo, Deploy e Infraestrutura — Camoburguer Demo, Estoque por Categoria — Camoburguer Demo (+4 more)

### Community 15 - "domain/package.json"
Cohesion: 0.22
Nodes (8): dependencies, @camoburguer/shared-types, @camoburguer/shared-types, main, name, private, type, version

### Community 16 - "print-bridge/src/server.js"
Cohesion: 0.36
Nodes (7): app, authorize(), bridgeToken, port, equalSecret(), safeId(), validPrintContent()

### Community 17 - "order-tab-assignment.js"
Cohesion: 0.33
Nodes (7): clean(), ELIGIBLE_STATUSES, normalizeTabAssignmentPayload(), sameTabAssignment(), tabAssignmentEligibility(), listOrders(), eligibleOrder

### Community 18 - "includes"
Cohesion: 0.07
Nodes (27): files, ignoreUnknown, includes, formatter, enabled, indentStyle, indentWidth, lineWidth (+19 more)

### Community 19 - "config.js"
Cohesion: 0.20
Nodes (5): appEnvironment, assertSafeAutoSeed(), config, parseListenPort(), validateTimeZone()

### Community 20 - "finance-core/package.json"
Cohesion: 0.22
Nodes (8): dependencies, @camoburguer/shared-types, @camoburguer/shared-types, main, name, private, type, version

### Community 21 - "Guia de Desenvolvimento — Camoburguer Demo"
Cohesion: 0.07
Nodes (29): Ambiente padrão: Ubuntu no WSL, Atualização do Graphify, Autenticação e rollback, Estado que o agente deve assumir, Estoque, Financeiro, Gate 0 — diff e sintaxe, Gate 1 — unitário/contrato (+21 more)

### Community 22 - "order-actions.js"
Cohesion: 0.21
Nodes (20): mapChannelCommand(), claimIdempotency(), completeIdempotency(), integrationActionFingerprintPayload(), findChannelCommand(), getOrderWithMapping(), insertChannelCommand(), updateChannelMapping() (+12 more)

### Community 23 - "shared-types/index.js"
Cohesion: 0.20
Nodes (9): COMMAND_STATUSES, FINANCE_ENTRY_TYPES, FULFILLMENT_MODES, INTEGRATION_CHANNELS, ORDER_SOURCES, ORDER_STATUSES, PAYMENT_METHODS, SHIFT_STATUSES (+1 more)

### Community 24 - "event-simulator/package.json"
Cohesion: 0.29
Nodes (6): name, private, scripts, start, type, version

### Community 25 - "print-bridge/package.json"
Cohesion: 0.17
Nodes (11): dependencies, dotenv, fastify, dotenv, fastify, name, private, scripts (+3 more)

### Community 26 - "reconcile-shifts.js"
Cohesion: 0.57
Nodes (6): auditIfAvailable(), fail(), main(), parseArgs(), reconcile(), usage()

### Community 27 - "shared-types/package.json"
Cohesion: 0.33
Nodes (5): main, name, private, type, version

### Community 28 - "command-outbox.js"
Cohesion: 0.33
Nodes (11): backoffMs(), classifyCommandError(), finishUnknown(), processChannelCommands(), reconcileCommand(), sanitizedError(), sendCommand(), claimChannelCommand() (+3 more)

### Community 29 - "ops-shell.spec.js"
Cohesion: 0.60
Nodes (3): adminPassword(), login(), loginLegacyIfNeeded()

### Community 30 - "createSseHub"
Cohesion: 0.43
Nodes (5): createSseHub(), publish(), remove(), subscribe(), validateOrClose()

### Community 33 - "integration-repository.js"
Cohesion: 0.24
Nodes (13): mapChannelEvent(), mapChannelMapping(), columnFor(), COMMAND_COLUMNS, EVENT_COLUMNS, findChannelEvent(), findChannelMapping(), insertChannelEvent() (+5 more)

### Community 35 - "finance-core/index.js"
Cohesion: 0.36
Nodes (10): assertOperationalDate(), buildEntriesFromOrder(), buildEntryFromAdjustment(), buildEntryFromTabPayment(), buildOpeningEntry(), businessDate(), businessHour(), filterEntries() (+2 more)

### Community 36 - "demo-simulator-client.mjs"
Cohesion: 0.23
Nodes (13): assertSafeSimulationBaseUrl(), createSimulationClient(), login(), request(), LOCAL_HOSTS, mark(), parseCookie(), printSimulationSummary() (+5 more)

### Community 37 - "integrations.test.js"
Cohesion: 0.17
Nodes (16): requestForm(), requestJson(), createDeliveryMuchAdapter(), authorizedRequest(), fetchBatch(), fetchOrders(), getToken(), reconcileCommand() (+8 more)

### Community 43 - "idempotency.js"
Cohesion: 0.30
Nodes (12): basisPoints(), cancellationFingerprintPayload(), CANONICAL_VERSION, canonicalAddon(), canonicalItem(), canonicalJson(), canonicalValue(), decimalUnits() (+4 more)

### Community 44 - "L-01: Alinhar README, segurança e resultados de CI ao estado atual"
Cohesion: 0.14
Nodes (13): Arquivos e Símbolos Prováveis, Autoavaliação e melhoria iterativa, Comportamento Atual e Desejado, Contratos HTTP e de Persistência Afetados, Critérios de Aceitação Verificáveis, Estados e Transições Afetados, Estratégia de Migração e Compatibilidade, Invariantes de Domínio e Segurança (+5 more)

### Community 45 - "L-02: Corrigir a rota raiz rejeitada pelo middleware"
Cohesion: 0.14
Nodes (13): Arquivos e Símbolos Prováveis, Autoavaliação, Comportamento Atual e Desejado, Contratos HTTP e de Persistência Afetados, Critérios de Aceitação Verificáveis, Estados e Transições Afetados, Estratégia de Migração e Compatibilidade, Invariantes de Domínio e Segurança (+5 more)

### Community 46 - "Especificação: M-05 Remover fechamento financeiro silencioso durante migração"
Cohesion: 0.14
Nodes (13): 10. Riscos, Rollback e Fora de Escopo, 11. Critérios de Aceitação, 12. Rubrica de Autoavaliação, 1. Problema e evidências, 2. Comportamento Atual e Comportamento Desejado, 3. Invariantes de Domínio e Segurança, 4. Estados e Transições Afetadas, 5. Contratos HTTP e de Persistência Afetados (+5 more)

### Community 47 - "M-07: Limitar estruturas de autenticação em memória e reduzir write amplification"
Cohesion: 0.14
Nodes (13): Arquivos e Símbolos Prováveis, Autoavaliação e melhoria iterativa, Comportamento Atual e Comportamento Desejado, Contratos HTTP e de Persistência Afetados, Critérios de Aceitação Verificáveis, Estados e Transições Afetados, Estratégia de Migração e Compatibilidade, Invariantes de Domínio e Segurança (+5 more)

### Community 48 - "UI-01: Modernizar o frontend operacional com React e design system consistente"
Cohesion: 0.14
Nodes (13): Arquivos e símbolos prováveis, Autoavaliação e melhoria iterativa (Congelado antes do Build), Comportamento atual e desejado, Contratos HTTP e de Persistência afetados, Critérios de Aceitação Verificáveis, Estados e transições afetados, Estratégia de Migração e Compatibilidade, Invariantes de Domínio e Segurança (+5 more)

### Community 49 - "H-01 — Impedir criação avulsa de rodadas e cancelamentos forjados"
Cohesion: 0.14
Nodes (13): 10. Riscos, Rollback e Itens Fora de Escopo, 11. Critérios de Aceitação Verificáveis, 12. Rubrica de Autoavaliação Congelada (100 pontos), 1. Problema e Evidências, 2. Comportamento Atual e Comportamento Desejado, 3. Invariantes de Domínio e Segurança, 4. Estados e Transições Afetados, 5. Contratos HTTP e de Persistência Afetados (+5 more)

### Community 50 - "Roteiro da demo à produção"
Cohesion: 0.15
Nodes (13): Gate 0 — Fechar a exposição pública (P0), Gate 1 — Dados e operação recuperável, Gate 2 — Homologação iFood, Gate 3 — Homologação Delivery Much, Gate 4 — Worker/outbox observável, Gate 5 — Impressão real, Gate 6 — Release operacional, Guia de desenvolvimento (+5 more)

### Community 51 - "H-01 — Impedir criação avulsa de rodadas e cancelamentos forjados"
Cohesion: 0.15
Nodes (13): 10. Riscos, Rollback e Itens Fora de Escopo, 11. Critérios de Aceitação Verificáveis, 12. Rubrica de Autoavaliação Congelada (100 pontos), 1. Problema e Evidências, 2. Comportamento Atual e Comportamento Desejado, 3. Invariantes de Domínio e Segurança, 4. Estados e Transições Afetados, 5. Contratos HTTP e de Persistência Afetados (+5 more)

### Community 52 - "M-03: Garantir cardinalidade consistente entre pedido e channel mapping"
Cohesion: 0.15
Nodes (12): Arquivos Afetados, Casos Extremos e Falhas, Definição de Concluído, Escopo, Estratégia de Migração e Compatibilidade, Fora do Escopo, Incluído, M-03: Garantir cardinalidade consistente entre pedido e channel mapping (+4 more)

### Community 53 - "Impedir auto-seed destrutivo"
Cohesion: 0.15
Nodes (12): Casos extremos e falhas, Definição de concluído, Escopo, Estado e tabelas protegidas, Fluxo administrativo esperado, Fora do escopo, Impedir auto-seed destrutivo, Incluído (+4 more)

### Community 54 - "HANDOFF.md"
Cohesion: 0.12
Nodes (16): 1. Bloco 1.4 - Login Legado e RBAC (Concluído), 1. Implementação da Tabela `audit_logs`, 2. Acoplamento de Auditoria em Ações Críticas, 2. Depuração e Resolução do "Heisenbug" na Suíte de Testes (Test 19), 3. Cobertura de Testes (Coverage) e Qualidade, 3. Padrões de Qualidade e Workflow Ralph Multiagente, 4. Handoff, A Investigação Profunda (+8 more)

### Community 55 - "Especificação H-02: Impedir Fechamento de Comanda com Produção Pendente"
Cohesion: 0.18
Nodes (11): 10. Rubrica de Autoavaliação Congelada (100 pontos), 1. Problema e Evidências, 2. Comportamento Atual vs Desejado, 3. Invariantes de Domínio e Segurança, 4. Estados e Transições Afetadas, 5. Contratos HTTP e de Persistência, 6. Arquivos e Símbolos, 7. Estratégia de Migração e Compatibilidade (+3 more)

### Community 56 - "Especificação H-03: Reconciliar Cancelamento sem Confirmar Pedido"
Cohesion: 0.18
Nodes (11): 10. Rubrica de Autoavaliação Congelada (100 pontos), 1. Problema e Evidências, 2. Comportamento Atual vs Desejado, 3. Invariantes de Domínio e Segurança, 4. Estados e Transições Afetadas, 5. Contratos HTTP e Persistência, 6. Arquivos e Símbolos, 7. Estratégia de Migração e Compatibilidade (+3 more)

### Community 57 - "M-04: Mapear erros de entrada do PostgreSQL para respostas HTTP corretas"
Cohesion: 0.18
Nodes (10): Casos Extremos e Falhas, Definição de Concluído, Escopo, Fora do escopo, Incluído, M-04: Mapear erros de entrada do PostgreSQL para respostas HTTP corretas, Objetivo, Requisitos Exatos (+2 more)

### Community 58 - "M-06: Fechar autenticação do print bridge por padrão"
Cohesion: 0.18
Nodes (10): Casos extremos e falhas, Definição de concluído, Escopo, Fora do escopo, Incluído, M-06: Fechar autenticação do print bridge por padrão, Objetivo, Requisitos exatos (+2 more)

### Community 59 - "Autenticacao obrigatoria e RBAC na API e SSE"
Cohesion: 0.18
Nodes (10): Autenticacao obrigatoria e RBAC na API e SSE, Casos extremos e falhas, Decisoes acordadas, Definicao de concluido, Escopo, Fora do escopo, Incluido, Objetivo (+2 more)

### Community 60 - "Fingerprint para replay idempotente divergente"
Cohesion: 0.18
Nodes (10): Casos extremos e falhas, Definição de concluído, Escopo, Fingerprint para replay idempotente divergente, Fora do escopo, Incluído, Migração, legado e rollback, Objetivo (+2 more)

### Community 61 - "Camoburguer Demo — AGENTS"
Cohesion: 0.20
Nodes (10): Camoburguer Demo — AGENTS, Continuidade de subagentes, Graphify, Implementation Boundaries, Operating Doctrine, Política explícita do Bloco 2, Required Seed Artifacts, Review Standard (+2 more)

### Community 62 - "M-02: Alinhar fingerprint idempotente a toda semântica persistida"
Cohesion: 0.20
Nodes (9): Arquivos e Símbolos Prováveis, Comportamento Atual e Desejado, Contratos HTTP e de Persistência, Critérios de Aceitação Verificáveis, Estratégia de Migração e Compatibilidade, Invariantes de Domínio e Segurança, M-02: Alinhar fingerprint idempotente a toda semântica persistida, Problema e Evidências (+1 more)

### Community 63 - "Corrigir escalada de privilégio da função kitchen (C-01)"
Cohesion: 0.20
Nodes (9): Casos extremos e falhas, Corrigir escalada de privilégio da função kitchen (C-01), Definição de concluído, Escopo, Fora do escopo, Incluído, Objetivo, Requisitos exatos (+1 more)

### Community 64 - "Entrega Total CI E2E Docs"
Cohesion: 0.20
Nodes (9): Casos extremos e falhas, Definição de concluído, Entrega Total CI E2E Docs, Escopo, Fora do escopo, Incluído, Objetivo, Requisitos exatos (+1 more)

### Community 65 - "Guia de desenvolvimento"
Cohesion: 0.22
Nodes (9): Caixa, Decisões arquiteturais, Eventos internos publicados, Fronteira de integração externa, Fronteiras e seams, Guia de desenvolvimento, Outbox de integrações, Riscos arquiteturais conhecidos (+1 more)

### Community 66 - "Design System e Interface — Camoburguer Demo"
Cohesion: 0.22
Nodes (9): Acessibilidade e Motion, Design System e Interface — Camoburguer Demo, Direção visual, Layout e ergonomia, Provas automatizadas relacionadas, Superfície publicada, Tipografia, Tokens canônicos (+1 more)

### Community 67 - "H-04: Preservar meios de pagamento externos"
Cohesion: 0.22
Nodes (9): 1. Problema e Evidências, 2. Comportamento Atual x Desejado, 3. Invariantes de Domínio e Segurança, 4. Estados, Transições e Arquivos, 5. Estratégia de Migração e Compatibilidade, 6. Testes Específicos, 7. Critérios de Aceitação e Riscos, 8. Rubrica de Autoavaliação (+1 more)

### Community 68 - "H-05: Unificar política de estoque entre cancelamentos avulsos e de comanda"
Cohesion: 0.22
Nodes (9): 1. Problema e Evidências, 2. Comportamento Atual e Desejado, 3. Invariantes de Domínio e Segurança, 4. Estados e Transições, 5. Estratégia de Migração e Compatibilidade, 6. Arquivos e Símbolos, 7. Critérios de Aceitação e Autoavaliação, 8. Rubrica (+1 more)

### Community 69 - "H-06: Auditoria Transacional Útil"
Cohesion: 0.22
Nodes (9): Autoavaliação e Rubrica, Comportamento Atual vs Desejado, Contratos HTTP e Persistência, Estados e Transições Afetadas, Estratégia de Migração e Compatibilidade, H-06: Auditoria Transacional Útil, Invariantes de Domínio e Segurança, Problema e Evidências (+1 more)

### Community 70 - "Corrigir escalada de privilégio da função kitchen (C-01)"
Cohesion: 0.22
Nodes (9): Casos extremos e falhas, Corrigir escalada de privilégio da função kitchen (C-01), Definição de concluído, Escopo, Fora do escopo, Incluído, Objetivo, Requisitos exatos (+1 more)

### Community 71 - "Camoburguer Demo — papéis de revisão por IA"
Cohesion: 0.22
Nodes (9): Camoburguer Demo — papéis de revisão por IA, Continuidade e operação do host, Doutrina comum, Entrega de cada papel, Poder do gate, Regra de uso, Seleção por blast radius, Sequência para release transversal (+1 more)

### Community 72 - "Guia de uso"
Cohesion: 0.25
Nodes (8): Atores e responsabilidades, Consumo local (comandas e mesas), Guia de uso, Integrações externas e fila de autorização, Objetivos da demo, Problemas operacionais que a demo resolve, Responsabilidades do operador na v1, Resumo do negócio

### Community 73 - "Prompt 01 — Impedir `AUTO_SEED` destrutivo"
Cohesion: 0.25
Nodes (7): Critérios mínimos da especificação e dos testes, Ferramentas, frontend e dependências, Fluxo obrigatório com subagentes, Gates e publicação, Missão, Prompt 01 — Impedir `AUTO_SEED` destrutivo, Rubrica e encerramento

### Community 74 - "Prompt 02 — Autenticação obrigatória e RBAC na API/SSE"
Cohesion: 0.25
Nodes (7): Critérios mínimos, Ferramentas e frontend, Fluxo obrigatório com subagentes, Gates, Git e publicação, Missão, Prompt 02 — Autenticação obrigatória e RBAC na API/SSE, Rubrica e saída

### Community 75 - "Camoburguer Demo — Mapa do Projeto"
Cohesion: 0.29
Nodes (7): Arquivos de governança, Camoburguer Demo — Mapa do Projeto, Convenção do vault, Documentos por objetivo, Fluxo operacional, Skills e workflows, Status atual (2026-07-21)

### Community 76 - "Prompt 03 — Bloquear desconto após efeito financeiro"
Cohesion: 0.29
Nodes (6): Aceite obrigatório, Execução com subagentes e skills, Ferramentas, frontend, gates e Git, Missão e contrato, Prompt 03 — Bloquear desconto após efeito financeiro, Rubrica e relatório

### Community 77 - "Prompt 04 — Exigir turno na conclusão de pedido avulso"
Cohesion: 0.29
Nodes (6): Autoavaliação, Ferramentas, referências visuais e gates, Missão, Orquestração obrigatória, Prompt 04 — Exigir turno na conclusão de pedido avulso, Testes e definição de concluído

### Community 78 - "Prompt 05 — Corrigir cancelamento manual na interface"
Cohesion: 0.29
Nodes (6): Aceite obrigatório, Ferramentas e frontend, Fluxo obrigatório, Gates, Git e saída, Missão, Prompt 05 — Corrigir cancelamento manual na interface

### Community 79 - "Prompt 07 — Idempotência de rodadas e ajustes de caixa"
Cohesion: 0.29
Nodes (6): Aceite, Ferramentas e UX, Fluxo obrigatório, Gates e publicação, Missão, Prompt 07 — Idempotência de rodadas e ajustes de caixa

### Community 80 - "Prompt 09 — Tratar adapter de integração desligado"
Cohesion: 0.29
Nodes (6): Aceite, Ferramentas e frontend, Fluxo com subagentes, Gates, Git e relatório, Missão, Prompt 09 — Tratar adapter de integração desligado

### Community 81 - "Prompt 10 — Outbox para efeitos HTTP externos"
Cohesion: 0.29
Nodes (6): Aceite obrigatório, Ferramentas, frontend e gates, Fluxo obrigatório, Missão, Prompt 10 — Outbox para efeitos HTTP externos, Rubrica e entrega

### Community 82 - "Prompt 12 — Sincronizar mudanças externas da Delivery Much"
Cohesion: 0.29
Nodes (6): Aceite, Ferramentas e frontend, Fluxo obrigatório, Gates e publicação, Missão, Prompt 12 — Sincronizar mudanças externas da Delivery Much

### Community 83 - "Prompt 13 — Anonimização LGPD completa e verificável"
Cohesion: 0.29
Nodes (6): Aceite, Ferramentas, frontend e segurança, Gates, Git e relatório, Missão, Orquestração, Prompt 13 — Anonimização LGPD completa e verificável

### Community 84 - "Prompt 14 — Tornar o simulador de eventos confiável"
Cohesion: 0.29
Nodes (6): Aceite, Ferramentas e frontend, Fluxo obrigatório, Gates, Git e saída, Missão, Prompt 14 — Tornar o simulador de eventos confiável

### Community 85 - "Prompt 15 — Emitir SSE após fechamento de comanda"
Cohesion: 0.29
Nodes (6): Aceite, Ferramentas e frontend, Gates, Git e relatório, Missão, Orquestração, Prompt 15 — Emitir SSE após fechamento de comanda

### Community 86 - "Prompt 16 — Dead-letter e retries seguros na impressão"
Cohesion: 0.29
Nodes (6): Aceite, Ferramentas e frontend, Fluxo obrigatório, Gates e publicação, Missão, Prompt 16 — Dead-letter e retries seguros na impressão

### Community 87 - "Prompt 17 — Timezone e reconciliação dos relatórios financeiros"
Cohesion: 0.29
Nodes (6): Aceite, Ferramentas e frontend, Gates, Git e relatório, Missão, Orquestração, Prompt 17 — Timezone e reconciliação dos relatórios financeiros

### Community 88 - "Incrementos validados (Sprint de transição)"
Cohesion: 0.29
Nodes (7): Auditoria e correção — 2026-07-21, Decisão atual:, Estoque por categorias, Guia de uso, Incrementos validados (Sprint de transição), Pagamentos múltiplos, Retirada e filtros financeiros

### Community 89 - "Anonimização LGPD completa e verificável"
Cohesion: 0.29
Nodes (6): Anonimização LGPD completa e verificável, Casos extremos, Definição de concluído, Política técnica da demo, Requisitos exatos, Restrições

### Community 90 - "Spec — Fila de impressão com dead-letter"
Cohesion: 0.29
Nodes (6): Bordas, Decisões recomendadas, Pronto, Requisitos, Restrições, Spec — Fila de impressão com dead-letter

### Community 91 - "Isolar fluxos manual e integrado"
Cohesion: 0.29
Nodes (6): Casos extremos, Definição de concluído, Isolar fluxos manual e integrado, Objetivo, Requisitos exatos, Restrições

### Community 92 - "Outbox para efeitos HTTP externos"
Cohesion: 0.29
Nodes (6): Casos extremos, Definição de concluído, Objetivo, Outbox para efeitos HTTP externos, Requisitos exatos, Restrições

### Community 93 - "Spec — Simulador de eventos confiável"
Cohesion: 0.29
Nodes (6): Bordas, Decisões recomendadas, Pronto, Requisitos, Restrições, Spec — Simulador de eventos confiável

### Community 94 - "Sincronização Delivery Much"
Cohesion: 0.29
Nodes (6): Casos extremos, Definição de concluído, Limite de contrato, Requisitos exatos, Restrições, Sincronização Delivery Much

### Community 95 - "Spec — SSE após fechamento de comanda"
Cohesion: 0.29
Nodes (6): Bordas, Contrato recomendado, Pronto, Requisitos, Restrições, Spec — SSE após fechamento de comanda

### Community 96 - "Spec — Timezone dos relatórios financeiros"
Cohesion: 0.29
Nodes (6): Bordas, Pronto, Requisitos, Restrições, Semântica recomendada, Spec — Timezone dos relatórios financeiros

### Community 97 - "Tratar adapter de integração desligado"
Cohesion: 0.29
Nodes (6): Casos extremos, Decisão, Definição de concluído, Requisitos exatos, Restrições, Tratar adapter de integração desligado

### Community 98 - "execucao-bloco-2.md"
Cohesion: 0.06
Nodes (28): Checkout e ambiente comprovados, Critérios de aceite e decisões antes da implementação, Escopo e solicitação registrada, Evidências incrementais, Execução do Bloco 2 — dados, recuperação e retenção, Fechamento obrigatório, Registro de agentes e continuidade, Calendário operacional (+20 more)

### Community 99 - "Guia de uso"
Cohesion: 0.33
Nodes (6): Apps, Fluxo operacional obrigatório, Guia de uso, Infra, Modelo de persistência consolidado, Packages

### Community 100 - "Guia de desenvolvimento"
Cohesion: 0.33
Nodes (6): Estado das integrações, Estratégia v1, Guia de desenvolvimento, Mecanismos de idempotência e sincronização, Pendentes antes de habilitar integrações reais, Ver também

### Community 101 - "Guia de desenvolvimento"
Cohesion: 0.33
Nodes (6): Aceito conscientemente na v1, Comandas usam centavos inteiros, Guia de desenvolvimento, Legado sem turno, Timezone operacional, Ver também

### Community 102 - "Guia de desenvolvimento"
Cohesion: 0.33
Nodes (6): Aceito conscientemente na v1, Auditoria e invariantes, Corte de migração, Guia de desenvolvimento, Locks e ordem determinística, Ver também

### Community 103 - "Runbook: Múltiplos Caixas Abertos (Duplicatas)"
Cohesion: 0.33
Nodes (5): Ação Requerida (Reconciliação), Backup e Rollback, Diagnóstico, Runbook: Múltiplos Caixas Abertos (Duplicatas), Ver também

### Community 104 - "Guia de desenvolvimento"
Cohesion: 0.33
Nodes (6): Bridge em nuvem vs. impressão local, Guia de desenvolvimento, Limite, dead-letter e recibo, PII e retenção do spool, Transporte de impressão, Ver também

### Community 105 - "Prompt 06 — Fingerprint para replay idempotente divergente"
Cohesion: 0.33
Nodes (5): Execução com subagentes e skills, Ferramentas, visual, gates e Git, Matriz mínima de testes, Missão, Prompt 06 — Fingerprint para replay idempotente divergente

### Community 106 - "Prompt 08 — Isolar pedidos manuais e integrados"
Cohesion: 0.33
Nodes (5): Aceite, Ferramentas, frontend, gates e Git, Missão, Orquestração, Prompt 08 — Isolar pedidos manuais e integrados

### Community 107 - "Prompt 11 — Watchdog e correlação exata de comandos iFood"
Cohesion: 0.33
Nodes (5): Aceite, Ferramentas, frontend, gates e Git, Missão, Orquestração, Prompt 11 — Watchdog e correlação exata de comandos iFood

### Community 108 - "Bloquear desconto após efeito financeiro"
Cohesion: 0.33
Nodes (5): Bloquear desconto após efeito financeiro, Casos extremos, Definição de concluído, Requisitos exatos, Restrições

### Community 109 - "Corrigir cancelamento manual na interface"
Cohesion: 0.33
Nodes (5): Casos extremos, Corrigir cancelamento manual na interface, Definição de concluído, Requisitos exatos, Restrições

### Community 110 - "Exigir turno na conclusão"
Cohesion: 0.33
Nodes (5): Casos extremos, Definição de concluído, Exigir turno na conclusão, Requisitos exatos, Restrições

### Community 111 - "Idempotência de rodadas e ajustes de caixa"
Cohesion: 0.33
Nodes (5): Casos extremos, Definição de concluído, Idempotência de rodadas e ajustes de caixa, Requisitos exatos, Restrições

### Community 112 - "Watchdog e correlação exata iFood"
Cohesion: 0.33
Nodes (5): Casos extremos, Definição de concluído, Requisitos exatos, Restrições, Watchdog e correlação exata iFood

### Community 113 - "Documentação Central — Camoburguer Demo"
Cohesion: 0.40
Nodes (5): Definição de pronto, Documentação Central — Camoburguer Demo, Invariantes em uma página, Leitura por objetivo, Ver também

### Community 114 - "Guia de uso"
Cohesion: 0.40
Nodes (5): Comandas locais, Correções (rodadas negativas), Estados do pedido, Guia de uso, Pedidos externos (iFood / Delivery Much)

### Community 115 - "Guia de desenvolvimento"
Cohesion: 0.40
Nodes (5): Contrato de vínculo tardio, Eventos relevantes, Guia de desenvolvimento, Regras principais de implementação, Ver também

### Community 116 - "Guia de uso"
Cohesion: 0.40
Nodes (5): Gatilhos automáticos, Guia de uso, Regras do caixa, Relatórios e fechamento (impressão), Visões gerenciais disponíveis

### Community 117 - "Guia de desenvolvimento"
Cohesion: 0.40
Nodes (5): Estado declarado (2026-07-21), Fronteiras de segurança, Guia de desenvolvimento, Próximo passo crítico, Ver também

### Community 118 - "Guia de uso"
Cohesion: 0.40
Nodes (5): Campos obrigatórios do ticket, Guia de uso, Itens de entrega direta, Regras de legibilidade, Ticket corretivo

### Community 119 - "Guia de desenvolvimento"
Cohesion: 0.40
Nodes (5): Caixa e financeiro, Guia de desenvolvimento, Limites aceitos conscientemente na v1, Ver também, Vínculo tardio e pagamentos

### Community 120 - "Guia de uso"
Cohesion: 0.40
Nodes (5): Contrato comercial, Encerramento de comanda, Estornos, Guia de uso, Valores e idempotência

### Community 121 - "Camoburguer Demo"
Cohesion: 0.40
Nodes (5): Camoburguer Demo, Documentação, Problemas comuns (Troubleshooting), Pré-requisitos, Setup técnico

### Community 122 - "Architecture Gate Review"
Cohesion: 0.40
Nodes (4): Architecture Gate Review, Checklist, Decision Output, Tool Doctrine

### Community 123 - "Backend Gate Review"
Cohesion: 0.40
Nodes (4): Backend Gate Review, Checklist, Decision Output, Tool Doctrine

### Community 124 - "Domain DB Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Domain DB Gate Review, Tool Doctrine

### Community 125 - "Frontend Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Frontend Gate Review, Tool Doctrine

### Community 126 - "Infra Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Infra Gate Review, Tool Doctrine

### Community 127 - "Operator UI Builder"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Operator UI Builder, Tool Doctrine

### Community 128 - "Order Finance Domain Modeler"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Order Finance Domain Modeler, Tool Doctrine

### Community 129 - "Print Infra Specialist"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Print Infra Specialist, Tool Doctrine

### Community 130 - "Process Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Process Gate Review, Tool Doctrine

### Community 131 - "Release Readiness Review"
Cohesion: 0.40
Nodes (4): Mandatory Output, Release Readiness Review, Required Inputs, Tool Doctrine

### Community 132 - "Restaurant Architecture Designer"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Restaurant Architecture Designer, Tool Doctrine

### Community 133 - "Restaurant Backend Builder"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Restaurant Backend Builder, Tool Doctrine

### Community 134 - "Restaurant Demo QA"
Cohesion: 0.40
Nodes (4): Mandatory Output, Restaurant Demo QA, Test Scope, Tool Doctrine

### Community 135 - "Restaurant Process Orchestrator"
Cohesion: 0.40
Nodes (4): Mandatory Output, Restaurant Process Orchestrator, Tool Doctrine, Workflow

### Community 136 - "Template de Revisão"
Cohesion: 0.40
Nodes (4): Checklist, Estado, Saída obrigatória, Template de Revisão

### Community 137 - "Guia de desenvolvimento"
Cohesion: 0.50
Nodes (4): Estratégia v1, Estrutura esperada de regra, Guia de desenvolvimento, Ver também

### Community 138 - "Guia de uso"
Cohesion: 0.50
Nodes (4): Campos mínimos por captura, Fila de autorização (pedidos externos), Fontes de pedido, Guia de uso

### Community 139 - "Guia de uso"
Cohesion: 0.50
Nodes (4): Guia de uso, Recursos implantados (Render), Troubleshooting, Verificação pós-deploy (somente leitura)

### Community 140 - "Guia de desenvolvimento"
Cohesion: 0.50
Nodes (4): Guia de desenvolvimento, Incidente de validação resolvido, Sequência Maker/Reviewer obrigatória, Ver também

### Community 141 - "Finance Insight Curator"
Cohesion: 0.50
Nodes (3): Finance Insight Curator, Focus, Tool Doctrine

### Community 142 - "Kitchen Ticket Ergonomics Review"
Cohesion: 0.50
Nodes (3): Checklist, Kitchen Ticket Ergonomics Review, Tool Doctrine

### Community 143 - "Operator Friction Audit"
Cohesion: 0.50
Nodes (3): Checklist, Operator Friction Audit, Tool Doctrine

### Community 144 - "Scenario Automation Planner"
Cohesion: 0.50
Nodes (3): Focus, Scenario Automation Planner, Tool Doctrine

### Community 145 - "Guia de uso"
Cohesion: 0.67
Nodes (3): Automações operacionais implementadas, Cenários iniciais de configuração (roadmap), Guia de uso

### Community 146 - "devDependencies"
Cohesion: 0.15
Nodes (13): @axe-core/playwright, @biomejs/biome, c8, devDependencies, @axe-core/playwright, @biomejs/biome, c8, @playwright/test (+5 more)

### Community 147 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, pg, pg, name, private, type, version

### Community 148 - "catalog-repository.js"
Cohesion: 0.46
Nodes (7): archiveCatalogItem(), getCatalogItem(), insertCatalogItem(), listCatalogItems(), lockCatalogItems(), mapCatalogItem(), updateCatalogItem()

### Community 153 - "workspaces"
Cohesion: 0.40
Nodes (5): packages/*, workspaces, apps/api, apps/event-simulator, apps/print-bridge

### Community 155 - "Guia de uso"
Cohesion: 0.67
Nodes (3): Escopo da v1, Fluxo de operação, Guia de uso

### Community 157 - "Guia de desenvolvimento"
Cohesion: 0.67
Nodes (3): Guia de desenvolvimento, Propósito do histórico, Ver também

## Knowledge Gaps
- **886 isolated node(s):** `name`, `version`, `private`, `type`, `start` (+881 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createIFoodAdapter()` connect `ifood.js` to `command-outbox.js`, `integrations.test.js`, `order-actions.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `createDb()` connect `db.js` to `seed-demo-postgres.test.js`, `idempotency.js`, `api/src/server.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `Documentação Central — Camoburguer Demo` connect `Documentação Central — Camoburguer Demo` to `00-mapa-do-projeto.md`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `wireCart()` (e.g. with `renderOrderItems()` and `syncCashChange()`) actually correct?**
  _`wireCart()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `createIFoodAdapter()` (e.g. with `fetchBatch()` and `finalizeCommand()`) actually correct?**
  _`createIFoodAdapter()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _886 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ifood.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1349206349206349 - nodes in this community are weakly interconnected._