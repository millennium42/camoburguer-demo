# Node Description Batch 5 of 14

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
For an entity node (any other kind — e.g. a person, place, event, object),
describe what the entity is and its role, grounded in its type, its
relations (neighbors) and the provided citations/evidence — e.g.
"Lady Carfax, a wealthy heiress who disappears en route to Lausanne.".
Ground entity descriptions in the citations/evidence when present; do not
speculate beyond the context, so a node with no supporting context may be
left out of the reply.
Write every description in Portuguese (pt). Do not switch languages.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "commit:repo:github.com/millennium42/camoburguer-demo@f3191d3dd8b9bbc5237ad853f0142e6d6d79b7df": "f3191d3 fix(render): desativar auto-seed no deploy" | kind=Commit | source=git | neighbors=[a045fac docs(spec): impedir auto-seed d…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 98ec659 fix(api): impedir seed destruti…]
- "commit:repo:github.com/millennium42/camoburguer-demo@f5d44ad417fb5c70e6d0a9d751e0bf88bad70085": "f5d44ad fix(render): corrigir chave do postgres no render.yaml de services para…" | kind=Commit | source=git | neighbors=[5276954 docs: unificar documentacao cen…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 4e6bbe4 feat(render): adicionar inicial…]
- "integrations_command_outbox_processchannelcommands": "processChannelCommands()" | kind=code-symbol | source=apps/api/src/integrations/command-outbox.js:L102 | neighbors=[command-outbox.js, reconcileCommand(), sendCommand(), polling-runner.js, seed-demo-postgres.test.js]
- "integrations_integration_repository_columnfor": "columnFor()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L35 | neighbors=[integration-repository.js, updateChannelCommand(), updateChannelEvent(), updateChannelMapping(), updateOwnedChannelCommand()]
- "integrations_integration_repository_getorderwithmapping": "getOrderWithMapping()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L267 | neighbors=[integration-repository.js, integration-routes.js, order-actions.js, deliverymuch.js, ifood.js]
- "integrations_integration_repository_updatechannelmapping": "updateChannelMapping()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L69 | neighbors=[integration-repository.js, columnFor(), order-actions.js, deliverymuch.js, ifood.js]
- "ops_web_main_api": "api()" | kind=code-symbol | source=apps/ops-web/main.js:L841 | neighbors=[main.js, showLoginDialog(), catalogAdminApi(), chooseCancellationReason(), refreshAll()]
- "ops_web_main_catalogadminapi": "catalogAdminApi()" | kind=code-symbol | source=apps/ops-web/main.js:L942 | neighbors=[main.js, api(), catalogAdminSessionIsCurrent(), lockCatalogAdmin(), refreshCatalogAdminList()]
- "ops_web_main_opentabassignment": "openTabAssignment()" | kind=code-symbol | source=apps/ops-web/main.js:L585 | neighbors=[main.js, money(), notify(), refreshSafe(), syncTabAssignmentFields()]
- "ops_web_main_renderactivetab": "renderActiveTab()" | kind=code-symbol | source=apps/ops-web/main.js:L495 | neighbors=[main.js, calculateOrderPreviewTotal(), money(), renderOrderItems(), renderTabs()]
- "ops_web_main_rendershifts": "renderShifts()" | kind=code-symbol | source=apps/ops-web/main.js:L803 | neighbors=[main.js, refreshAll(), activeShift(), formatWhen(), money()]
- "scripts_demo_simulator_client_runsimulation": "runSimulation()" | kind=code-symbol | source=scripts/demo-simulator-client.mjs:L99 | neighbors=[demo-simulator-client.mjs, createSimulationClient(), simulate-order.mjs, seed.js, simulator.test.js]
- "scripts_seed_demo_demoseedrefusal": "DemoSeedRefusal" | kind=code-symbol | source=scripts/seed-demo.mjs:L25 | neighbors=[seed-demo.mjs, .constructor(), runSeedDemo(), sanitizeTarget(), seed-demo-safety.test.js]
- "src_auth_hashtoken": "hashToken()" | kind=code-symbol | source=apps/api/src/auth.js:L20 | neighbors=[auth.js, authenticate(), login(), revokeSession(), validateCsrf()]
- "src_auth_validatecsrf": "validateCsrf()" | kind=code-symbol | source=apps/api/src/auth.js:L150 | neighbors=[auth.js, hashToken(), safeEqual(), server.js, auth.test.js]
- "src_auth_verifypassword": "verifyPassword()" | kind=code-symbol | source=apps/api/src/auth.js:L36 | neighbors=[auth.js, login(), safeEqual(), scrypt, auth.test.js]
- "src_catalog_repository_mapcatalogitem": "mapCatalogItem()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L3 | neighbors=[catalog-repository.js, archiveCatalogItem(), getCatalogItem(), insertCatalogItem(), updateCatalogItem()]
- "src_sse": "sse.js" | kind=code-symbol | source=apps/api/src/sse.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, 3487db7 feat: refatoracao completa UI, …, bdd41dd feat: entregar demo operacional…, e0f5e6f New Commit, createSseHub()]
- "tests_order_tab_assignment_test": "order-tab-assignment.test.js" | kind=code-symbol | source=tests/order-tab-assignment.test.js:L1 | neighbors=[79c5964 feat(orders): vincular pedido e…, normalizeTabAssignmentPayload(), sameTabAssignment(), tabAssignmentEligibility(), eligibleOrder]
- "commit:repo:github.com/millennium42/camoburguer-demo@58fc56b9e1e0430a3e62d0957c36da25bdebfe80": "58fc56b fix: corrige renderCatalog tabs e event delegation no click handler" | kind=Commit | source=git | neighbors=[3487db7 feat: refatoracao completa UI, …, codex/unificacao-lgpd-visual, main.js, ops-web.test.js]
- "domain_index_confirmorder": "confirmOrder()" | kind=code-symbol | source=packages/domain/index.js:L216 | neighbors=[index.js, requiresKitchenPreparation(), transitionOrder(), domain.test.js]
- "domain_index_requireskitchenpreparation": "requiresKitchenPreparation()" | kind=code-symbol | source=packages/domain/index.js:L212 | neighbors=[index.js, buildKitchenTicket(), confirmOrder(), domain.test.js]
- "finance_core_index_businesshour": "businessHour()" | kind=code-symbol | source=packages/finance-core/index.js:L116 | neighbors=[index.js, zonedParts(), summarizeFinance(), finance.test.js]
- "integrations_command_outbox_sendcommand": "sendCommand()" | kind=code-symbol | source=apps/api/src/integrations/command-outbox.js:L70 | neighbors=[command-outbox.js, processChannelCommands(), classifyCommandError(), finishUnknown()]
- "integrations_http_client": "http-client.js" | kind=code-symbol | source=apps/api/src/integrations/http-client.js:L1 | neighbors=[3487db7 feat: refatoracao completa UI, …, e0362f4 feat: Entrega 2 - Ingestao Segu…, requestForm(), requestJson()]
- "integrations_http_client_requestform": "requestForm()" | kind=code-symbol | source=apps/api/src/integrations/http-client.js:L33 | neighbors=[http-client.js, requestJson(), deliverymuch.js, ifood.js]
- "integrations_http_client_requestjson": "requestJson()" | kind=code-symbol | source=apps/api/src/integrations/http-client.js:L1 | neighbors=[http-client.js, requestForm(), deliverymuch.js, ifood.js]
- "integrations_integration_repository_updatechannelcommand": "updateChannelCommand()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L176 | neighbors=[integration-repository.js, columnFor(), deliverymuch.js, ifood.js]
- "integrations_integration_repository_updateownedchannelcommand": "updateOwnedChannelCommand()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L239 | neighbors=[command-outbox.js, integration-repository.js, columnFor(), seed-demo-postgres.test.js]
- "integrations_order_actions_applyintegratedtransition": "applyIntegratedTransition()" | kind=code-symbol | source=apps/api/src/integrations/order-actions.js:L157 | neighbors=[order-actions.js, deliverymuch.js, ifood.js, integrations.test.js]
- "integrations_order_actions_createorderaction": "createOrderAction()" | kind=code-symbol | source=apps/api/src/integrations/order-actions.js:L29 | neighbors=[integration-routes.js, order-actions.js, integrations.test.js, seed-demo-postgres.test.js]
- "integrations_order_ingestion_ingestexternalorder": "ingestExternalOrder()" | kind=code-symbol | source=apps/api/src/integrations/order-ingestion.js:L7 | neighbors=[order-ingestion.js, deliverymuch.js, ifood.js, integrations.test.js]
- "ops_web_main_catalogadminsessioniscurrent": "catalogAdminSessionIsCurrent()" | kind=code-symbol | source=apps/ops-web/main.js:L936 | neighbors=[main.js, catalogAdminApi(), sameCatalogAdminSession(), refreshCatalogAdminList()]
- "ops_web_main_refreshcatalogadminlist": "refreshCatalogAdminList()" | kind=code-symbol | source=apps/ops-web/main.js:L997 | neighbors=[main.js, catalogAdminApi(), catalogAdminSessionIsCurrent(), renderCatalogAdminList()]
- "ops_web_main_renderfinancesummary": "renderFinanceSummary()" | kind=code-symbol | source=apps/ops-web/main.js:L743 | neighbors=[main.js, refreshAll(), escapeHtml(), money()]
- "ops_web_main_synccashchange": "syncCashChange()" | kind=code-symbol | source=apps/ops-web/main.js:L1109 | neighbors=[main.js, renderOrderItems(), calculateOrderPreviewTotal(), money()]
- "providers_ifood_fetchifoodcancellationreasons": "fetchIFoodCancellationReasons()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L38 | neighbors=[integration-routes.js, ifood.js, clearIFoodToken(), getIFoodToken()]
- "scripts_check_syntax": "check-syntax.mjs" | kind=code-symbol | source=scripts/check-syntax.mjs:L1 | neighbors=[075c321 Audita demo e endurece operacao, collect(), files, roots]
- "src_auth_authenticate": "authenticate()" | kind=code-symbol | source=apps/api/src/auth.js:L121 | neighbors=[auth.js, hashToken(), server.js, auth.test.js]
- "src_auth_hashpassword": "hashPassword()" | kind=code-symbol | source=apps/api/src/auth.js:L30 | neighbors=[auth.js, scrypt, auth.test.js, seed-demo-postgres.test.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-004.json

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
