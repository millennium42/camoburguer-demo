# Node Description Batch 10 of 12

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

- "providers_ifood_ifooddeliveryaddress": "ifoodDeliveryAddress()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L89 | neighbors=[ifood.js]
- "providers_ifood_ifoodfulfillmentmode": "ifoodFulfillmentMode()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L83 | neighbors=[ifood.js]
- "providers_ifood_ifoodpaymentmethod": "ifoodPaymentMethod()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L101 | neighbors=[ifood.js]
- "providers_ifood_tokencaches": "tokenCaches" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L10 | neighbors=[ifood.js]
- "scripts_check_syntax_collect": "collect()" | kind=code-symbol | source=scripts/check-syntax.mjs:L8 | neighbors=[check-syntax.mjs]
- "scripts_check_syntax_files": "files" | kind=code-symbol | source=scripts/check-syntax.mjs:L6 | neighbors=[check-syntax.mjs]
- "scripts_check_syntax_roots": "roots" | kind=code-symbol | source=scripts/check-syntax.mjs:L5 | neighbors=[check-syntax.mjs]
- "scripts_seed_demo_canonical_catalog": "CANONICAL_CATALOG" | kind=code-symbol | source=scripts/seed-demo.mjs:L53 | neighbors=[seed-demo.mjs]
- "scripts_seed_demo_demoseedrefusal_constructor": ".constructor()" | kind=code-symbol | source=scripts/seed-demo.mjs:L26 | neighbors=[DemoSeedRefusal]
- "scripts_seed_demo_lockprotectedtables": "lockProtectedTables()" | kind=code-symbol | source=scripts/seed-demo.mjs:L96 | neighbors=[seed-demo.mjs]
- "scripts_seed_demo_normalizedcatalogitem": "normalizedCatalogItem()" | kind=code-symbol | source=scripts/seed-demo.mjs:L35 | neighbors=[seed-demo.mjs]
- "scripts_seed_demo_operational_tables": "OPERATIONAL_TABLES" | kind=code-symbol | source=scripts/seed-demo.mjs:L21 | neighbors=[seed-demo.mjs]
- "scripts_seed_demo_seeddemocontent": "seedDemoContent()" | kind=code-symbol | source=scripts/seed-demo.mjs:L129 | neighbors=[seed-demo.mjs]
- "scripts_simulate_order_db": "db" | kind=code-symbol | source=scripts/simulate-order.mjs:L5 | neighbors=[simulate-order.mjs]
- "scripts_simulate_order_simulate": "simulate()" | kind=code-symbol | source=scripts/simulate-order.mjs:L7 | neighbors=[simulate-order.mjs]
- "shared_types_index_command_statuses": "COMMAND_STATUSES" | kind=code-symbol | source=packages/shared-types/index.js:L38 | neighbors=[index.js]
- "shared_types_index_finance_entry_types": "FINANCE_ENTRY_TYPES" | kind=code-symbol | source=packages/shared-types/index.js:L19 | neighbors=[index.js]
- "shared_types_index_integration_channels": "INTEGRATION_CHANNELS" | kind=code-symbol | source=packages/shared-types/index.js:L46 | neighbors=[index.js]
- "shared_types_index_shift_statuses": "SHIFT_STATUSES" | kind=code-symbol | source=packages/shared-types/index.js:L27 | neighbors=[index.js]
- "shared_types_index_sync_statuses": "SYNC_STATUSES" | kind=code-symbol | source=packages/shared-types/index.js:L29 | neighbors=[index.js]
- "src_config_appenvironment": "appEnvironment" | kind=code-symbol | source=apps/api/src/config.js:L40 | neighbors=[config.js]
- "src_config_csv": "csv()" | kind=code-symbol | source=apps/api/src/config.js:L3 | neighbors=[config.js]
- "src_config_httpurl": "httpUrl()" | kind=code-symbol | source=apps/api/src/config.js:L11 | neighbors=[config.js]
- "src_config_positivenumber": "positiveNumber()" | kind=code-symbol | source=apps/api/src/config.js:L16 | neighbors=[config.js]
- "src_order_tab_assignment_eligible_statuses": "ELIGIBLE_STATUSES" | kind=code-symbol | source=apps/api/src/order-tab-assignment.js:L1 | neighbors=[order-tab-assignment.js]
- "src_seed_patch": "patch()" | kind=code-symbol | source=apps/event-simulator/src/seed.js:L23 | neighbors=[seed.js]
- "src_seed_post": "post()" | kind=code-symbol | source=apps/event-simulator/src/seed.js:L14 | neighbors=[seed.js]
- "src_seed_waitforapi": "waitForApi()" | kind=code-symbol | source=apps/event-simulator/src/seed.js:L3 | neighbors=[seed.js]
- "src_server_aborttransaction": "abortTransaction()" | kind=code-symbol | source=apps/api/src/server.js:L122 | neighbors=[server.js]
- "src_server_app": "app" | kind=code-symbol | source=apps/print-bridge/src/server.js:L8 | neighbors=[server.js]
- "src_server_authorize": "authorize()" | kind=code-symbol | source=apps/print-bridge/src/server.js:L27 | neighbors=[server.js]
- "src_server_bridgetoken": "bridgeToken" | kind=code-symbol | source=apps/print-bridge/src/server.js:L11 | neighbors=[server.js]
- "src_server_changestock": "changeStock()" | kind=code-symbol | source=apps/api/src/server.js:L494 | neighbors=[server.js]
- "src_server_clearsessioncookies": "clearSessionCookies()" | kind=code-symbol | source=apps/api/src/server.js:L142 | neighbors=[server.js]
- "src_server_db": "db" | kind=code-symbol | source=apps/api/src/server.js:L80 | neighbors=[server.js]
- "src_server_emitfinanceevent": "emitFinanceEvent()" | kind=code-symbol | source=apps/api/src/server.js:L956 | neighbors=[server.js]
- "src_server_emitorderevent": "emitOrderEvent()" | kind=code-symbol | source=apps/api/src/server.js:L952 | neighbors=[server.js]
- "src_server_getopenshift": "getOpenShift()" | kind=code-symbol | source=apps/api/src/server.js:L945 | neighbors=[server.js]
- "src_server_getorder": "getOrder()" | kind=code-symbol | source=apps/api/src/server.js:L325 | neighbors=[server.js]
- "src_server_getorderbyidempotencykey": "getOrderByIdempotencyKey()" | kind=code-symbol | source=apps/api/src/server.js:L336 | neighbors=[server.js]

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
