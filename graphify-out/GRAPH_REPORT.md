# Graph Report - graphify-worktree  (2026-07-17)

## Corpus Check
- 58 files · ~29,010 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 439 nodes · 591 edges · 47 communities (44 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `82019fcd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.js
- server.js
- index.js
- dependencies
- scripts
- package.json
- smoke.mjs
- package.json
- package.json
- package.json
- package.json
- server.js
- Registro 5W2H da Evolução Operacional
- Arquitetura do Sistema
- Camoburguer Demo - AGENTS
- Pagamentos Múltiplos em Comandas
- Camoburguer Demo - SUBAGENTES
- Relatório de Validação
- Ciclo do Pedido
- Ciclo Financeiro
- Contexto Operacional
- Estoque por Categoria
- Automações por Cenário
- Canais e Captura
- Padrão de Ticket de Cozinha
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
- Finance Insight Curator
- Kitchen Ticket Ergonomics Review
- Operator Friction Audit
- Scenario Automation Planner
- camoburguer-implementation-flow.md
- graphify-update-wsl.sh

## God Nodes (most connected - your core abstractions)
1. `toMoney()` - 22 edges
2. `$()` - 20 edges
3. `refreshAll()` - 16 edges
4. `wireCart()` - 13 edges
5. `Registro 5W2H da Evolução Operacional` - 12 edges
6. `escapeHtml()` - 11 edges
7. `wireForms()` - 11 edges
8. `createOrder()` - 11 edges
9. `Arquitetura do Sistema` - 11 edges
10. `mapOrder()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `changeStock()` --calls--> `calculateStockRequirements()`  [EXTRACTED]
  apps/api/src/server.js → packages/domain/index.js
- `reservePrintJob()` --calls--> `buildKitchenTicket()`  [EXTRACTED]
  apps/api/src/server.js → packages/domain/index.js
- `mapOrder()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js
- `listOrders()` --indirect_call--> `mapOrder()`  [INFERRED]
  apps/api/src/server.js → apps/api/src/db.js
- `mapTab()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js

## Import Cycles
- None detected.

## Communities (47 total, 3 thin omitted)

### Community 0 - "main.js"
Cohesion: 0.14
Nodes (41): activeShift(), addOrAccumulateItem(), api(), calculateOrderPreviewTotal(), escapeHtml(), financeTypeLabels, formatWhen(), fulfillmentLabels (+33 more)

### Community 1 - "server.js"
Cohesion: 0.08
Nodes (44): config, createDb(), mapFinanceEntry(), mapOrder(), mapShift(), mapTab(), mapTabPayment(), app (+36 more)

### Community 2 - "index.js"
Cohesion: 0.17
Nodes (20): ADD_ONS, addonCategories, CATALOG, products, ALLOWED_TRANSITIONS, buildKitchenTicket(), calculateOrderTotal(), calculateStockRequirements() (+12 more)

### Community 3 - "dependencies"
Cohesion: 0.09
Nodes (21): @camoburguer/shared-types, dotenv, fastify, @camoburguer/domain, @camoburguer/finance-core, @fastify/cors, dependencies, @camoburguer/domain (+13 more)

### Community 4 - "scripts"
Cohesion: 0.11
Nodes (18): name, private, scripts, graph:extract, graph:extract:code, graph:update, smoke, start:api (+10 more)

### Community 5 - "package.json"
Cohesion: 0.17
Nodes (11): dotenv, fastify, dependencies, dotenv, fastify, name, private, scripts (+3 more)

### Community 6 - "smoke.mjs"
Cohesion: 0.24
Nodes (9): api(), bridgePayload, createOrder(), currentShift, database, orders, previousOpenShift, request() (+1 more)

### Community 7 - "package.json"
Cohesion: 0.22
Nodes (8): dependencies, @camoburguer/shared-types, main, name, private, type, version, @camoburguer/shared-types

### Community 8 - "package.json"
Cohesion: 0.22
Nodes (8): dependencies, @camoburguer/shared-types, main, name, private, type, version, @camoburguer/shared-types

### Community 9 - "package.json"
Cohesion: 0.25
Nodes (7): Camoburguer Demo - AGENTS, Graphify, Implementation Boundaries, Operating Doctrine, Required Seed Artifacts, Review Standard, Speeds

### Community 10 - "package.json"
Cohesion: 0.25
Nodes (7): Camoburguer Demo - SUBAGENTES, Doutrina comum, Entrega obrigatória de cada subagente, Foco por etapa, Poder do revisor, Sequência obrigatória, Skill obrigatória por subagente

### Community 13 - "Registro 5W2H da Evolução Operacional"
Cohesion: 0.06
Nodes (30): PR 0 — Descontos por item e pedido, PR 1 — Guia de desenvolvimento, 5W2H e Graphify, PR 2 — Cardápio OlaClick, PR 3 — Adicionais do cardápio, PR 4 — Comandas livres, PR 5 — Rodadas e tickets corretivos, PR 6 — Estoque por categoria, PR 7 — Pagamentos múltiplos (+22 more)

### Community 14 - "Arquitetura do Sistema"
Cohesion: 0.17
Nodes (11): Apps, Arquitetura do Sistema, Caixa, Decisões, Eventos internos, Fluxo operacional obrigatório, Fronteiras e seams, Infra (+3 more)

### Community 15 - "Camoburguer Demo - AGENTS"
Cohesion: 0.29
Nodes (6): name, private, scripts, start, type, version

### Community 16 - "Pagamentos Múltiplos em Comandas"
Cohesion: 0.25
Nodes (7): Caixa e financeiro, Contrato comercial, Encerramento, Estornos, Limites da versão, Pagamentos Múltiplos em Comandas, Valores e idempotência

### Community 17 - "Camoburguer Demo - SUBAGENTES"
Cohesion: 0.33
Nodes (5): Auditoria e limites, Corte de migração, Escopo, Estoque por Categoria, Fluxo

### Community 18 - "Relatório de Validação"
Cohesion: 0.18
Nodes (10): Decisão de release, Evidência reproduzível, Gates executados, Incidente de validação resolvido, Incremento: estoque por categorias, Incremento: pagamentos múltiplos, Incremento: QA, documentação e release, Incremento: retirada e filtros financeiros (+2 more)

### Community 19 - "Ciclo do Pedido"
Cohesion: 0.33
Nodes (5): Ciclo do Pedido, Comandas locais, Estados, Eventos relevantes, Regras principais

### Community 20 - "Ciclo Financeiro"
Cohesion: 0.33
Nodes (5): Ciclo Financeiro, Escopo da v1, Gatilhos automáticos, Regras do caixa, Visões gerenciais

### Community 21 - "Contexto Operacional"
Cohesion: 0.25
Nodes (7): Consumo local, Contexto Operacional, Objetivo da demo, Problemas atuais, Responsabilidade operacional, Responsabilidades adicionais da v1, Resumo

### Community 22 - "Estoque por Categoria"
Cohesion: 0.33
Nodes (5): main, name, private, type, version

### Community 23 - "Automações por Cenário"
Cohesion: 0.33
Nodes (5): Automações operacionais implementadas, Automações por Cenário, Cenários iniciais, Estratégia, Estrutura esperada de regra

### Community 24 - "Canais e Captura"
Cohesion: 0.40
Nodes (4): Campos mínimos por captura, Canais e Captura, Estratégia v1, Fontes de pedido

### Community 25 - "Padrão de Ticket de Cozinha"
Cohesion: 0.40
Nodes (4): Campos obrigatórios, Padrão de Ticket de Cozinha, Regras de legibilidade, Ticket corretivo

### Community 26 - "Architecture Gate Review"
Cohesion: 0.40
Nodes (4): Architecture Gate Review, Checklist, Decision Output, Tool Doctrine

### Community 27 - "Backend Gate Review"
Cohesion: 0.40
Nodes (4): Backend Gate Review, Checklist, Decision Output, Tool Doctrine

### Community 28 - "Domain DB Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Domain DB Gate Review, Tool Doctrine

### Community 29 - "Frontend Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Frontend Gate Review, Tool Doctrine

### Community 30 - "Infra Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Infra Gate Review, Tool Doctrine

### Community 31 - "Operator UI Builder"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Operator UI Builder, Tool Doctrine

### Community 32 - "Order Finance Domain Modeler"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Order Finance Domain Modeler, Tool Doctrine

### Community 33 - "Print Infra Specialist"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Print Infra Specialist, Tool Doctrine

### Community 34 - "Process Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Process Gate Review, Tool Doctrine

### Community 35 - "Release Readiness Review"
Cohesion: 0.40
Nodes (4): Mandatory Output, Release Readiness Review, Required Inputs, Tool Doctrine

### Community 36 - "Restaurant Architecture Designer"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Restaurant Architecture Designer, Tool Doctrine

### Community 37 - "Restaurant Backend Builder"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Restaurant Backend Builder, Tool Doctrine

### Community 38 - "Restaurant Demo QA"
Cohesion: 0.40
Nodes (4): Mandatory Output, Restaurant Demo QA, Test Scope, Tool Doctrine

### Community 39 - "Restaurant Process Orchestrator"
Cohesion: 0.40
Nodes (4): Mandatory Output, Restaurant Process Orchestrator, Tool Doctrine, Workflow

### Community 40 - "Template de Revisão"
Cohesion: 0.40
Nodes (4): Checklist, Estado, Saída obrigatória, Template de Revisão

### Community 41 - "Finance Insight Curator"
Cohesion: 0.50
Nodes (3): Finance Insight Curator, Focus, Tool Doctrine

### Community 42 - "Kitchen Ticket Ergonomics Review"
Cohesion: 0.50
Nodes (3): Checklist, Kitchen Ticket Ergonomics Review, Tool Doctrine

### Community 43 - "Operator Friction Audit"
Cohesion: 0.50
Nodes (3): Checklist, Operator Friction Audit, Tool Doctrine

### Community 44 - "Scenario Automation Planner"
Cohesion: 0.50
Nodes (3): Focus, Scenario Automation Planner, Tool Doctrine

## Knowledge Gaps
- **226 isolated node(s):** `name`, `version`, `private`, `type`, `start` (+221 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 2 inferred relationships involving `wireCart()` (e.g. with `renderAddOns()` and `renderOrderItems()`) actually correct?**
  _`wireCart()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _226 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14396456256921372 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07896575821104122 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Registro 5W2H da Evolução Operacional` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._