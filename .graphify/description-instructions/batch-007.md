# Node Description Batch 8 of 14

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

- "src_sse_createssehub": "createSseHub()" | kind=code-symbol | source=apps/api/src/sse.js:L1 | neighbors=[server.js, sse.js, sse-auth.test.js]
- "src_validation_equalsecret": "equalSecret()" | kind=code-symbol | source=apps/print-bridge/src/validation.js:L3 | neighbors=[server.js, validation.js, print-bridge.test.js]
- "src_validation_safeid": "safeId()" | kind=code-symbol | source=apps/print-bridge/src/validation.js:L9 | neighbors=[server.js, validation.js, print-bridge.test.js]
- "src_validation_validprintcontent": "validPrintContent()" | kind=code-symbol | source=apps/print-bridge/src/validation.js:L19 | neighbors=[server.js, validation.js, print-bridge.test.js]
- "tests_seed_demo_postgres_test_adminsession": "adminSession()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L257 | neighbors=[seed-demo-postgres.test.js, loginSession(), postSeed()]
- "tests_seed_demo_postgres_test_stopserver": "stopServer()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L188 | neighbors=[seed-demo-postgres.test.js, startPrintBridge(), stopPrintBridge()]
- "tests_seed_demo_postgres_test_validateephemeralprocess": "validateEphemeralProcess()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L61 | neighbors=[seed-demo-postgres.test.js, assertSafeTestUrl(), assertServerIdentity()]
- "tests_sse_auth_test": "sse-auth.test.js" | kind=code-symbol | source=tests/sse-auth.test.js:L1 | neighbors=[e0f5e6f New Commit, createSseHub(), fakeReply()]
- "domain_catalog_add_ons": "ADD_ONS" | kind=code-symbol | source=packages/domain/catalog.js:L4 | neighbors=[catalog.js, index.js]
- "domain_catalog_catalog": "CATALOG" | kind=code-symbol | source=packages/domain/catalog.js:L81 | neighbors=[catalog.js, index.js]
- "domain_index_calculatestockrequirements": "calculateStockRequirements()" | kind=code-symbol | source=packages/domain/index.js:L13 | neighbors=[index.js, domain.test.js]
- "domain_index_closecashshift": "closeCashShift()" | kind=code-symbol | source=packages/domain/index.js:L281 | neighbors=[index.js, domain.test.js]
- "finance_core_index_assertoperationaldate": "assertOperationalDate()" | kind=code-symbol | source=packages/finance-core/index.js:L120 | neighbors=[index.js, filterEntries()]
- "finance_core_index_buildentriesfromorder": "buildEntriesFromOrder()" | kind=code-symbol | source=packages/finance-core/index.js:L4 | neighbors=[index.js, finance.test.js]
- "finance_core_index_buildentryfromadjustment": "buildEntryFromAdjustment()" | kind=code-symbol | source=packages/finance-core/index.js:L57 | neighbors=[index.js, finance.test.js]
- "finance_core_index_buildentryfromtabpayment": "buildEntryFromTabPayment()" | kind=code-symbol | source=packages/finance-core/index.js:L78 | neighbors=[index.js, finance.test.js]
- "finance_core_index_buildopeningentry": "buildOpeningEntry()" | kind=code-symbol | source=packages/finance-core/index.js:L42 | neighbors=[index.js, finance.test.js]
- "integrations_integration_repository_claimchannelcommand": "claimChannelCommand()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L199 | neighbors=[command-outbox.js, integration-repository.js]
- "integrations_integration_repository_findchannelcommand": "findChannelCommand()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L168 | neighbors=[integration-repository.js, order-actions.js]
- "integrations_integration_repository_findchannelmapping": "findChannelMapping()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L40 | neighbors=[integration-repository.js, order-ingestion.js]
- "integrations_integration_repository_insertchannelcommand": "insertChannelCommand()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L145 | neighbors=[integration-repository.js, order-actions.js]
- "integrations_integration_repository_insertchannelmapping": "insertChannelMapping()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L48 | neighbors=[integration-repository.js, order-ingestion.js]
- "integrations_polling_runner_assertconfigured": "assertConfigured()" | kind=code-symbol | source=apps/api/src/integrations/polling-runner.js:L5 | neighbors=[polling-runner.js, startIntegrationPolling()]
- "ops_web_main_activeshift": "activeShift()" | kind=code-symbol | source=apps/ops-web/main.js:L799 | neighbors=[main.js, renderShifts()]
- "ops_web_main_catalogitempayload": "catalogItemPayload()" | kind=code-symbol | source=apps/ops-web/main.js:L106 | neighbors=[main.js, ops-web.test.js]
- "ops_web_main_choosecancellationreason": "chooseCancellationReason()" | kind=code-symbol | source=apps/ops-web/main.js:L231 | neighbors=[main.js, api()]
- "ops_web_main_integrationattempt": "integrationAttempt()" | kind=code-symbol | source=apps/ops-web/main.js:L224 | neighbors=[main.js, nextOrderAttempt()]
- "ops_web_main_lockcatalogadmin": "lockCatalogAdmin()" | kind=code-symbol | source=apps/ops-web/main.js:L909 | neighbors=[main.js, catalogAdminApi()]
- "ops_web_main_notify": "notify()" | kind=code-symbol | source=apps/ops-web/main.js:L317 | neighbors=[main.js, openTabAssignment()]
- "ops_web_main_openitemconfig": "openItemConfig()" | kind=code-symbol | source=apps/ops-web/main.js:L370 | neighbors=[main.js, money()]
- "ops_web_main_rendercatalogadminlist": "renderCatalogAdminList()" | kind=code-symbol | source=apps/ops-web/main.js:L966 | neighbors=[main.js, refreshCatalogAdminList()]
- "ops_web_main_renderentries": "renderEntries()" | kind=code-symbol | source=apps/ops-web/main.js:L777 | neighbors=[main.js, refreshAll()]
- "ops_web_main_renderinventory": "renderInventory()" | kind=code-symbol | source=apps/ops-web/main.js:L391 | neighbors=[main.js, refreshAll()]
- "ops_web_main_renderkitchen": "renderKitchen()" | kind=code-symbol | source=apps/ops-web/main.js:L697 | neighbors=[main.js, refreshAll()]
- "ops_web_main_renderorders": "renderOrders()" | kind=code-symbol | source=apps/ops-web/main.js:L620 | neighbors=[main.js, refreshAll()]
- "ops_web_main_setitemdiscount": "setItemDiscount()" | kind=code-symbol | source=apps/ops-web/main.js:L167 | neighbors=[main.js, ops-web.test.js]
- "ops_web_main_setitemquantity": "setItemQuantity()" | kind=code-symbol | source=apps/ops-web/main.js:L196 | neighbors=[main.js, ops-web.test.js]
- "ops_web_main_showlogindialog": "showLoginDialog()" | kind=code-symbol | source=apps/ops-web/main.js:L865 | neighbors=[main.js, api()]
- "ops_web_main_splitpreparationitems": "splitPreparationItems()" | kind=code-symbol | source=apps/ops-web/main.js:L98 | neighbors=[main.js, ops-web.test.js]
- "ops_web_main_syncstamp": "syncStamp()" | kind=code-symbol | source=apps/ops-web/main.js:L313 | neighbors=[main.js, refreshAll()]

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
