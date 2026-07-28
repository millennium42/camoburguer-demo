# Node Description Batch 7 of 14

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

- "ops_web_main_validdiscountpercent": "validDiscountPercent()" | kind=code-symbol | source=apps/ops-web/main.js:L180 | neighbors=[main.js, addOrAccumulateItem(), calculateOrderPreviewTotal()]
- "providers_ifood_clearifoodtoken": "clearIFoodToken()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L34 | neighbors=[ifood.js, tokenKey(), fetchIFoodCancellationReasons()]
- "providers_ifood_getifoodtoken": "getIFoodToken()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L16 | neighbors=[ifood.js, fetchIFoodCancellationReasons(), tokenKey()]
- "providers_ifood_mapifoodorderitem": "mapIFoodOrderItem()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L124 | neighbors=[ifood.js, ifoodItemNotes(), integrations.test.js]
- "providers_ifood_tokenkey": "tokenKey()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L12 | neighbors=[ifood.js, clearIFoodToken(), getIFoodToken()]
- "scripts_demo_simulator_client_assertsafesimulationbaseurl": "assertSafeSimulationBaseUrl()" | kind=code-symbol | source=scripts/demo-simulator-client.mjs:L9 | neighbors=[demo-simulator-client.mjs, createSimulationClient(), simulator.test.js]
- "scripts_demo_simulator_client_createsimulationclient": "createSimulationClient()" | kind=code-symbol | source=scripts/demo-simulator-client.mjs:L31 | neighbors=[demo-simulator-client.mjs, assertSafeSimulationBaseUrl(), runSimulation()]
- "scripts_demo_simulator_client_printsimulationsummary": "printSimulationSummary()" | kind=code-symbol | source=scripts/demo-simulator-client.mjs:L228 | neighbors=[demo-simulator-client.mjs, simulate-order.mjs, seed.js]
- "scripts_seed_demo_protected_tables": "PROTECTED_TABLES" | kind=code-symbol | source=scripts/seed-demo.mjs:L4 | neighbors=[seed-demo.mjs, seed-demo-postgres.test.js, seed-demo-safety.test.js]
- "scripts_seed_demo_sanitizetarget": "sanitizeTarget()" | kind=code-symbol | source=scripts/seed-demo.mjs:L64 | neighbors=[seed-demo.mjs, resolveTarget(), DemoSeedRefusal]
- "shared_types_index_tomoney": "toMoney()" | kind=code-symbol | source=packages/shared-types/index.js:L55 | neighbors=[index.js, index.js, index.js]
- "src_auth_haspermission": "hasPermission()" | kind=code-symbol | source=apps/api/src/auth.js:L62 | neighbors=[auth.js, server.js, auth.test.js]
- "src_auth_permissionforrequest": "permissionForRequest()" | kind=code-symbol | source=apps/api/src/auth.js:L43 | neighbors=[auth.js, server.js, auth.test.js]
- "src_auth_safeequal": "safeEqual()" | kind=code-symbol | source=apps/api/src/auth.js:L24 | neighbors=[auth.js, validateCsrf(), verifyPassword()]
- "src_auth_scrypt": "scrypt" | kind=code-symbol | source=apps/api/src/auth.js:L4 | neighbors=[auth.js, hashPassword(), verifyPassword()]
- "src_catalog_repository_archivecatalogitem": "archiveCatalogItem()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L94 | neighbors=[catalog-repository.js, mapCatalogItem(), server.js]
- "src_catalog_repository_getcatalogitem": "getCatalogItem()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L42 | neighbors=[catalog-repository.js, mapCatalogItem(), server.js]
- "src_catalog_repository_insertcatalogitem": "insertCatalogItem()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L50 | neighbors=[catalog-repository.js, mapCatalogItem(), server.js]
- "src_catalog_repository_lockcatalogitems": "lockCatalogItems()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L30 | neighbors=[order-ingestion.js, catalog-repository.js, server.js]
- "src_catalog_repository_updatecatalogitem": "updateCatalogItem()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L72 | neighbors=[catalog-repository.js, mapCatalogItem(), server.js]
- "src_config_assertsafeautoseed": "assertSafeAutoSeed()" | kind=code-symbol | source=apps/api/src/config.js:L31 | neighbors=[config.js, server.js, seed-demo-safety.test.js]
- "src_db_createdb": "createDb()" | kind=code-symbol | source=apps/api/src/db.js:L438 | neighbors=[db.js, server.js, seed-demo-postgres.test.js]
- "src_db_maporder": "mapOrder()" | kind=code-symbol | source=apps/api/src/db.js:L723 | neighbors=[integration-repository.js, db.js, server.js]
- "src_idempotency_cancellationfingerprintpayload": "cancellationFingerprintPayload()" | kind=code-symbol | source=apps/api/src/idempotency.js:L112 | neighbors=[idempotency.js, server.js, idempotency.test.js]
- "src_idempotency_canonicalitem": "canonicalItem()" | kind=code-symbol | source=apps/api/src/idempotency.js:L71 | neighbors=[idempotency.js, basisPoints(), moneyCents()]
- "src_idempotency_claimidempotency": "claimIdempotency()" | kind=code-symbol | source=apps/api/src/idempotency.js:L133 | neighbors=[order-actions.js, idempotency.js, server.js]
- "src_idempotency_completeidempotency": "completeIdempotency()" | kind=code-symbol | source=apps/api/src/idempotency.js:L184 | neighbors=[order-actions.js, idempotency.js, server.js]
- "src_idempotency_decimalunits": "decimalUnits()" | kind=code-symbol | source=apps/api/src/idempotency.js:L5 | neighbors=[idempotency.js, basisPoints(), moneyCents()]
- "src_order_tab_assignment_sametabassignment": "sameTabAssignment()" | kind=code-symbol | source=apps/api/src/order-tab-assignment.js:L51 | neighbors=[order-tab-assignment.js, server.js, order-tab-assignment.test.js]
- "src_order_tab_assignment_tabassignmenteligibility": "tabAssignmentEligibility()" | kind=code-symbol | source=apps/api/src/order-tab-assignment.js:L35 | neighbors=[order-tab-assignment.js, server.js, order-tab-assignment.test.js]
- "src_print_queue_assertbridgestatus": "assertBridgeStatus()" | kind=code-symbol | source=apps/api/src/print-queue.js:L46 | neighbors=[print-queue.js, server.js, print-queue.test.js]
- "src_print_queue_classifyprintfailure": "classifyPrintFailure()" | kind=code-symbol | source=apps/api/src/print-queue.js:L32 | neighbors=[print-queue.js, server.js, print-queue.test.js]
- "src_print_queue_printbackoffms": "printBackoffMs()" | kind=code-symbol | source=apps/api/src/print-queue.js:L40 | neighbors=[print-queue.js, server.js, print-queue.test.js]
- "src_print_queue_printpayload": "printPayload()" | kind=code-symbol | source=apps/api/src/print-queue.js:L5 | neighbors=[print-queue.js, printPayloadBytes(), server.js]
- "src_server_bridgeheaders": "bridgeHeaders()" | kind=code-symbol | source=apps/api/src/server.js:L802 | neighbors=[server.js, dispatchPrintJob(), reconcilePrintJob()]
- "src_server_claimprintjob": "claimPrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L773 | neighbors=[server.js, mapPrintJob(), dispatchPrintJob()]
- "src_server_failprintjob": "failPrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L871 | neighbors=[server.js, dispatchPrintJob(), mapPrintJob()]
- "src_server_finalizeprintedjob": "finalizePrintedJob()" | kind=code-symbol | source=apps/api/src/server.js:L821 | neighbors=[server.js, dispatchPrintJob(), mapPrintJob()]
- "src_server_readbridgejson": "readBridgeJson()" | kind=code-symbol | source=apps/api/src/server.js:L809 | neighbors=[server.js, dispatchPrintJob(), reconcilePrintJob()]
- "src_server_recoverprintjobs": "recoverPrintJobs()" | kind=code-symbol | source=apps/api/src/server.js:L933 | neighbors=[server.js, dispatchPrintJob(), mapPrintJob()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-006.json

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
