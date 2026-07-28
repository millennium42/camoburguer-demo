# Graph Report - .  (2026-07-28)

## Corpus Check
- 99 files · ~103.820 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 464 nodes · 1569 edges · 31 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: ON_BRANCH: 657 · contains: 319 · MODIFIES: 245 · imports: 123 · calls: 111 · PARENT_OF: 110 · imports_from: 3 · method: 1


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 99 · Candidates: 119
- Excluded: 176 untracked · 2480 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `176899c`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `refreshAll()` - 14 edges
2. `money()` - 10 edges
3. `mapPrintJob()` - 9 edges
4. `dispatchPrintJob()` - 9 edges
5. `runSeedDemo()` - 7 edges
6. `calculateOrderPreviewTotal()` - 6 edges
7. `renderOrderItems()` - 6 edges
8. `createOrder()` - 6 edges
9. `mapCatalogItem()` - 5 edges
10. `columnFor()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `0009eb5 fix(release): alinhar cancelamentos e fila direta` --ON_BRANCH--> `main`  [EXTRACTED]
  git → git  _Bridges community 8 → community 3_
- `0009eb5 fix(release): alinhar cancelamentos e fila direta` --PARENT_OF--> `e0a6d46 fix(integrations): classificar itens externos pelo catálogo`  [EXTRACTED]
  git → git  _Bridges community 8 → community 9_
- `00c0976 Merge pull request #3 from feat/ui-redesign` --ON_BRANCH--> `main`  [EXTRACTED]
  git → git  _Bridges community 0 → community 3_
- `01b42c9 feat(ops-web): adicionar manutenção do cardápio` --ON_BRANCH--> `main`  [EXTRACTED]
  git → git  _Bridges community 20 → community 3_
- `01b42c9 feat(ops-web): adicionar manutenção do cardápio` --PARENT_OF--> `79c5964 feat(orders): vincular pedido existente a comanda`  [EXTRACTED]
  git → git  _Bridges community 20 → community 21_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.33
