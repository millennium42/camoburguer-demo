# Node Description Batch 4 of 12

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

- "ops_web_main_catalogadminapi": "catalogAdminApi()" | kind=code-symbol | source=apps/ops-web/main.js:L942 | neighbors=[main.js, api(), catalogAdminSessionIsCurrent(), lockCatalogAdmin(), refreshCatalogAdminList()] | lang=en
- "ops_web_main_opentabassignment": "openTabAssignment()" | kind=code-symbol | source=apps/ops-web/main.js:L585 | neighbors=[main.js, money(), notify(), refreshSafe(), syncTabAssignmentFields()] | lang=en
- "ops_web_main_renderactivetab": "renderActiveTab()" | kind=code-symbol | source=apps/ops-web/main.js:L495 | neighbors=[main.js, calculateOrderPreviewTotal(), money(), renderOrderItems(), renderTabs()] | lang=en
- "ops_web_main_rendershifts": "renderShifts()" | kind=code-symbol | source=apps/ops-web/main.js:L803 | neighbors=[main.js, refreshAll(), activeShift(), formatWhen(), money()] | lang=en
- "scripts_seed_demo_demoseedrefusal": "DemoSeedRefusal" | kind=code-symbol | source=scripts/seed-demo.mjs:L25 | neighbors=[seed-demo.mjs, .constructor(), runSeedDemo(), sanitizeTarget(), seed-demo-safety.test.js] | lang=en
- "scripts_simulate_order": "simulate-order.mjs" | kind=code-symbol | source=scripts/simulate-order.mjs:L1 | neighbors=[3487db7 feat: refatoracao completa UI, …, 544287b Merge pull request #2 from feat…, 6186a90 feat: add simulate-order script…, db, simulate()] | lang=en
- "src_catalog_repository_mapcatalogitem": "mapCatalogItem()" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L3 | neighbors=[catalog-repository.js, archiveCatalogItem(), getCatalogItem(), insertCatalogItem(), updateCatalogItem()] | lang=en
- "src_seed": "seed.js" | kind=code-symbol | source=apps/event-simulator/src/seed.js:L1 | neighbors=[3487db7 feat: refatoracao completa UI, …, bdd41dd feat: entregar demo operacional…, patch(), post(), waitForApi()] | lang=en
- "tests_order_tab_assignment_test": "order-tab-assignment.test.js" | kind=code-symbol | source=tests/order-tab-assignment.test.js:L1 | neighbors=[79c5964 feat(orders): vincular pedido e…, normalizeTabAssignmentPayload(), sameTabAssignment(), tabAssignmentEligibility(), eligibleOrder] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@176899cac86ac3301abbf1226eda92b96327b1a9": "176899c fix(docker): resolver domínio no seed da API" | kind=Commit | source=git | neighbors=[152ed2f docs(seed): documentar operação…, main, seed-demo.mjs, seed-demo-safety.test.js] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@199ab9ba3c12e24e738e3ae2d877434197528941": "199ab9b chore(ops-web): remover botao lancar itens dos cards de comandas" | kind=Commit | source=git | neighbors=[main, b5581df feat(ops-web): substituir card …, main.js, 38cc0d0 feat(ops-web): adicionar calcul…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@1f9962581e205d43e693ed5f9b7222e3316c5120": "1f99625 feat(ops-web): exibir estoque de paes no painel operacional e atualizar…" | kind=Commit | source=git | neighbors=[main, 5c45a5c feat(ops-web): abrir modal de n…, main.js, b5581df feat(ops-web): substituir card …] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@344d87e2f40bf5d06d4cdc1d8ee778c63f2f6aac": "344d87e fix(ops-web): correcao de renderizacao em tempo real de itens de comand…" | kind=Commit | source=git | neighbors=[main, 5276954 docs: unificar documentacao cen…, main.js, 6661297 fix(api): aumentar rate limit p…] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@38cc0d064e97ba836cc56bf3a0279db5681efae2": "38cc0d0 feat(ops-web): adicionar calculo de troco para parcelas de pagamento de…" | kind=Commit | source=git | neighbors=[1bd28c8 fix(ops-web): ajustar layout re…, main, 199ab9b chore(ops-web): remover botao l…, main.js] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@3fb67d4a7f451127a7b9fcbf5fed8f98360eaa20": "3fb67d4 fix: point ops-web apiBase to camoburguer-api subdomain on Render" | kind=Commit | source=git | neighbors=[main, 1bb0752 docs: atualizar documentacao co…, main.js, 9aae1fb Fix API base URL for Render dep…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@58fc56b9e1e0430a3e62d0957c36da25bdebfe80": "58fc56b fix: corrige renderCatalog tabs e event delegation no click handler" | kind=Commit | source=git | neighbors=[3487db7 feat: refatoracao completa UI, …, codex/unificacao-lgpd-visual, main.js, ops-web.test.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@60a3a7eca068bcad40896741f25f2a54e25dfb4b": "60a3a7e fix(ops-web): force cache bust of main.js" | kind=Commit | source=git | neighbors=[codex/unificacao-lgpd-visual, main, dd5fca6 feat(ops-web): implementa novo …, ea7238b fix(ops-web): remove Object.gro…] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@61ee2f5526119956891a4fa400a424cded0ec1e3": "61ee2f5 feat(ops-web): ordenacao de pedidos ativos em cima e finalizados ao fun…" | kind=Commit | source=git | neighbors=[main, 6661297 fix(api): aumentar rate limit p…, main.js, 8bcab6d merge: resolve merge conflicts] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@66612970daa632117176be7a4e33659fe429d3c9": "6661297 fix(api): aumentar rate limit para 1000 req/min no modo demo" | kind=Commit | source=git | neighbors=[61ee2f5 feat(ops-web): ordenacao de ped…, main, 344d87e fix(ops-web): correcao de rende…, server.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@69c446f0bcb8aeaa0bcfe84f8eba44beca82adc8": "69c446f feat(ops-web): permitir vincular e criar comanda/mesa no formulario de …" | kind=Commit | source=git | neighbors=[main, a6bb648 feat(ops-web): adicionar calcul…, main.js, 8a1a7c1 feat(ops-web): embarcar formula…] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@6e6b2d9bde58b919313ad0039a8a972a7f381ada": "6e6b2d9 feat(ops-web): redesenhar interface com tema POS escuro e modais de acao" | kind=Commit | source=git | neighbors=[main, e172bfe feat(ops-web): embarcar formula…, main.js, ccc816f chore(graphify): atualizar graf…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@8a1a7c11e8abd9999cf63cddd1a0fc09e78407f7": "8a1a7c1 feat(ops-web): embarcar formulario de novo pedido em modal popup" | kind=Commit | source=git | neighbors=[main, 69c446f feat(ops-web): permitir vincula…, main.js, e172bfe feat(ops-web): embarcar formula…] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@9aae1fb0f3d8cfafe0fa23db0fee345396b5cea4": "9aae1fb Fix API base URL for Render deployment" | kind=Commit | source=git | neighbors=[main, 3fb67d4 fix: point ops-web apiBase to c…, main.js, bee1646 Remove duplicate HEAD route for…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@a6bb648edf01e52ab5b9c4e150d27781279e1051": "a6bb648 feat(ops-web): adicionar calculo automatico de troco para pagamento em …" | kind=Commit | source=git | neighbors=[69c446f feat(ops-web): permitir vincula…, main, 1bd28c8 fix(ops-web): ajustar layout re…, main.js] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@aac6e038cc493d0fc79c093d9f92ff0160b99de7": "aac6e03 Add root health GET and HEAD endpoints" | kind=Commit | source=git | neighbors=[4e6bbe4 feat(render): adicionar inicial…, main, bee1646 Remove duplicate HEAD route for…, server.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@b5581df309faad11522197c75f073537cc575460": "b5581df feat(ops-web): substituir card de novo pedido na aba pedidos por resumo…" | kind=Commit | source=git | neighbors=[199ab9b chore(ops-web): remover botao l…, main, 1f99625 feat(ops-web): exibir estoque d…, main.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@bee1646caf6a74bf1459c4bfe561713ba713de6d": "bee1646 Remove duplicate HEAD route for '/'" | kind=Commit | source=git | neighbors=[aac6e03 Add root health GET and HEAD en…, main, 9aae1fb Fix API base URL for Render dep…, server.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@e172bfe233b5f8695e977e1a17a68d73d2fbd270": "e172bfe feat(ops-web): embarcar formularios diretamente nos modais de comanda e…" | kind=Commit | source=git | neighbors=[6e6b2d9 feat(ops-web): redesenhar inter…, main, 8a1a7c1 feat(ops-web): embarcar formula…, main.js] | lang=nl
- "domain_index_confirmorder": "confirmOrder()" | kind=code-symbol | source=packages/domain/index.js:L216 | neighbors=[index.js, requiresKitchenPreparation(), transitionOrder(), domain.test.js] | lang=en
- "domain_index_requireskitchenpreparation": "requiresKitchenPreparation()" | kind=code-symbol | source=packages/domain/index.js:L212 | neighbors=[index.js, buildKitchenTicket(), confirmOrder(), domain.test.js] | lang=en
- "finance_core_index_businesshour": "businessHour()" | kind=code-symbol | source=packages/finance-core/index.js:L116 | neighbors=[index.js, zonedParts(), summarizeFinance(), finance.test.js] | lang=en
- "integrations_http_client": "http-client.js" | kind=code-symbol | source=apps/api/src/integrations/http-client.js:L1 | neighbors=[3487db7 feat: refatoracao completa UI, …, e0362f4 feat: Entrega 2 - Ingestao Segu…, requestForm(), requestJson()] | lang=en
- "integrations_http_client_requestform": "requestForm()" | kind=code-symbol | source=apps/api/src/integrations/http-client.js:L33 | neighbors=[http-client.js, requestJson(), deliverymuch.js, ifood.js] | lang=en
- "integrations_http_client_requestjson": "requestJson()" | kind=code-symbol | source=apps/api/src/integrations/http-client.js:L1 | neighbors=[http-client.js, requestForm(), deliverymuch.js, ifood.js] | lang=en
- "integrations_integration_repository_updatechannelcommand": "updateChannelCommand()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L176 | neighbors=[integration-repository.js, columnFor(), deliverymuch.js, ifood.js] | lang=en
- "integrations_order_actions_applyintegratedtransition": "applyIntegratedTransition()" | kind=code-symbol | source=apps/api/src/integrations/order-actions.js:L157 | neighbors=[order-actions.js, deliverymuch.js, ifood.js, integrations.test.js] | lang=en
- "integrations_order_actions_createorderaction": "createOrderAction()" | kind=code-symbol | source=apps/api/src/integrations/order-actions.js:L29 | neighbors=[integration-routes.js, order-actions.js, integrations.test.js, seed-demo-postgres.test.js] | lang=en
- "integrations_order_ingestion_ingestexternalorder": "ingestExternalOrder()" | kind=code-symbol | source=apps/api/src/integrations/order-ingestion.js:L7 | neighbors=[order-ingestion.js, deliverymuch.js, ifood.js, integrations.test.js] | lang=en
- "ops_web_main_catalogadminsessioniscurrent": "catalogAdminSessionIsCurrent()" | kind=code-symbol | source=apps/ops-web/main.js:L936 | neighbors=[main.js, catalogAdminApi(), sameCatalogAdminSession(), refreshCatalogAdminList()] | lang=en
- "ops_web_main_refreshcatalogadminlist": "refreshCatalogAdminList()" | kind=code-symbol | source=apps/ops-web/main.js:L997 | neighbors=[main.js, catalogAdminApi(), catalogAdminSessionIsCurrent(), renderCatalogAdminList()] | lang=en

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-003.json

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
