# Graph Report - graphify-worktree  (2026-07-26)

## Corpus Check
- 93 files · ~57,087 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 274 nodes · 430 edges · 18 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 244 · imports: 105 · calls: 80 · imports_from: 1


## Input Scope
- Requested: auto
- Resolved: all (source: default-auto)
- Included files: 93 · Candidates: recursive
- Excluded: 0 untracked · 0 ignored · 0 sensitive · 0 missing committed
## God Nodes (most connected - your core abstractions)
1. `refreshAll()` - 14 edges
2. `money()` - 10 edges
3. `mapPrintJob()` - 6 edges
4. `calculateOrderPreviewTotal()` - 6 edges
5. `renderOrderItems()` - 6 edges
6. `createOrder()` - 6 edges
7. `mapCatalogItem()` - 5 edges
8. `updateChannelMapping()` - 5 edges
9. `getOrderWithMapping()` - 5 edges
10. `renderActiveTab()` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (51): activeShift(), addOrAccumulateItem(), api(), calculateOrderPreviewTotal(), catalogAdminApi(), catalogAdminSessionIsCurrent(), catalogItemPayload(), chooseCancellationReason() (+43 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (35): requestForm(), requestJson(), columnFor(), COMMAND_COLUMNS, EVENT_COLUMNS, findChannelCommand(), findChannelMapping(), getOrderWithMapping() (+27 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (34): ADD_ONS, addonCategories, CATALOG, directHandoffCategories, products, ALLOWED_TRANSITIONS, buildKitchenTicket(), calculateOrderTotal() (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (8): app, bridgeToken, db, port, PREPARATION_MODES, sse, STOCK_CATEGORIES, TAB_PAYMENT_METHODS

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (13): api(), bridgePayload, createOrder(), currentShift, database, expectBlockedAssignment(), orders, originalOrderSnapshot (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.20
Nodes (9): createDb(), mapChannelCommand(), mapChannelEvent(), mapChannelMapping(), mapFinanceEntry(), mapOrder(), mapShift(), mapTab() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.36
Nodes (6): clean(), ELIGIBLE_STATUSES, normalizeTabAssignmentPayload(), sameTabAssignment(), tabAssignmentEligibility(), eligibleOrder

### Community 7 - "Community 7"
Cohesion: 0.48
Nodes (6): archiveCatalogItem(), getCatalogItem(), insertCatalogItem(), listCatalogItems(), mapCatalogItem(), updateCatalogItem()

### Community 8 - "Community 8"
Cohesion: 0.40
Nodes (6): dispatchPrintJob(), getPrimaryPrintJob(), mapPrintJob(), recoverPrintJobs(), reservePrintJob(), reserveReprintJob()

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (1): config

### Community 10 - "Community 10"
Cohesion: 0.60
Nodes (3): equalSecret(), safeId(), validPrintContent()

### Community 11 - "Community 11"
Cohesion: 0.50
Nodes (2): files, roots

### Community 13 - "Community 13"
Cohesion: 1.00
Nodes (2): assertConfigured(), startIntegrationPolling()

### Community 14 - "Community 14"
Cohesion: 1.00
Nodes (2): runSeedDemo(), seedDemo()

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (1): db

### Community 16 - "Community 16"
Cohesion: 1.00
Nodes (2): equalSecret(), requireDemoAdmin()

### Community 17 - "Community 17"
Cohesion: 1.00
Nodes (2): getOrderTabAssignmentByKey(), mapOrderTabAssignment()

### Community 18 - "Community 18"
Cohesion: 1.00
Nodes (1): createSseHub()

## Knowledge Gaps
- **47 isolated node(s):** `MAPPING_COLUMNS`, `EVENT_COLUMNS`, `COMMAND_COLUMNS`, `ACTION_RULES`, `CHANNEL_ACTIONS` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 9`** (1 nodes): `config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (2 nodes): `files`, `roots`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (2 nodes): `assertConfigured()`, `startIntegrationPolling()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `runSeedDemo()`, `seedDemo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (1 nodes): `db`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `equalSecret()`, `requireDemoAdmin()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `getOrderTabAssignmentByKey()`, `mapOrderTabAssignment()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `createSseHub()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `mapOrder()` connect `Community 5` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `lockCatalogItems()` connect `Community 1` to `Community 7`, `Community 3`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `MAPPING_COLUMNS`, `EVENT_COLUMNS`, `COMMAND_COLUMNS` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05608322026232474 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06561085972850679 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0858974358974359 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._