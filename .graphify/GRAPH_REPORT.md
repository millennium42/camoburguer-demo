# Graph Report - .  (2026-07-28)

## Corpus Check
- 157 files · ~138.302 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 542 nodes · 1948 edges · 25 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: ON_BRANCH: 847 · contains: 383 · MODIFIES: 280 · imports: 178 · calls: 141 · PARENT_OF: 112 · imports_from: 6 · method: 1


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 157 · Candidates: 319
- Excluded: 3 untracked · 2513 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `e0f5e6f`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `refreshAll()` - 14 edges
2. `money()` - 10 edges
3. `login()` - 9 edges
4. `mapPrintJob()` - 9 edges
5. `dispatchPrintJob()` - 9 edges
6. `runSeedDemo()` - 7 edges
7. `moneyCents()` - 6 edges
8. `fingerprint()` - 6 edges
9. `calculateOrderPreviewTotal()` - 6 edges
10. `renderOrderItems()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `00c0976 Merge pull request #3 from feat/ui-redesign` --ON_BRANCH--> `fix/c01-rbac-cozinha`  [EXTRACTED]
  git → git  _Bridges community 1 → community 2_
- `075c321 Audita demo e endurece operacao` --ON_BRANCH--> `fix/c01-rbac-cozinha`  [EXTRACTED]
  git → git  _Bridges community 16 → community 2_
- `0ee5518 fix(auth): impedir escalada de privilegio da cozinha` --ON_BRANCH--> `fix/c01-rbac-cozinha`  [EXTRACTED]
  git → git  _Bridges community 6 → community 2_
- `176899c fix(docker): resolver domínio no seed da API` --PARENT_OF--> `e0f5e6f New Commit`  [EXTRACTED]
  git → git  _Bridges community 2 → community 20_
- `3487db7 feat: refatoracao completa UI, LGPD, unificacao da documentacao e testes` --ON_BRANCH--> `codex/unificacao-lgpd-visual`  [EXTRACTED]
  git → git  _Bridges community 23 → community 1_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (53): 58fc56b fix: corrige renderCatalog tabs e event delegation no click handler, activeShift(), addOrAccumulateItem(), api(), calculateOrderPreviewTotal(), catalogAdminApi(), catalogAdminSessionIsCurrent(), catalogItemPayload() (+45 more)

