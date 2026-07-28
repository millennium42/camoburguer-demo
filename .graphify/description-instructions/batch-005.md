# Node Description Batch 6 of 12

Graphify is running in assistant/skill mode (no API key). You are the host
assistant (Claude Code / Codex / Gemini CLI). Read the prompt below and write
your JSON answer to the answer file.

## Prompt

You are documenting nodes in a knowledge graph.
For each entry below, write ONE concise factual plain-language sentence
describing what it is or does. Use only the provided context.
For a code symbol (kind=code-symbol — a function, class, or constant),
describe what the function/symbol does based on its name, source location
and neighbors — e.g. "Resolves the configured ontology profile from graphify.yaml.".
Write every description in English (en). Do not switch languages.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "ops_web_main_printshiftreport": "printShiftReport()" | kind=code-symbol | source=apps/ops-web/main.js:L250 | neighbors=[main.js, formatWhen(), money()]
- "ops_web_main_reconcilecartitems": "reconcileCartItems()" | kind=code-symbol | source=apps/ops-web/main.js:L120 | neighbors=[main.js, refreshAll(), ops-web.test.js]
- "ops_web_main_refreshsafe": "refreshSafe()" | kind=code-symbol | source=apps/ops-web/main.js:L1077 | neighbors=[main.js, openTabAssignment(), refreshAll()]
- "ops_web_main_rendercatalog": "renderCatalog()" | kind=code-symbol | source=apps/ops-web/main.js:L324 | neighbors=[main.js, refreshAll(), resolveActiveCatalogCategory()]
- "ops_web_main_rendertabs": "renderTabs()" | kind=code-symbol | source=apps/ops-web/main.js:L464 | neighbors=[main.js, refreshAll(), renderActiveTab()]
- "ops_web_main_resolveactivecatalogcategory": "resolveActiveCatalogCategory()" | kind=code-symbol | source=apps/ops-web/main.js:L142 | neighbors=[main.js, renderCatalog(), ops-web.test.js]
- "ops_web_main_samecatalogadminsession": "sameCatalogAdminSession()" | kind=code-symbol | source=apps/ops-web/main.js:L932 | neighbors=[main.js, catalogAdminSessionIsCurrent(), ops-web.test.js]
- "ops_web_main_validdiscountpercent": "validDiscountPercent()" | kind=code-symbol | source=apps/ops-web/main.js:L180 | neighbors=[main.js, addOrAccumulateItem(), calculateOrderPreviewTotal()]
- "providers_ifood_clearifoodtoken": "clearIFoodToken()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L34 | neighbors=[ifood.js, tokenKey(), fetchIFoodCancellationReasons()]
- "providers_ifood_getifoodtoken": "getIFoodToken()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L16 | neighbors=[ifood.js, fetchIFoodCancellationReasons(), tokenKey()]
- "providers_ifood_mapifoodorderitem": "mapIFoodOrderItem()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L124 | neighbors=[ifood.js, ifoodItemNotes(), integrations.test.js]
- "providers_ifood_tokenkey": "tokenKey()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L12 | neighbors=[ifood.js, clearIFoodToken(), getIFoodToken()]
- "scripts_seed_demo_protected_tables": "PROTECTED_TABLES" | kind=code-symbol | source=scripts/seed-demo.mjs:L4 | neighbors=[seed-demo.mjs, seed-demo-postgres.test.js, seed-demo-safety.test.js]
- "scripts_seed_demo_sanitizetarget": "sanitizeTarget()" | kind=code-symbol | source=scripts/seed-demo.mjs:L64 | neighbors=[seed-demo.mjs, resolveTarget(), DemoSeedRefusal]
- "shared_types_index_tomoney": "toMoney()" | kind=code-symbol | source=packages/shared-types/index.js:L55 | neighbors=[index.js, index.js, index.js]
- "src_catalog_repository_archivecatalogitem": "archiveCatalogItem()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L94 | neighbors=[catalog-repository.js, mapCatalogItem(), server.js]
- "src_catalog_repository_getcatalogitem": "getCatalogItem()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L42 | neighbors=[catalog-repository.js, mapCatalogItem(), server.js]
- "src_catalog_repository_insertcatalogitem": "insertCatalogItem()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L50 | neighbors=[catalog-repository.js, mapCatalogItem(), server.js]
- "src_catalog_repository_lockcatalogitems": "lockCatalogItems()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L30 | neighbors=[order-ingestion.js, catalog-repository.js, server.js]
- "src_catalog_repository_updatecatalogitem": "updateCatalogItem()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L72 | neighbors=[catalog-repository.js, mapCatalogItem(), server.js]
- "src_config_assertsafeautoseed": "assertSafeAutoSeed()" | kind=code-symbol | source=apps/api/src/config.js:L31 | neighbors=[config.js, server.js, seed-demo-safety.test.js]
- "src_db_createdb": "createDb()" | kind=code-symbol | source=apps/api/src/db.js:L438 | neighbors=[db.js, server.js, seed-demo-postgres.test.js]
- "src_db_maporder": "mapOrder()" | kind=code-symbol | source=apps/api/src/db.js:L723 | neighbors=[integration-repository.js, db.js, server.js]
- "src_order_tab_assignment_sametabassignment": "sameTabAssignment()" | kind=code-symbol | source=apps/api/src/order-tab-assignment.js:L51 | neighbors=[order-tab-assignment.js, server.js, order-tab-assignment.test.js]
- "src_order_tab_assignment_tabassignmenteligibility": "tabAssignmentEligibility()" | kind=code-symbol | source=apps/api/src/order-tab-assignment.js:L35 | neighbors=[order-tab-assignment.js, server.js, order-tab-assignment.test.js]
- "src_server_bridgeheaders": "bridgeHeaders()" | kind=code-symbol | source=apps/api/src/server.js:L801 | neighbors=[server.js, dispatchPrintJob(), reconcilePrintJob()]
- "src_server_claimprintjob": "claimPrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L772 | neighbors=[server.js, mapPrintJob(), dispatchPrintJob()]
- "src_server_failprintjob": "failPrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L870 | neighbors=[server.js, dispatchPrintJob(), mapPrintJob()]
- "src_server_finalizeprintedjob": "finalizePrintedJob()" | kind=code-symbol | source=apps/api/src/server.js:L820 | neighbors=[server.js, dispatchPrintJob(), mapPrintJob()]
- "src_server_readbridgejson": "readBridgeJson()" | kind=code-symbol | source=apps/api/src/server.js:L808 | neighbors=[server.js, dispatchPrintJob(), reconcilePrintJob()]
- "src_server_recoverprintjobs": "recoverPrintJobs()" | kind=code-symbol | source=apps/api/src/server.js:L932 | neighbors=[server.js, dispatchPrintJob(), mapPrintJob()]
- "src_validation_equalsecret": "equalSecret()" | kind=code-symbol | source=apps/print-bridge/src/validation.js:L3 | neighbors=[server.js, validation.js, print-bridge.test.js]
- "src_validation_safeid": "safeId()" | kind=code-symbol | source=apps/print-bridge/src/validation.js:L9 | neighbors=[server.js, validation.js, print-bridge.test.js]
- "src_validation_validprintcontent": "validPrintContent()" | kind=code-symbol | source=apps/print-bridge/src/validation.js:L19 | neighbors=[server.js, validation.js, print-bridge.test.js]
- "tests_seed_demo_postgres_test_adminsession": "adminSession()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L257 | neighbors=[seed-demo-postgres.test.js, loginSession(), postSeed()]
- "tests_seed_demo_postgres_test_stopserver": "stopServer()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L188 | neighbors=[seed-demo-postgres.test.js, startPrintBridge(), stopPrintBridge()]
- "tests_seed_demo_postgres_test_validateephemeralprocess": "validateEphemeralProcess()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L61 | neighbors=[seed-demo-postgres.test.js, assertSafeTestUrl(), assertServerIdentity()]
- "domain_catalog_add_ons": "ADD_ONS" | kind=code-symbol | source=packages/domain/catalog.js:L4 | neighbors=[catalog.js, index.js]
- "domain_catalog_catalog": "CATALOG" | kind=code-symbol | source=packages/domain/catalog.js:L81 | neighbors=[catalog.js, index.js]
- "domain_index_calculatestockrequirements": "calculateStockRequirements()" | kind=code-symbol | source=packages/domain/index.js:L13 | neighbors=[index.js, domain.test.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-005.json

Keep each description factual and concise (one sentence). No markdown, no prose
outside the JSON object. It is acceptable to omit a node if context is
insufficient — but include every node you can ground confidently.

Example answer format:
```json
{
  "node_id_1": "Resolves the configured ontology profile from graphify.yaml.",
  "node_id_2": "Colonel James Barclay, an antagonist in The Crooked Man."
}
```
