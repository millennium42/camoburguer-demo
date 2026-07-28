# Node Description Batch 8 of 12

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

- "scripts_seed_demo_samecatalog": "sameCatalog()" | kind=code-symbol | source=scripts/seed-demo.mjs:L57 | neighbors=[seed-demo.mjs, runPreflight()]
- "scripts_seed_demo_seeddemo": "seedDemo()" | kind=code-symbol | source=scripts/seed-demo.mjs:L4 | neighbors=[seed-demo.mjs, runSeedDemo()]
- "shared_types_index_assertenum": "assertEnum()" | kind=code-symbol | source=packages/shared-types/index.js:L48 | neighbors=[index.js, index.js]
- "shared_types_index_fulfillment_modes": "FULFILLMENT_MODES" | kind=code-symbol | source=packages/shared-types/index.js:L2 | neighbors=[index.js, index.js]
- "shared_types_index_order_sources": "ORDER_SOURCES" | kind=code-symbol | source=packages/shared-types/index.js:L1 | neighbors=[index.js, index.js]
- "shared_types_index_order_statuses": "ORDER_STATUSES" | kind=code-symbol | source=packages/shared-types/index.js:L3 | neighbors=[index.js, index.js]
- "shared_types_index_payment_methods": "PAYMENT_METHODS" | kind=code-symbol | source=packages/shared-types/index.js:L11 | neighbors=[index.js, index.js]
- "src_catalog_repository_listcatalogitems": "listCatalogItems()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L22 | neighbors=[catalog-repository.js, server.js]
- "src_config_config": "config" | kind=code-symbol | source=apps/api/src/config.js:L46 | neighbors=[config.js, server.js]
- "src_config_validatetimezone": "validateTimeZone()" | kind=code-symbol | source=apps/api/src/config.js:L21 | neighbors=[config.js, finance.test.js]
- "src_db_mapchannelcommand": "mapChannelCommand()" | kind=code-symbol | source=apps/api/src/db.js:L842 | neighbors=[integration-repository.js, db.js]
- "src_db_mapchannelevent": "mapChannelEvent()" | kind=code-symbol | source=apps/api/src/db.js:L825 | neighbors=[integration-repository.js, db.js]
- "src_db_mapchannelmapping": "mapChannelMapping()" | kind=code-symbol | source=apps/api/src/db.js:L809 | neighbors=[integration-repository.js, db.js]
- "src_db_mapfinanceentry": "mapFinanceEntry()" | kind=code-symbol | source=apps/api/src/db.js:L778 | neighbors=[db.js, server.js]
- "src_db_mapshift": "mapShift()" | kind=code-symbol | source=apps/api/src/db.js:L795 | neighbors=[db.js, server.js]
- "src_db_maptab": "mapTab()" | kind=code-symbol | source=apps/api/src/db.js:L749 | neighbors=[db.js, server.js]
- "src_db_maptabpayment": "mapTabPayment()" | kind=code-symbol | source=apps/api/src/db.js:L762 | neighbors=[db.js, server.js]
- "src_order_tab_assignment_clean": "clean()" | kind=code-symbol | source=apps/api/src/order-tab-assignment.js:L3 | neighbors=[order-tab-assignment.js, normalizeTabAssignmentPayload()]
- "src_server_equalsecret": "equalSecret()" | kind=code-symbol | source=apps/api/src/server.js:L76 | neighbors=[server.js, requireDemoAdmin()]
- "src_server_getordertabassignmentbykey": "getOrderTabAssignmentByKey()" | kind=code-symbol | source=apps/api/src/server.js:L381 | neighbors=[server.js, mapOrderTabAssignment()]
- "src_server_getprimaryprintjob": "getPrimaryPrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L737 | neighbors=[server.js, mapPrintJob()]
- "src_server_mapordertabassignment": "mapOrderTabAssignment()" | kind=code-symbol | source=apps/api/src/server.js:L369 | neighbors=[server.js, getOrderTabAssignmentByKey()]
- "src_server_openeventstream": "openEventStream()" | kind=code-symbol | source=apps/api/src/server.js:L2106 | neighbors=[server.js, readCookie()]
- "src_server_readcookie": "readCookie()" | kind=code-symbol | source=apps/api/src/server.js:L128 | neighbors=[server.js, openEventStream()]
- "src_server_requiredemoadmin": "requireDemoAdmin()" | kind=code-symbol | source=apps/api/src/server.js:L107 | neighbors=[server.js, equalSecret()]
- "src_server_reserveprintjob": "reservePrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L710 | neighbors=[server.js, mapPrintJob()]
- "src_server_reservereprintjob": "reserveReprintJob()" | kind=code-symbol | source=apps/api/src/server.js:L745 | neighbors=[server.js, mapPrintJob()]
- "src_sse_createssehub": "createSseHub()" | kind=code-symbol | source=apps/api/src/sse.js:L1 | neighbors=[server.js, sse.js]
- "tests_seed_demo_postgres_test_assertsafetesturl": "assertSafeTestUrl()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L25 | neighbors=[seed-demo-postgres.test.js, validateEphemeralProcess()]
- "tests_seed_demo_postgres_test_assertserveridentity": "assertServerIdentity()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L41 | neighbors=[seed-demo-postgres.test.js, validateEphemeralProcess()]
- "tests_seed_demo_postgres_test_loginsession": "loginSession()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L245 | neighbors=[seed-demo-postgres.test.js, adminSession()]
- "tests_seed_demo_postgres_test_postseed": "postSeed()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L303 | neighbors=[seed-demo-postgres.test.js, adminSession()]
- "tests_seed_demo_postgres_test_serverenv": "serverEnv()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L132 | neighbors=[seed-demo-postgres.test.js, startServer()]
- "tests_seed_demo_postgres_test_startprintbridge": "startPrintBridge()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L206 | neighbors=[seed-demo-postgres.test.js, stopServer()]
- "tests_seed_demo_postgres_test_startserver": "startServer()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L152 | neighbors=[seed-demo-postgres.test.js, serverEnv()]
- "tests_seed_demo_postgres_test_stopprintbridge": "stopPrintBridge()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L240 | neighbors=[seed-demo-postgres.test.js, stopServer()]
- "tests_smoke_createorder": "createOrder()" | kind=code-symbol | source=tests/smoke.mjs:L845 | neighbors=[smoke.mjs, api()]
- "tests_smoke_expectblockedassignment": "expectBlockedAssignment()" | kind=code-symbol | source=tests/smoke.mjs:L323 | neighbors=[smoke.mjs, api()]
- "tests_smoke_request": "request()" | kind=code-symbol | source=tests/smoke.mjs:L18 | neighbors=[smoke.mjs, api()]
- "domain_catalog_addoncategories": "addonCategories" | kind=code-symbol | source=packages/domain/catalog.js:L78 | neighbors=[catalog.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-007.json

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
