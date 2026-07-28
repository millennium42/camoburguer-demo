# Node Description Batch 10 of 14

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

- "src_server_getordertabassignmentbykey": "getOrderTabAssignmentByKey()" | kind=code-symbol | source=apps/api/src/server.js:L382 | neighbors=[server.js, mapOrderTabAssignment()]
- "src_server_getprimaryprintjob": "getPrimaryPrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L738 | neighbors=[server.js, mapPrintJob()]
- "src_server_mapordertabassignment": "mapOrderTabAssignment()" | kind=code-symbol | source=apps/api/src/server.js:L370 | neighbors=[server.js, getOrderTabAssignmentByKey()]
- "src_server_openeventstream": "openEventStream()" | kind=code-symbol | source=apps/api/src/server.js:L2116 | neighbors=[server.js, readCookie()]
- "src_server_readcookie": "readCookie()" | kind=code-symbol | source=apps/api/src/server.js:L129 | neighbors=[server.js, openEventStream()]
- "src_server_requiredemoadmin": "requireDemoAdmin()" | kind=code-symbol | source=apps/api/src/server.js:L108 | neighbors=[server.js, equalSecret()]
- "src_server_reserveprintjob": "reservePrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L711 | neighbors=[server.js, mapPrintJob()]
- "src_server_reservereprintjob": "reserveReprintJob()" | kind=code-symbol | source=apps/api/src/server.js:L746 | neighbors=[server.js, mapPrintJob()]
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
- "domain_catalog_directhandoffcategories": "directHandoffCategories" | kind=code-symbol | source=packages/domain/catalog.js:L79 | neighbors=[catalog.js]
- "domain_catalog_products": "products" | kind=code-symbol | source=packages/domain/catalog.js:L24 | neighbors=[catalog.js]
- "domain_index_allowed_standalone_order_fields": "ALLOWED_STANDALONE_ORDER_FIELDS" | kind=code-symbol | source=packages/domain/index.js:L302 | neighbors=[index.js]
- "domain_index_allowed_transitions": "ALLOWED_TRANSITIONS" | kind=code-symbol | source=packages/domain/index.js:L26 | neighbors=[index.js]
- "domain_index_normalizestandaloneorderdto": "normalizeStandaloneOrderDto()" | kind=code-symbol | source=packages/domain/index.js:L320 | neighbors=[index.js]
- "domain_index_reserved_standalone_order_fields": "RESERVED_STANDALONE_ORDER_FIELDS" | kind=code-symbol | source=packages/domain/index.js:L295 | neighbors=[index.js]
- "integrations_command_outbox_backoffms": "backoffMs()" | kind=code-symbol | source=apps/api/src/integrations/command-outbox.js:L15 | neighbors=[command-outbox.js]
- "integrations_command_outbox_sanitizederror": "sanitizedError()" | kind=code-symbol | source=apps/api/src/integrations/command-outbox.js:L9 | neighbors=[command-outbox.js]
- "integrations_integration_repository_command_columns": "COMMAND_COLUMNS" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L17 | neighbors=[integration-repository.js]
- "integrations_integration_repository_event_columns": "EVENT_COLUMNS" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L10 | neighbors=[integration-repository.js]
- "integrations_integration_repository_findchannelevent": "findChannelEvent()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L96 | neighbors=[integration-repository.js]
- "integrations_integration_repository_mapping_columns": "MAPPING_COLUMNS" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L3 | neighbors=[integration-repository.js]
- "integrations_integration_routes_integrationroutes": "integrationRoutes()" | kind=code-symbol | source=apps/api/src/integrations/integration-routes.js:L5 | neighbors=[integration-routes.js]
- "integrations_order_actions_action_rules": "ACTION_RULES" | kind=code-symbol | source=apps/api/src/integrations/order-actions.js:L17 | neighbors=[order-actions.js]
- "integrations_order_actions_channel_actions": "CHANNEL_ACTIONS" | kind=code-symbol | source=apps/api/src/integrations/order-actions.js:L24 | neighbors=[order-actions.js]
- "ops_web_main_catalogadminsession": "catalogAdminSession()" | kind=code-symbol | source=apps/ops-web/main.js:L928 | neighbors=[main.js]
- "ops_web_main_cleartabassignment": "clearTabAssignment()" | kind=code-symbol | source=apps/ops-web/main.js:L611 | neighbors=[main.js]
- "ops_web_main_editcatalogitem": "editCatalogItem()" | kind=code-symbol | source=apps/ops-web/main.js:L1007 | neighbors=[main.js]
- "ops_web_main_financetypelabels": "financeTypeLabels" | kind=code-symbol | source=apps/ops-web/main.js:L82 | neighbors=[main.js]
- "ops_web_main_fulfillmentlabels": "fulfillmentLabels" | kind=code-symbol | source=apps/ops-web/main.js:L58 | neighbors=[main.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-009.json

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
