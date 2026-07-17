# Graph Report - Camoburguer Demo  (2026-07-16)

## Corpus Check
- 54 files · ~15,357 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 374 nodes · 474 edges · 43 communities (41 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2e31e76`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- server.js
- dependencies
- main.js
- scripts
- package.json
- package.json
- package.json
- Camoburguer Demo - AGENTS
- Camoburguer Demo - SUBAGENTES
- package.json
- Arquitetura do Sistema
- Contexto Operacional
- package.json
- Automações por Cenário
- Canais e Captura
- Ciclo do Pedido
- Ciclo Financeiro
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
- Padrão de Ticket de Cozinha
- Finance Insight Curator
- Kitchen Ticket Ergonomics Review
- Operator Friction Audit
- Scenario Automation Planner
- server.js
- camoburguer-implementation-flow.md
- index.js
- Camoburguer Demo
- Relatório de Validação

## God Nodes (most connected - your core abstractions)
1. `$()` - 17 edges
2. `toMoney()` - 16 edges
3. `refreshAll()` - 14 edges
4. `Arquitetura do Sistema` - 10 edges
5. `wireCart()` - 9 edges
6. `wireForms()` - 9 edges
7. `scripts` - 9 edges
8. `mapOrder()` - 8 edges
9. `mapShift()` - 8 edges
10. `renderOrderItems()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `mapOrder()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js
- `listOrders()` --indirect_call--> `mapOrder()`  [INFERRED]
  apps/api/src/server.js → apps/api/src/db.js
- `mapFinanceEntry()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js
- `listEntries()` --indirect_call--> `mapFinanceEntry()`  [INFERRED]
  apps/api/src/server.js → apps/api/src/db.js
- `mapShift()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js

## Import Cycles
- None detected.

## Communities (43 total, 2 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.08
Nodes (48): config, createDb(), mapFinanceEntry(), mapOrder(), mapShift(), app, db, dispatchPrintJob() (+40 more)

### Community 1 - "dependencies"
Cohesion: 0.09
Nodes (21): dependencies, @camoburguer/domain, @camoburguer/finance-core, @camoburguer/shared-types, dotenv, fastify, @fastify/cors, pg (+13 more)

### Community 2 - "main.js"
Cohesion: 0.15
Nodes (36): activeShift(), addOrAccumulateItem(), api(), calculateOrderPreviewTotal(), escapeHtml(), financeTypeLabels, formatWhen(), fulfillmentLabels (+28 more)

### Community 3 - "scripts"
Cohesion: 0.11
Nodes (18): name, private, scripts, graph:extract, graph:extract:code, graph:update, smoke, start:api (+10 more)

### Community 4 - "package.json"
Cohesion: 0.17
Nodes (11): dependencies, dotenv, fastify, dotenv, fastify, name, private, scripts (+3 more)

### Community 5 - "package.json"
Cohesion: 0.22
Nodes (8): dependencies, @camoburguer/shared-types, @camoburguer/shared-types, main, name, private, type, version

### Community 6 - "package.json"
Cohesion: 0.22
Nodes (8): dependencies, @camoburguer/shared-types, @camoburguer/shared-types, main, name, private, type, version

### Community 7 - "Camoburguer Demo - AGENTS"
Cohesion: 0.25
Nodes (7): Camoburguer Demo - AGENTS, Graphify, Implementation Boundaries, Operating Doctrine, Required Seed Artifacts, Review Standard, Speeds

### Community 8 - "Camoburguer Demo - SUBAGENTES"
Cohesion: 0.25
Nodes (7): Camoburguer Demo - SUBAGENTES, Doutrina comum, Entrega obrigatória de cada subagente, Foco por etapa, Poder do revisor, Sequência obrigatória, Skill obrigatória por subagente

### Community 9 - "package.json"
Cohesion: 0.29
Nodes (6): name, private, scripts, start, type, version

### Community 10 - "Arquitetura do Sistema"
Cohesion: 0.18
Nodes (10): Apps, Arquitetura do Sistema, Caixa, Decisões, Eventos internos, Fluxo operacional obrigatório, Fronteiras e seams, Infra (+2 more)

### Community 11 - "Contexto Operacional"
Cohesion: 0.33
Nodes (5): Contexto Operacional, Objetivo da demo, Problemas atuais, Responsabilidade operacional, Resumo

### Community 12 - "package.json"
Cohesion: 0.33
Nodes (5): main, name, private, type, version

### Community 13 - "Automações por Cenário"
Cohesion: 0.40
Nodes (4): Automações por Cenário, Cenários iniciais, Estratégia, Estrutura esperada de regra

### Community 14 - "Canais e Captura"
Cohesion: 0.40
Nodes (4): Campos mínimos por captura, Canais e Captura, Estratégia v1, Fontes de pedido

### Community 15 - "Ciclo do Pedido"
Cohesion: 0.40
Nodes (4): Ciclo do Pedido, Estados, Eventos relevantes, Regras principais

### Community 16 - "Ciclo Financeiro"
Cohesion: 0.33
Nodes (5): Ciclo Financeiro, Escopo da v1, Gatilhos automáticos, Regras do caixa, Visões gerenciais

### Community 17 - "Architecture Gate Review"
Cohesion: 0.40
Nodes (4): Architecture Gate Review, Checklist, Decision Output, Tool Doctrine

### Community 18 - "Backend Gate Review"
Cohesion: 0.40
Nodes (4): Backend Gate Review, Checklist, Decision Output, Tool Doctrine

### Community 19 - "Domain DB Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Domain DB Gate Review, Tool Doctrine

### Community 20 - "Frontend Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Frontend Gate Review, Tool Doctrine

### Community 21 - "Infra Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Infra Gate Review, Tool Doctrine

### Community 22 - "Operator UI Builder"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Operator UI Builder, Tool Doctrine

### Community 23 - "Order Finance Domain Modeler"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Order Finance Domain Modeler, Tool Doctrine

### Community 24 - "Print Infra Specialist"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Print Infra Specialist, Tool Doctrine

### Community 25 - "Process Gate Review"
Cohesion: 0.40
Nodes (4): Checklist, Decision Output, Process Gate Review, Tool Doctrine

### Community 26 - "Release Readiness Review"
Cohesion: 0.40
Nodes (4): Mandatory Output, Release Readiness Review, Required Inputs, Tool Doctrine

### Community 27 - "Restaurant Architecture Designer"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Restaurant Architecture Designer, Tool Doctrine

### Community 28 - "Restaurant Backend Builder"
Cohesion: 0.40
Nodes (4): Focus, Mandatory Output, Restaurant Backend Builder, Tool Doctrine

### Community 29 - "Restaurant Demo QA"
Cohesion: 0.40
Nodes (4): Mandatory Output, Restaurant Demo QA, Test Scope, Tool Doctrine

### Community 30 - "Restaurant Process Orchestrator"
Cohesion: 0.40
Nodes (4): Mandatory Output, Restaurant Process Orchestrator, Tool Doctrine, Workflow

### Community 31 - "Template de Revisão"
Cohesion: 0.40
Nodes (4): Checklist, Estado, Saída obrigatória, Template de Revisão

### Community 33 - "Padrão de Ticket de Cozinha"
Cohesion: 0.50
Nodes (3): Campos obrigatórios, Padrão de Ticket de Cozinha, Regras de legibilidade

### Community 34 - "Finance Insight Curator"
Cohesion: 0.50
Nodes (3): Finance Insight Curator, Focus, Tool Doctrine

### Community 35 - "Kitchen Ticket Ergonomics Review"
Cohesion: 0.50
Nodes (3): Checklist, Kitchen Ticket Ergonomics Review, Tool Doctrine

### Community 36 - "Operator Friction Audit"
Cohesion: 0.50
Nodes (3): Checklist, Operator Friction Audit, Tool Doctrine

### Community 37 - "Scenario Automation Planner"
Cohesion: 0.50
Nodes (3): Focus, Scenario Automation Planner, Tool Doctrine

### Community 40 - "index.js"
Cohesion: 0.28
Nodes (8): api(), bridgePayload, createOrder(), currentShift, orders, previousOpenShift, request(), runId

### Community 41 - "Camoburguer Demo"
Cohesion: 0.10
Nodes (18): PR 0 — Descontos por item e pedido, PR 1 — Guia de desenvolvimento, 5W2H e Graphify, Próximos incrementos, Registro 5W2H da Evolução Operacional, Fluxo Git empilhado, Guia de Desenvolvimento, Implementação, Objetivo (+10 more)

### Community 42 - "Relatório de Validação"
Cohesion: 0.40
Nodes (4): Evidência reproduzível, Gates executados, Relatório de Validação, Risco residual aceito

## Knowledge Gaps
- **189 isolated node(s):** `name`, `version`, `private`, `type`, `start` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `name`, `version`, `private` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0777323202805377 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `main.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1465149359886202 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Camoburguer Demo` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._