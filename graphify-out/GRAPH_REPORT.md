# Graph Report - graphify-worktree  (2026-07-21)

## Corpus Check
- Corpus is ~42,222 words - fits in a single context window. You may not need a graph.

## Summary
- 176 nodes · 260 edges · 13 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 153 · imports: 66 · calls: 40 · imports_from: 1


## Input Scope
- Requested: auto
- Resolved: all (source: default-auto)
- Included files: 84 · Candidates: recursive
- Excluded: 0 untracked · 0 ignored · 0 sensitive · 0 missing committed
## God Nodes (most connected - your core abstractions)
1. `refreshAll()` - 13 edges
2. `money()` - 8 edges
3. `createOrder()` - 6 edges
4. `mapPrintJob()` - 5 edges
5. `calculateOrderPreviewTotal()` - 5 edges
6. `renderOrderItems()` - 5 edges
7. `renderActiveTab()` - 5 edges
8. `renderShifts()` - 5 edges
9. `requestJson()` - 4 edges
10. `requestForm()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (34): activeShift(), addOrAccumulateItem(), api(), calculateOrderPreviewTotal(), escapeHtml(), financeTypeLabels, formatWhen(), fulfillmentLabels (+26 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (25): ADD_ONS, addonCategories, CATALOG, products, ALLOWED_TRANSITIONS, buildKitchenTicket(), calculateOrderTotal(), calculateStockRequirements() (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (5): app, db, port, sse, TAB_PAYMENT_METHODS

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (13): requestForm(), requestJson(), findChannelMapping(), getOrderWithMapping(), getPendingCommands(), insertChannelCommand(), insertChannelEvent(), insertChannelMapping() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.24
Nodes (9): api(), bridgePayload, createOrder(), currentShift, database, orders, previousOpenShift, request() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (8): mapChannelCommand(), mapChannelEvent(), mapChannelMapping(), mapFinanceEntry(), mapOrder(), mapShift(), mapTab(), mapTabPayment()

### Community 6 - "Community 6"
Cohesion: 0.43
Nodes (6): buildEntriesFromOrder(), buildEntryFromAdjustment(), buildEntryFromTabPayment(), buildOpeningEntry(), filterEntries(), summarizeFinance()

### Community 7 - "Community 7"
Cohesion: 0.50
Nodes (5): dispatchPrintJob(), getPrimaryPrintJob(), mapPrintJob(), recoverPrintJobs(), reservePrintJob()

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (2): startIntegrationPolling(), createDb()

### Community 10 - "Community 10"
Cohesion: 0.67
Nodes (1): db

### Community 11 - "Community 11"
Cohesion: 1.00
Nodes (1): runSeedDemo()

### Community 12 - "Community 12"
Cohesion: 1.00
Nodes (1): config

### Community 13 - "Community 13"
Cohesion: 1.00
Nodes (1): createSseHub()

## Knowledge Gaps
- **27 isolated node(s):** `app`, `db`, `sse`, `TAB_PAYMENT_METHODS`, `state` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 9`** (2 nodes): `startIntegrationPolling()`, `createDb()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (1 nodes): `db`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (1 nodes): `runSeedDemo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (1 nodes): `createSseHub()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `mapOrder()` connect `Community 5` to `Community 3`, `Community 2`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `config` connect `Community 12` to `Community 2`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `app`, `db`, `sse` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08139534883720931 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10837438423645321 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12615384615384614 - nodes in this community are weakly interconnected._