### Community 1 - "Community 1"
Cohesion: 0.38
Nodes (56): chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo, feat/demo-simulator, feat/print-cash-shifts, feat/ui-redesign (+48 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (55): fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 0009eb5 fix(release): alinhar cancelamentos e fila direta, 01b42c9 feat(ops-web): adicionar manutenção do cardápio, 03f8302 docs(operations): definir catálogo, entrega direta e vínculo tardio, 09e6cee Merge pull request #12 from chore/dark-brown-ui, 152ed2f docs(seed): documentar operação explícita e rollback (+47 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (24): assertSafeSimulationBaseUrl(), createSimulationClient(), LOCAL_HOSTS, printSimulationSummary(), runSimulation(), STEP_NAMES, CANONICAL_CATALOG, DemoSeedRefusal (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (16): app, bridgeToken, db, equalSecret(), getOrderTabAssignmentByKey(), mapOrderTabAssignment(), openEventStream(), OPS_WEB_DIR (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (12): adminSession(), assertSafeTestUrl(), assertServerIdentity(), loginSession(), persistedFixtures, postSeed(), serverEnv(), startPrintBridge() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (22): 0ee5518 fix(auth): impedir escalada de privilegio da cozinha, allowedLogin(), authenticate(), changePassword(), createCsrfToken(), ensureBootstrapAdmin(), hashPassword(), hashToken() (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (14): columnFor(), COMMAND_COLUMNS, EVENT_COLUMNS, findChannelMapping(), getPendingCommands(), insertChannelEvent(), insertChannelMapping(), MAPPING_COLUMNS (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (12): requestForm(), requestJson(), clearIFoodToken(), EVENT_ACTIONS, EVENT_ALIASES, EVENT_STATUSES, fetchIFoodCancellationReasons(), getIFoodToken() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (16): api(), authHeaders, bridgePayload, catalogDrink, cookies, createOrder(), currentShift, database (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (13): ALLOWED_STANDALONE_ORDER_FIELDS, ALLOWED_TRANSITIONS, buildKitchenTicket(), calculateOrderTotal(), calculateStockRequirements(), closeCashShift(), confirmOrder(), createCancellationOrder() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.26
Nodes (12): createCashShift(), assertOperationalDate(), buildEntriesFromOrder(), buildEntryFromAdjustment(), buildEntryFromTabPayment(), buildOpeningEntry(), businessDate(), businessHour() (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (10): findChannelCommand(), getOrderWithMapping(), insertChannelCommand(), ACTION_RULES, activateAcceptedOrder(), CHANNEL_ACTIONS, createOrderAction(), claimIdempotency() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.35
Nodes (10): basisPoints(), cancellationFingerprintPayload(), canonicalAddon(), canonicalItem(), canonicalJson(), canonicalValue(), decimalUnits(), fingerprint() (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.26
Nodes (12): bridgeHeaders(), claimPrintJob(), dispatchPrintJob(), failPrintJob(), finalizePrintedJob(), getPrimaryPrintJob(), mapPrintJob(), readBridgeJson() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (10): assertEnum(), COMMAND_STATUSES, FINANCE_ENTRY_TYPES, FULFILLMENT_MODES, INTEGRATION_CHANNELS, ORDER_SOURCES, ORDER_STATUSES, PAYMENT_METHODS (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.27
Nodes (6): 075c321 Audita demo e endurece operacao, files, roots, equalSecret(), safeId(), validPrintContent()

### Community 17 - "Community 17"
Cohesion: 0.31
Nodes (7): classifyCommandError(), finishUnknown(), processChannelCommands(), reconcileCommand(), sendCommand(), claimChannelCommand(), updateOwnedChannelCommand()

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (9): createDb(), mapChannelCommand(), mapChannelEvent(), mapChannelMapping(), mapFinanceEntry(), mapOrder(), mapShift(), mapTab() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (7): assertBridgeStatus(), assertPrintPayloadSize(), BRIDGE_SUCCESS_STATUSES, classifyPrintFailure(), printBackoffMs(), printPayload(), printPayloadBytes()

### Community 20 - "Community 20"
Cohesion: 0.32
Nodes (4): e0f5e6f New Commit, assertConfigured(), startIntegrationPolling(), createSseHub()

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (5): applyIntegratedTransition(), deliveryMuchPayloadFingerprint(), mapDeliveryMuchOrderItem(), normalizeDeliveryMuchStatus(), normalizeIFoodEventType()

### Community 22 - "Community 22"
Cohesion: 0.36
Nodes (6): clean(), ELIGIBLE_STATUSES, normalizeTabAssignmentPayload(), sameTabAssignment(), tabAssignmentEligibility(), eligibleOrder

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (6): 3487db7 feat: refatoracao completa UI, LGPD, unificacao da documentacao e testes, ADD_ONS, addonCategories, CATALOG, directHandoffCategories, products

### Community 24 - "Community 24"
Cohesion: 0.48
Nodes (6): archiveCatalogItem(), getCatalogItem(), insertCatalogItem(), listCatalogItems(), mapCatalogItem(), updateCatalogItem()

## Knowledge Gaps
- **67 isolated node(s):** `LOGIN_FAILURE`, `revokedTokens`, `ROLE_PERMISSIONS`, `loginAttempts`, `appEnvironment` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `login()` connect `Community 6` to `Community 4`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `runSeedDemo()` connect `Community 3` to `Community 4`, `Community 5`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `normalizeTabAssignmentPayload()` connect `Community 22` to `Community 4`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `LOGIN_FAILURE`, `revokedTokens`, `ROLE_PERMISSIONS` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05271629778672032 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1420875420875421 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.053877551020408164 - nodes in this community are weakly interconnected._