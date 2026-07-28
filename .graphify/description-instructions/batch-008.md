# Node Description Batch 9 of 14

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

- "ops_web_main_synctabassignmentfields": "syncTabAssignmentFields()" | kind=code-symbol | source=apps/ops-web/main.js:L575 | neighbors=[main.js, openTabAssignment()]
- "ops_web_main_tabassignmentpayload": "tabAssignmentPayload()" | kind=code-symbol | source=apps/ops-web/main.js:L211 | neighbors=[main.js, ops-web.test.js]
- "ops_web_main_updatetabcashchange": "updateTabCashChange()" | kind=code-symbol | source=apps/ops-web/main.js:L1128 | neighbors=[main.js, money()]
- "providers_deliverymuch_deliverymuchpayloadfingerprint": "deliveryMuchPayloadFingerprint()" | kind=code-symbol | source=apps/api/src/integrations/providers/deliverymuch.js:L30 | neighbors=[deliverymuch.js, integrations.test.js]
- "providers_deliverymuch_mapdeliverymuchorderitem": "mapDeliveryMuchOrderItem()" | kind=code-symbol | source=apps/api/src/integrations/providers/deliverymuch.js:L39 | neighbors=[deliverymuch.js, integrations.test.js]
- "providers_deliverymuch_normalizedeliverymuchstatus": "normalizeDeliveryMuchStatus()" | kind=code-symbol | source=apps/api/src/integrations/providers/deliverymuch.js:L26 | neighbors=[deliverymuch.js, integrations.test.js]
- "providers_ifood_ifooditemnotes": "ifoodItemNotes()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L114 | neighbors=[ifood.js, mapIFoodOrderItem()]
- "providers_ifood_normalizeifoodeventtype": "normalizeIFoodEventType()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L72 | neighbors=[ifood.js, integrations.test.js]
- "scripts_seed_demo_issanitizedtarget": "isSanitizedTarget()" | kind=code-symbol | source=scripts/seed-demo.mjs:L78 | neighbors=[seed-demo.mjs, runSeedDemo()]
- "scripts_seed_demo_requestdemoseed": "requestDemoSeed()" | kind=code-symbol | source=scripts/seed-demo.mjs:L290 | neighbors=[seed-demo.mjs, seed-demo-safety.test.js]
- "scripts_seed_demo_resolvetarget": "resolveTarget()" | kind=code-symbol | source=scripts/seed-demo.mjs:L87 | neighbors=[seed-demo.mjs, sanitizeTarget()]
- "scripts_seed_demo_runpreflight": "runPreflight()" | kind=code-symbol | source=scripts/seed-demo.mjs:L102 | neighbors=[seed-demo.mjs, sameCatalog()]
- "scripts_seed_demo_samecatalog": "sameCatalog()" | kind=code-symbol | source=scripts/seed-demo.mjs:L57 | neighbors=[seed-demo.mjs, runPreflight()]
- "scripts_seed_demo_seeddemo": "seedDemo()" | kind=code-symbol | source=scripts/seed-demo.mjs:L4 | neighbors=[seed-demo.mjs, runSeedDemo()]
- "shared_types_index_assertenum": "assertEnum()" | kind=code-symbol | source=packages/shared-types/index.js:L48 | neighbors=[index.js, index.js]
- "shared_types_index_fulfillment_modes": "FULFILLMENT_MODES" | kind=code-symbol | source=packages/shared-types/index.js:L2 | neighbors=[index.js, index.js]
- "shared_types_index_order_sources": "ORDER_SOURCES" | kind=code-symbol | source=packages/shared-types/index.js:L1 | neighbors=[index.js, index.js]
- "shared_types_index_order_statuses": "ORDER_STATUSES" | kind=code-symbol | source=packages/shared-types/index.js:L3 | neighbors=[index.js, index.js]
- "shared_types_index_payment_methods": "PAYMENT_METHODS" | kind=code-symbol | source=packages/shared-types/index.js:L11 | neighbors=[index.js, index.js]
- "src_auth_allowedlogin": "allowedLogin()" | kind=code-symbol | source=apps/api/src/auth.js:L86 | neighbors=[auth.js, login()]
- "src_auth_changepassword": "changePassword()" | kind=code-symbol | source=apps/api/src/auth.js:L154 | neighbors=[auth.js, server.js]
- "src_auth_createcsrftoken": "createCsrfToken()" | kind=code-symbol | source=apps/api/src/auth.js:L175 | neighbors=[auth.js, login()]
- "src_auth_ensurebootstrapadmin": "ensureBootstrapAdmin()" | kind=code-symbol | source=apps/api/src/auth.js:L69 | neighbors=[auth.js, server.js]
- "src_auth_loginkey": "loginKey()" | kind=code-symbol | source=apps/api/src/auth.js:L82 | neighbors=[auth.js, login()]
- "src_auth_recordfailure": "recordFailure()" | kind=code-symbol | source=apps/api/src/auth.js:L92 | neighbors=[auth.js, login()]
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
- "src_idempotency_canonicaladdon": "canonicalAddon()" | kind=code-symbol | source=apps/api/src/idempotency.js:L62 | neighbors=[idempotency.js, moneyCents()]
- "src_idempotency_canonicalvalue": "canonicalValue()" | kind=code-symbol | source=apps/api/src/idempotency.js:L33 | neighbors=[idempotency.js, canonicalJson()]
- "src_idempotency_integrationactionfingerprintpayload": "integrationActionFingerprintPayload()" | kind=code-symbol | source=apps/api/src/idempotency.js:L124 | neighbors=[order-actions.js, idempotency.js]
- "src_order_tab_assignment_clean": "clean()" | kind=code-symbol | source=apps/api/src/order-tab-assignment.js:L3 | neighbors=[order-tab-assignment.js, normalizeTabAssignmentPayload()]
- "src_server_equalsecret": "equalSecret()" | kind=code-symbol | source=apps/api/src/server.js:L76 | neighbors=[server.js, requireDemoAdmin()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-008.json

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
