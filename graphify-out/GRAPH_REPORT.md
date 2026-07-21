# Graph Report - graphify-worktree  (2026-07-21)

## Corpus Check
- Corpus is ~48,706 words - fits in a single context window. You may not need a graph.

## Summary
- 221 nodes · 332 edges · 16 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 194 · imports: 82 · calls: 55 · imports_from: 1


## Input Scope
- Requested: auto
- Resolved: all (source: default-auto)
- Included files: 90 · Candidates: recursive
- Excluded: 0 untracked · 0 ignored · 0 sensitive · 0 missing committed
## God Nodes (most connected - your core abstractions)
1. `refreshAll()` - 13 edges
2. `money()` - 9 edges
3. `calculateOrderPreviewTotal()` - 6 edges
4. `renderOrderItems()` - 6 edges
5. `createOrder()` - 6 edges
6. `updateChannelMapping()` - 5 edges
7. `getOrderWithMapping()` - 5 edges
8. `mapPrintJob()` - 5 edges
9. `renderActiveTab()` - 5 edges
10. `renderShifts()` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (31): requestForm(), requestJson(), columnFor(), COMMAND_COLUMNS, EVENT_COLUMNS, findChannelCommand(), findChannelMapping(), getOrderWithMapping() (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (37): activeShift(), addOrAccumulateItem(), api(), calculateOrderPreviewTotal(), chooseCancellationReason(), escapeHtml(), financeTypeLabels, formatWhen() (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (6): app, bridgeToken, db, port, sse, TAB_PAYMENT_METHODS

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (25): ADD_ONS, addonCategories, CATALOG, products, ALLOWED_TRANSITIONS, buildKitchenTicket(), calculateOrderTotal(), calculateStockRequirements() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.20
Nodes (9): createDb(), mapChannelCommand(), mapChannelEvent(), mapChannelMapping(), mapFinanceEntry(), mapOrder(), mapShift(), mapTab() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (9): api(), bridgePayload, createOrder(), currentShift, database, orders, previousOpenShift, request() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.43
Nodes (6): buildEntriesFromOrder(), buildEntryFromAdjustment(), buildEntryFromTabPayment(), buildOpeningEntry(), filterEntries(), summarizeFinance()

### Community 7 - "Community 7"
Cohesion: 0.40
Nodes (1): config

### Community 8 - "Community 8"
Cohesion: 0.50
Nodes (5): dispatchPrintJob(), getPrimaryPrintJob(), mapPrintJob(), recoverPrintJobs(), reservePrintJob()

### Community 9 - "Community 9"
Cohesion: 0.60
Nodes (3): equalSecret(), safeId(), validPrintContent()

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (2): files, roots

### Community 12 - "Community 12"
Cohesion: 1.00
Nodes (2): assertConfigured(), startIntegrationPolling()

### Community 13 - "Community 13"
Cohesion: 1.00
Nodes (2): runSeedDemo(), seedDemo()

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (1): db

### Community 15 - "Community 15"
Cohesion: 1.00
Nodes (2): equalSecret(), requireDemoAdmin()

### Community 16 - "Community 16"
Cohesion: 1.00
Nodes (1): createSseHub()

## Knowledge Gaps
- **39 isolated node(s):** `MAPPING_COLUMNS`, `EVENT_COLUMNS`, `COMMAND_COLUMNS`, `ACTION_RULES`, `CHANNEL_ACTIONS` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 7`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (2 nodes): `files`, `roots`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (2 nodes): `assertConfigured()`, `startIntegrationPolling()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (2 nodes): `runSeedDemo()`, `seedDemo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (1 nodes): `db`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `equalSecret()`, `requireDemoAdmin()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `createSseHub()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `mapOrder()` connect `Community 4` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `config` connect `Community 7` to `Community 2`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `MAPPING_COLUMNS`, `EVENT_COLUMNS`, `COMMAND_COLUMNS` to the rest of the system?**
  _39 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06887755102040816 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0786308973172988 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10837438423645321 - nodes in this community are weakly interconnected._