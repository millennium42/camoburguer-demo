# Node Description Batch 11 of 12

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

- "src_server_getshift": "getShift()" | kind=code-symbol | source=apps/api/src/server.js:L630 | neighbors=[server.js]
- "src_server_gettab": "getTab()" | kind=code-symbol | source=apps/api/src/server.js:L402 | neighbors=[server.js]
- "src_server_gettabpayment": "getTabPayment()" | kind=code-symbol | source=apps/api/src/server.js:L448 | neighbors=[server.js]
- "src_server_gettabpaymentbyidempotencykey": "getTabPaymentByIdempotencyKey()" | kind=code-symbol | source=apps/api/src/server.js:L456 | neighbors=[server.js]
- "src_server_insertentries": "insertEntries()" | kind=code-symbol | source=apps/api/src/server.js:L594 | neighbors=[server.js]
- "src_server_insertorder": "insertOrder()" | kind=code-symbol | source=apps/api/src/server.js:L291 | neighbors=[server.js]
- "src_server_insertshift": "insertShift()" | kind=code-symbol | source=apps/api/src/server.js:L638 | neighbors=[server.js]
- "src_server_inserttabpayment": "insertTabPayment()" | kind=code-symbol | source=apps/api/src/server.js:L464 | neighbors=[server.js]
- "src_server_inventoryview": "inventoryView()" | kind=code-symbol | source=apps/api/src/server.js:L531 | neighbors=[server.js]
- "src_server_ismutation": "isMutation()" | kind=code-symbol | source=apps/api/src/server.js:L159 | neighbors=[server.js]
- "src_server_ispublicrequest": "isPublicRequest()" | kind=code-symbol | source=apps/api/src/server.js:L150 | neighbors=[server.js]
- "src_server_listentries": "listEntries()" | kind=code-symbol | source=apps/api/src/server.js:L589 | neighbors=[server.js]
- "src_server_listorders": "listOrders()" | kind=code-symbol | source=apps/api/src/server.js:L346 | neighbors=[server.js]
- "src_server_listshifts": "listShifts()" | kind=code-symbol | source=apps/api/src/server.js:L625 | neighbors=[server.js]
- "src_server_listtabs": "listTabs()" | kind=code-symbol | source=apps/api/src/server.js:L439 | neighbors=[server.js]
- "src_server_normalizecatalogitem": "normalizeCatalogItem()" | kind=code-symbol | source=apps/api/src/server.js:L243 | neighbors=[server.js]
- "src_server_ops_web_dir": "OPS_WEB_DIR" | kind=code-symbol | source=apps/api/src/server.js:L85 | neighbors=[server.js]
- "src_server_orderassignmentflags": "orderAssignmentFlags()" | kind=code-symbol | source=apps/api/src/server.js:L389 | neighbors=[server.js]
- "src_server_origin": "origin()" | kind=code-symbol | source=apps/api/src/server.js:L100 | neighbors=[server.js]
- "src_server_port": "port" | kind=code-symbol | source=apps/print-bridge/src/server.js:L9 | neighbors=[server.js]
- "src_server_preparation_modes": "PREPARATION_MODES" | kind=code-symbol | source=apps/api/src/server.js:L84 | neighbors=[server.js]
- "src_server_public_ui_paths": "PUBLIC_UI_PATHS" | kind=code-symbol | source=apps/api/src/server.js:L86 | neighbors=[server.js]
- "src_server_sametabpayment": "sameTabPayment()" | kind=code-symbol | source=apps/api/src/server.js:L486 | neighbors=[server.js]
- "src_server_sendidempotencyconflict": "sendIdempotencyConflict()" | kind=code-symbol | source=apps/api/src/server.js:L113 | neighbors=[server.js]
- "src_server_setsessioncookies": "setSessionCookies()" | kind=code-symbol | source=apps/api/src/server.js:L134 | neighbors=[server.js]
- "src_server_sse": "sse" | kind=code-symbol | source=apps/api/src/server.js:L81 | neighbors=[server.js]
- "src_server_stock_categories": "STOCK_CATEGORIES" | kind=code-symbol | source=apps/api/src/server.js:L83 | neighbors=[server.js]
- "src_server_tab_payment_methods": "TAB_PAYMENT_METHODS" | kind=code-symbol | source=apps/api/src/server.js:L82 | neighbors=[server.js]
- "src_server_tabview": "tabView()" | kind=code-symbol | source=apps/api/src/server.js:L410 | neighbors=[server.js]
- "src_server_updateorder": "updateOrder()" | kind=code-symbol | source=apps/api/src/server.js:L550 | neighbors=[server.js]
- "src_server_updateshift": "updateShift()" | kind=code-symbol | source=apps/api/src/server.js:L661 | neighbors=[server.js]
- "tests_integrations_test_mappingrow": "mappingRow()" | kind=code-symbol | source=tests/integrations.test.js:L21 | neighbors=[integrations.test.js]
- "tests_integrations_test_orderrow": "orderRow()" | kind=code-symbol | source=tests/integrations.test.js:L38 | neighbors=[integrations.test.js]
- "tests_order_tab_assignment_test_eligibleorder": "eligibleOrder" | kind=code-symbol | source=tests/order-tab-assignment.test.js:L9 | neighbors=[order-tab-assignment.test.js]
- "tests_seed_demo_postgres_test_countoperationalrows": "countOperationalRows()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L123 | neighbors=[seed-demo-postgres.test.js]
- "tests_seed_demo_postgres_test_insertcommand": "insertCommand()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L1140 | neighbors=[seed-demo-postgres.test.js]
- "tests_seed_demo_postgres_test_insertorder": "insertOrder()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L342 | neighbors=[seed-demo-postgres.test.js]
- "tests_seed_demo_postgres_test_insertreadyorder": "insertReadyOrder()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L1337 | neighbors=[seed-demo-postgres.test.js]
- "tests_seed_demo_postgres_test_insertshift": "insertShift()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L350 | neighbors=[seed-demo-postgres.test.js]
- "tests_seed_demo_postgres_test_inserttab": "insertTab()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L334 | neighbors=[seed-demo-postgres.test.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-010.json

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
