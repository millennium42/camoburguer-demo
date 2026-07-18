# Graph Report - /home/millennium/camoburguer-graph-rebuild-20260716  (2026-07-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 215 nodes · 390 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3d1125df`
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

## God Nodes (most connected - your core abstractions)
1. `$()` - 20 edges
2. `toMoney()` - 20 edges
3. `refreshAll()` - 16 edges
4. `wireCart()` - 12 edges
5. `wireForms()` - 11 edges
6. `createOrder()` - 11 edges
7. `escapeHtml()` - 10 edges
8. `mapOrder()` - 9 edges
9. `money()` - 9 edges
10. `scripts` - 9 edges

## Surprising Connections (you probably didn't know these)
- `mapOrder()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js
- `mapTab()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js
- `mapFinanceEntry()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js
- `mapShift()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/db.js → packages/shared-types/index.js
- `tabView()` --calls--> `toMoney()`  [EXTRACTED]
  apps/api/src/server.js → packages/shared-types/index.js

## Import Cycles
- None detected.

## Communities (13 total, 1 thin omitted)

### Community 0 - "main.js"
Cohesion: 0.14
Nodes (41): activeShift(), addOrAccumulateItem(), api(), calculateOrderPreviewTotal(), escapeHtml(), financeTypeLabels, formatWhen(), fulfillmentLabels (+33 more)

### Community 1 - "server.js"
Cohesion: 0.09
Nodes (31): config, createDb(), mapFinanceEntry(), mapOrder(), mapShift(), mapTab(), app, db (+23 more)

### Community 2 - "index.js"
Cohesion: 0.14
Nodes (27): changeStock(), ADD_ONS, addonCategories, CATALOG, products, ALLOWED_TRANSITIONS, calculateOrderTotal(), calculateStockRequirements() (+19 more)

### Community 3 - "dependencies"
Cohesion: 0.09
Nodes (21): dependencies, @camoburguer/domain, @camoburguer/finance-core, @camoburguer/shared-types, dotenv, fastify, @fastify/cors, pg (+13 more)

### Community 4 - "scripts"
Cohesion: 0.11
Nodes (18): name, private, scripts, graph:extract, graph:extract:code, graph:update, smoke, start:api (+10 more)

### Community 5 - "package.json"
Cohesion: 0.17
Nodes (11): dependencies, dotenv, fastify, dotenv, fastify, name, private, scripts (+3 more)

### Community 6 - "smoke.mjs"
Cohesion: 0.24
Nodes (9): api(), bridgePayload, createOrder(), currentShift, database, orders, previousOpenShift, request() (+1 more)

### Community 7 - "package.json"
Cohesion: 0.22
Nodes (8): dependencies, @camoburguer/shared-types, @camoburguer/shared-types, main, name, private, type, version

### Community 8 - "package.json"
Cohesion: 0.22
Nodes (8): dependencies, @camoburguer/shared-types, @camoburguer/shared-types, main, name, private, type, version

### Community 9 - "package.json"
Cohesion: 0.29
Nodes (6): name, private, scripts, start, type, version

### Community 10 - "package.json"
Cohesion: 0.33
Nodes (5): main, name, private, type, version

## Knowledge Gaps
- **80 isolated node(s):** `name`, `version`, `private`, `type`, `start` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toMoney()` connect `index.js` to `server.js`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `wireCart()` (e.g. with `renderAddOns()` and `renderOrderItems()`) actually correct?**
  _`wireCart()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14174972314507198 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09388335704125178 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14393939393939395 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._