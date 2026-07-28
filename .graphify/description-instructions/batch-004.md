# Node Description Batch 5 of 12

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
LANGUAGE: each entry has a `lang=` marker giving the language of its source.
Write that entry's description in EXACTLY that language. Do not translate to
a single common language — match each node's source language individually.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "ops_web_main_renderfinancesummary": "renderFinanceSummary()" | kind=code-symbol | source=apps/ops-web/main.js:L743 | neighbors=[main.js, refreshAll(), escapeHtml(), money()] | lang=en
- "ops_web_main_synccashchange": "syncCashChange()" | kind=code-symbol | source=apps/ops-web/main.js:L1109 | neighbors=[main.js, renderOrderItems(), calculateOrderPreviewTotal(), money()] | lang=en
- "providers_ifood_fetchifoodcancellationreasons": "fetchIFoodCancellationReasons()" | kind=code-symbol | source=apps/api/src/integrations/providers/ifood.js:L38 | neighbors=[integration-routes.js, ifood.js, clearIFoodToken(), getIFoodToken()] | lang=en
- "scripts_check_syntax": "check-syntax.mjs" | kind=code-symbol | source=scripts/check-syntax.mjs:L1 | neighbors=[075c321 Audita demo e endurece operacao, collect(), files, roots] | lang=en
- "src_order_tab_assignment_normalizetabassignmentpayload": "normalizeTabAssignmentPayload()" | kind=code-symbol | source=apps/api/src/order-tab-assignment.js:L7 | neighbors=[order-tab-assignment.js, clean(), server.js, order-tab-assignment.test.js] | lang=en
- "src_server_reconcileprintjob": "reconcilePrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L851 | neighbors=[server.js, dispatchPrintJob(), bridgeHeaders(), readBridgeJson()] | lang=en
- "src_sse": "sse.js" | kind=code-symbol | source=apps/api/src/sse.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, 3487db7 feat: refatoracao completa UI, …, bdd41dd feat: entregar demo operacional…, createSseHub()] | lang=en
- "src_validation": "validation.js" | kind=code-symbol | source=apps/print-bridge/src/validation.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, equalSecret(), safeId(), validPrintContent()] | lang=en
- "tests_print_bridge_test": "print-bridge.test.js" | kind=code-symbol | source=tests/print-bridge.test.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, equalSecret(), safeId(), validPrintContent()] | lang=en
- "tests_smoke_api": "api()" | kind=code-symbol | source=tests/smoke.mjs:L34 | neighbors=[smoke.mjs, request(), createOrder(), expectBlockedAssignment()] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@03f8302df65d38210d0d82c255ed0ccb20fce5c0": "03f8302 docs(operations): definir catálogo, entrega direta e vínculo tardio" | kind=Commit | source=git | neighbors=[main, 87b872c feat(domain): congelar classifi…, 075c321 Audita demo e endurece operacao] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@152ed2f4068ad65e35a8dd2cd5a66d4c080de3d1": "152ed2f docs(seed): documentar operação explícita e rollback" | kind=Commit | source=git | neighbors=[main, 176899c fix(docker): resolver domínio n…, 98ec659 fix(api): impedir seed destruti…] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@1bb0752734a1717f23176d1b61d933ed7ac3146c": "1bb0752 docs: atualizar documentacao completa, README, 5W2H (PRs 13-18), guia d…" | kind=Commit | source=git | neighbors=[main, ccc816f chore(graphify): atualizar graf…, 3fb67d4 fix: point ops-web apiBase to c…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@1bd28c844f1a7636e83333ed0ad3bf8a49519b89": "1bd28c8 fix(ops-web): ajustar layout responsivo e largura das linhas do carrinh…" | kind=Commit | source=git | neighbors=[main, 38cc0d0 feat(ops-web): adicionar calcul…, a6bb648 feat(ops-web): adicionar calcul…] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@52769546694d0f2fe9ded35f5bf56b3b10c11a23": "5276954 docs: unificar documentacao central e criar blueprint de deploy no Rend…" | kind=Commit | source=git | neighbors=[344d87e fix(ops-web): correcao de rende…, main, f5d44ad fix(render): corrigir chave do …] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@9dbb57a2b9adb6909498c8bbf8e30324a9779bb3": "9dbb57a test(release): consolidar regressões e mapa do projeto" | kind=Commit | source=git | neighbors=[main, 0009eb5 fix(release): alinhar cancelame…, f3fc468 feat(ops-web): atribuir pedido …] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@a045facc63ed90cdaacd573442b597ef7bf073bb": "a045fac docs(spec): impedir auto-seed destrutivo" | kind=Commit | source=git | neighbors=[main, f3191d3 fix(render): desativar auto-see…, eef1d5a fix(integrations): tornar event…] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@ccc816fa058054a98296168dea607f3add4d8d3d": "ccc816f chore(graphify): atualizar grafo de conhecimento e script WSL após atua…" | kind=Commit | source=git | neighbors=[1bb0752 docs: atualizar documentacao co…, main, 6e6b2d9 feat(ops-web): redesenhar inter…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@f3191d3dd8b9bbc5237ad853f0142e6d6d79b7df": "f3191d3 fix(render): desativar auto-seed no deploy" | kind=Commit | source=git | neighbors=[a045fac docs(spec): impedir auto-seed d…, main, 98ec659 fix(api): impedir seed destruti…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@f5d44ad417fb5c70e6d0a9d751e0bf88bad70085": "f5d44ad fix(render): corrigir chave do postgres no render.yaml de services para…" | kind=Commit | source=git | neighbors=[5276954 docs: unificar documentacao cen…, main, 4e6bbe4 feat(render): adicionar inicial…] | lang=pt
- "domain_index_buildkitchenticket": "buildKitchenTicket()" | kind=code-symbol | source=packages/domain/index.js:L226 | neighbors=[index.js, requiresKitchenPreparation(), domain.test.js] | lang=en
- "domain_index_calculateordertotal": "calculateOrderTotal()" | kind=code-symbol | source=packages/domain/index.js:L43 | neighbors=[index.js, normalizeDiscountPercent(), createOrder()] | lang=en
- "domain_index_createcancellationorder": "createCancellationOrder()" | kind=code-symbol | source=packages/domain/index.js:L190 | neighbors=[index.js, createOrder(), domain.test.js] | lang=en
- "domain_index_createcashshift": "createCashShift()" | kind=code-symbol | source=packages/domain/index.js:L262 | neighbors=[index.js, domain.test.js, finance.test.js] | lang=en
- "domain_index_normalizediscountpercent": "normalizeDiscountPercent()" | kind=code-symbol | source=packages/domain/index.js:L35 | neighbors=[index.js, calculateOrderTotal(), createOrder()] | lang=en
- "domain_index_transitionorder": "transitionOrder()" | kind=code-symbol | source=packages/domain/index.js:L199 | neighbors=[index.js, confirmOrder(), domain.test.js] | lang=en
- "finance_core_index_businessdate": "businessDate()" | kind=code-symbol | source=packages/finance-core/index.js:L111 | neighbors=[index.js, zonedParts(), finance.test.js] | lang=en
- "finance_core_index_filterentries": "filterEntries()" | kind=code-symbol | source=packages/finance-core/index.js:L140 | neighbors=[index.js, assertOperationalDate(), finance.test.js] | lang=en
- "finance_core_index_summarizefinance": "summarizeFinance()" | kind=code-symbol | source=packages/finance-core/index.js:L155 | neighbors=[index.js, businessHour(), finance.test.js] | lang=en
- "finance_core_index_zonedparts": "zonedParts()" | kind=code-symbol | source=packages/finance-core/index.js:L98 | neighbors=[index.js, businessDate(), businessHour()] | lang=en
- "integrations_integration_repository_getpendingcommands": "getPendingCommands()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L187 | neighbors=[integration-repository.js, deliverymuch.js, ifood.js] | lang=en
- "integrations_integration_repository_insertchannelevent": "insertChannelEvent()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L104 | neighbors=[integration-repository.js, deliverymuch.js, ifood.js] | lang=en
- "integrations_integration_repository_updatechannelevent": "updateChannelEvent()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L126 | neighbors=[integration-repository.js, columnFor(), deliverymuch.js] | lang=en
- "integrations_integration_repository_updateownedchannelcommand": "updateOwnedChannelCommand()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L239 | neighbors=[integration-repository.js, columnFor(), seed-demo-postgres.test.js] | lang=en
- "integrations_order_actions_activateacceptedorder": "activateAcceptedOrder()" | kind=code-symbol | source=apps/api/src/integrations/order-actions.js:L125 | neighbors=[order-actions.js, deliverymuch.js, ifood.js] | lang=en
- "integrations_polling_runner_startintegrationpolling": "startIntegrationPolling()" | kind=code-symbol | source=apps/api/src/integrations/polling-runner.js:L11 | neighbors=[polling-runner.js, assertConfigured(), server.js] | lang=en
- "ops_web_main_addoraccumulateitem": "addOrAccumulateItem()" | kind=code-symbol | source=apps/ops-web/main.js:L151 | neighbors=[main.js, validDiscountPercent(), ops-web.test.js] | lang=en
- "ops_web_main_escapehtml": "escapeHtml()" | kind=code-symbol | source=apps/ops-web/main.js:L94 | neighbors=[main.js, renderFinanceSummary(), ops-web.test.js] | lang=en
- "ops_web_main_formatwhen": "formatWhen()" | kind=code-symbol | source=apps/ops-web/main.js:L302 | neighbors=[main.js, printShiftReport(), renderShifts()] | lang=en
- "ops_web_main_nextorderattempt": "nextOrderAttempt()" | kind=code-symbol | source=apps/ops-web/main.js:L204 | neighbors=[main.js, integrationAttempt(), ops-web.test.js] | lang=en

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