Nodes (60): chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo, feat/demo-simulator, feat/print-cash-shifts, feat/ui-redesign (+52 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (12): app, bridgeToken, db, openEventStream(), OPS_WEB_DIR, port, PREPARATION_MODES, PUBLIC_UI_PATHS (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (20): api(), catalogAdminApi(), catalogAdminSessionIsCurrent(), chooseCancellationReason(), financeTypeLabels, fulfillmentLabels, htmlEscapes, lockCatalogAdmin() (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (30): main, 1bb0752 docs: atualizar documentacao completa, README, 5W2H (PRs 13-18), guia de desenvolvimento com IA e deploy Render, 1bd28c8 fix(ops-web): ajustar layout responsivo e largura das linhas do carrinho no modal de pedidos, 24da310 Merge pull request #15 from feature/security-lgpd, 344d87e fix(ops-web): correcao de renderizacao em tempo real de itens de comanda e remocao de marcadores de conflito no HTML, 384a10f feat(ops-web): fluxo continuo de comandas e edicao de desconto, 38cc0d0 feat(ops-web): adicionar calculo de troco para parcelas de pagamento de comanda em dinheiro, 3fb67d4 fix: point ops-web apiBase to camoburguer-api subdomain on Render (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (13): createDb(), adminSession(), assertSafeTestUrl(), assertServerIdentity(), loginSession(), persistedFixtures, postSeed(), serverEnv() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (12): requestForm(), requestJson(), clearIFoodToken(), EVENT_ACTIONS, EVENT_ALIASES, EVENT_STATUSES, fetchIFoodCancellationReasons(), getIFoodToken() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (16): api(), authHeaders, bridgePayload, catalogDrink, cookies, createOrder(), currentShift, database (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (11): columnFor(), COMMAND_COLUMNS, EVENT_COLUMNS, getPendingCommands(), insertChannelEvent(), MAPPING_COLUMNS, updateChannelCommand(), updateChannelEvent() (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.28
Nodes (13): 0009eb5 fix(release): alinhar cancelamentos e fila direta, ALLOWED_TRANSITIONS, buildKitchenTicket(), calculateOrderTotal(), calculateStockRequirements(), closeCashShift(), confirmOrder(), createCancellationOrder() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (11): a045fac docs(spec): impedir auto-seed destrutivo, e0a6d46 fix(integrations): classificar itens externos pelo catálogo, eef1d5a fix(integrations): tornar eventos diretos idempotentes, findChannelMapping(), insertChannelMapping(), ingestExternalOrder(), deliveryMuchPayloadFingerprint(), mapDeliveryMuchOrderItem() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (10): CANONICAL_CATALOG, DemoSeedRefusal, isSanitizedTarget(), OPERATIONAL_TABLES, resolveTarget(), runPreflight(), runSeedDemo(), sameCatalog() (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (8): 03f8302 docs(operations): definir catálogo, entrega direta e vínculo tardio, 075c321 Audita demo e endurece operacao, files, roots, createSseHub(), equalSecret(), safeId(), validPrintContent()

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (12): 58fc56b fix: corrige renderCatalog tabs e event delegation no click handler, 9dbb57a test(release): consolidar regressões e mapa do projeto, f3fc468 feat(ops-web): atribuir pedido em andamento, addOrAccumulateItem(), catalogItemPayload(), integrationAttempt(), nextOrderAttempt(), setItemDiscount() (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (10): assertOperationalDate(), buildEntriesFromOrder(), buildEntryFromAdjustment(), buildEntryFromTabPayment(), buildOpeningEntry(), businessDate(), businessHour(), filterEntries() (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.24
Nodes (12): activeShift(), calculateOrderPreviewTotal(), formatWhen(), money(), openItemConfig(), printShiftReport(), renderActiveTab(), renderOrderItems() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (11): assertEnum(), COMMAND_STATUSES, FINANCE_ENTRY_TYPES, FULFILLMENT_MODES, INTEGRATION_CHANNELS, ORDER_SOURCES, ORDER_STATUSES, PAYMENT_METHODS (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.26
Nodes (12): bridgeHeaders(), claimPrintJob(), dispatchPrintJob(), failPrintJob(), finalizePrintedJob(), getPrimaryPrintJob(), mapPrintJob(), readBridgeJson() (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (7): 152ed2f docs(seed): documentar operação explícita e rollback, 176899c fix(docker): resolver domínio no seed da API, 98ec659 fix(api): impedir seed destrutivo no boot, f3191d3 fix(render): desativar auto-seed no deploy, PROTECTED_TABLES, requestDemoSeed(), OPERATIONAL_TABLES

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (8): findChannelCommand(), getOrderWithMapping(), insertChannelCommand(), ACTION_RULES, activateAcceptedOrder(), applyIntegratedTransition(), CHANNEL_ACTIONS, createOrderAction()

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (11): escapeHtml(), reconcileCartItems(), refreshAll(), renderCatalog(), renderEntries(), renderFinanceSummary(), renderInventory(), renderKitchen() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.36
Nodes (8): 01b42c9 feat(ops-web): adicionar manutenção do cardápio, b5e40c6 feat(api): persistir e administrar catálogo operacional, archiveCatalogItem(), getCatalogItem(), insertCatalogItem(), listCatalogItems(), mapCatalogItem(), updateCatalogItem()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (7): 79c5964 feat(orders): vincular pedido existente a comanda, clean(), ELIGIBLE_STATUSES, normalizeTabAssignmentPayload(), sameTabAssignment(), tabAssignmentEligibility(), eligibleOrder

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (8): mapChannelCommand(), mapChannelEvent(), mapChannelMapping(), mapFinanceEntry(), mapOrder(), mapShift(), mapTab(), mapTabPayment()

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (4): appEnvironment, assertSafeAutoSeed(), config, validateTimeZone()

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (6): 87b872c feat(domain): congelar classificação operacional dos itens, ADD_ONS, addonCategories, CATALOG, directHandoffCategories, products

### Community 25 - "Community 25"
Cohesion: 0.40
Nodes (1): 3487db7 feat: refatoracao completa UI, LGPD, unificacao da documentacao e testes

### Community 26 - "Community 26"
Cohesion: 0.50
Nodes (4): 199ab9b chore(ops-web): remover botao lancar itens dos cards de comandas, 1f99625 feat(ops-web): exibir estoque de paes no painel operacional e atualizar renderizacao, 5c45a5c feat(ops-web): abrir modal de novo pedido associado a comanda criada sem trocar de aba, b5581df feat(ops-web): substituir card de novo pedido na aba pedidos por resumo operacional minimalista

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (1): db

### Community 28 - "Community 28"
Cohesion: 1.00
Nodes (2): assertConfigured(), startIntegrationPolling()

### Community 29 - "Community 29"
Cohesion: 1.00
Nodes (2): equalSecret(), requireDemoAdmin()

### Community 30 - "Community 30"
Cohesion: 1.00
Nodes (2): getOrderTabAssignmentByKey(), mapOrderTabAssignment()

## Knowledge Gaps
- **58 isolated node(s):** `appEnvironment`, `MAPPING_COLUMNS`, `EVENT_COLUMNS`, `COMMAND_COLUMNS`, `ACTION_RULES` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 25`** (1 nodes): `3487db7 feat: refatoracao completa UI, LGPD, unificacao da documentacao e testes`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `db`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `assertConfigured()`, `startIntegrationPolling()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `equalSecret()`, `requireDemoAdmin()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `getOrderTabAssignmentByKey()`, `mapOrderTabAssignment()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `runSeedDemo()` connect `Community 10` to `Community 1`, `Community 4`, `Community 17`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `createDb()` connect `Community 4` to `Community 22`, `Community 1`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `normalizeTabAssignmentPayload()` connect `Community 21` to `Community 1`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `appEnvironment`, `MAPPING_COLUMNS`, `EVENT_COLUMNS` to the rest of the system?**
  _58 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07357357357357357 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.13793103448275862 - nodes in this community are weakly interconnected._