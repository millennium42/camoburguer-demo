# Node Description Batch 3 of 12

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

- "commit:repo:github.com/millennium42/camoburguer-demo@ffc23930f9573d565a637cedae12396b04f208e7": "ffc2393 docs: adiciona roteiro tecnico e de arquitetura para producao e integra…" | kind=Commit | source=git | neighbors=[ca242eb Merge pull request #9 from chor…, chore/add-roadmap-fase2, chore/dark-brown-ui, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd] | lang=en
- "ops_web_main_money": "money()" | kind=code-symbol | source=apps/ops-web/main.js:L243 | neighbors=[main.js, openItemConfig(), openTabAssignment(), printShiftReport(), renderActiveTab(), renderFinanceSummary()] | lang=en
- "src_catalog_repository": "catalog-repository.js" | kind=code-symbol | source=apps/api/src/catalog-repository.js:L1 | neighbors=[01b42c9 feat(ops-web): adicionar manute…, b5e40c6 feat(api): persistir e administ…, e0a6d46 fix(integrations): classificar …, archiveCatalogItem(), getCatalogItem(), insertCatalogItem()] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@09e6ceee1a3c057c3657a318fe6b87b38b5d2cef": "09e6cee Merge pull request #12 from chore/dark-brown-ui" | kind=Commit | source=git | neighbors=[codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd, fix/auth-queue-layout, main, c2e3399 Merge pull request #13 from fix…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@8bcab6d33c8a1eeb4a536f30064c15a8570a41a8": "8bcab6d merge: resolve merge conflicts" | kind=Commit | source=git | neighbors=[384a10f feat(ops-web): fluxo continuo d…, main, 61ee2f5 feat(ops-web): ordenacao de ped…, index.js, main.js, seed-demo.mjs] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@b5e40c64ebdd276cfaf15345218d7bb0d63bb34e": "b5e40c6 feat(api): persistir e administrar catálogo operacional" | kind=Commit | source=git | neighbors=[87b872c feat(domain): congelar classifi…, main, 01b42c9 feat(ops-web): adicionar manute…, order-actions.js, seed-demo.mjs, catalog-repository.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@c2e3399cda49d3f256c8e7382ec793081f2ad898": "c2e3399 Merge pull request #13 from fix/auth-queue-layout" | kind=Commit | source=git | neighbors=[09e6cee Merge pull request #12 from cho…, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd, main, 384a10f feat(ops-web): fluxo continuo d…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@e0a6d4669a13187f3c1213e9da0e9cfad1263434": "e0a6d46 fix(integrations): classificar itens externos pelo catálogo" | kind=Commit | source=git | neighbors=[0009eb5 fix(release): alinhar cancelame…, main, eef1d5a fix(integrations): tornar event…, index.js, order-ingestion.js, deliverymuch.js] | lang=pt
- "domain_catalog": "catalog.js" | kind=code-symbol | source=packages/domain/catalog.js:L1 | neighbors=[3487db7 feat: refatoracao completa UI, …, 5b00ef8 feat: adicionar adicionais conf…, 87b872c feat(domain): congelar classifi…, cdeeabd feat: atualizar cardapio pelo s…, ADD_ONS, addonCategories] | lang=en
- "src_server_dispatchprintjob": "dispatchPrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L903 | neighbors=[server.js, bridgeHeaders(), claimPrintJob(), failPrintJob(), finalizePrintedJob(), readBridgeJson()] | lang=en
- "src_server_mapprintjob": "mapPrintJob()" | kind=code-symbol | source=apps/api/src/server.js:L690 | neighbors=[server.js, claimPrintJob(), failPrintJob(), finalizePrintedJob(), getPrimaryPrintJob(), reservePrintJob()] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@0009eb5ac0faf88d2f2566c37a29d81ed95586e9": "0009eb5 fix(release): alinhar cancelamentos e fila direta" | kind=Commit | source=git | neighbors=[main, e0a6d46 fix(integrations): classificar …, main.js, server.js, domain.test.js, ops-web.test.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@01b42c9fd1b79039b1d4b3f6fa0b5ff06440d6c0": "01b42c9 feat(ops-web): adicionar manutenção do cardápio" | kind=Commit | source=git | neighbors=[main, 79c5964 feat(orders): vincular pedido e…, main.js, catalog-repository.js, server.js, ops-web.test.js] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@384a10f41c8e5f34e5c9f45f51519fd7688f660e": "384a10f feat(ops-web): fluxo continuo de comandas e edicao de desconto" | kind=Commit | source=git | neighbors=[main, 8bcab6d merge: resolve merge conflicts, index.js, main.js, seed-demo.mjs, server.js] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@4918dfb1adc33da3235efad6c9227e5ffb2553b8": "4918dfb style(ops-web): altera paleta de cores para Dark Brown Pos Ui" | kind=Commit | source=git | neighbors=[chore/dark-brown-ui, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd, fix/auth-queue-layout, main] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@79c5964e0320e4e36eafa64d618825310871107a": "79c5964 feat(orders): vincular pedido existente a comanda" | kind=Commit | source=git | neighbors=[01b42c9 feat(ops-web): adicionar manute…, main, f3fc468 feat(ops-web): atribuir pedido …, db.js, order-tab-assignment.js, server.js] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@87b872cda29f98a60896344a3f974ad461efbbde": "87b872c feat(domain): congelar classificação operacional dos itens" | kind=Commit | source=git | neighbors=[03f8302 docs(operations): definir catál…, main, b5e40c6 feat(api): persistir e administ…, catalog.js, index.js, order-ingestion.js] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@98ec659f7044baa45aac5c3f4123e108111d9dee": "98ec659 fix(api): impedir seed destrutivo no boot" | kind=Commit | source=git | neighbors=[main, 152ed2f docs(seed): documentar operação…, seed-demo.mjs, config.js, server.js, seed-demo-postgres.test.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@9a3ea80bd160f2785fedab6f889ef346f266f372": "9a3ea80 Merge pull request #14 from feature/menu-tabs" | kind=Commit | source=git | neighbors=[codex/unificacao-lgpd-visual, feature/security-lgpd, main, 24da310 Merge pull request #15 from fea…, 6ab3261 feat(api): implementa lgpd e se…, main.js] | lang=en
- "integrations_polling_runner": "polling-runner.js" | kind=code-symbol | source=apps/api/src/integrations/polling-runner.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, 0bd5e05 fix: resolve circular dependenc…, 1728360 Merge pull request #1 from fix/…, 181d2eb feat: Entrega 3 - Delivery Much, 3487db7 feat: refatoracao completa UI, …, 4582cbb feat: Entrega 4 - iFood] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@24da310abcb5207de3b7d8430e77eaedc83585a6": "24da310 Merge pull request #15 from feature/security-lgpd" | kind=Commit | source=git | neighbors=[codex/unificacao-lgpd-visual, main, ea7238b fix(ops-web): remove Object.gro…, db.js, server.js, 6ab3261 feat(api): implementa lgpd e se…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@6ab3261c72432b0e5cabff5449e0479ebba691e3": "6ab3261 feat(api): implementa lgpd e seguranca (helmet/rate-limit) - adiciona r…" | kind=Commit | source=git | neighbors=[codex/unificacao-lgpd-visual, feature/security-lgpd, main, 24da310 Merge pull request #15 from fea…, db.js, server.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@a655d4755e409453111f0e2c8c2d050a820e40ef": "a655d47 feat(ops-web): refatora interface do cardapio para usar abas e modal de…" | kind=Commit | source=git | neighbors=[codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd, main, 9a3ea80 Merge pull request #14 from fea…, main.js] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@d224595f040619822b188652841dba18f3c8609d": "d224595 fix(ops-web): resolve conflito de layout colocando painel de integracoe…" | kind=Commit | source=git | neighbors=[09e6cee Merge pull request #12 from cho…, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd, fix/auth-queue-layout, main] | lang=nl
- "integrations_integration_routes": "integration-routes.js" | kind=code-symbol | source=apps/api/src/integrations/integration-routes.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, 3487db7 feat: refatoracao completa UI, …, e0362f4 feat: Entrega 2 - Ingestao Segu…, getOrderWithMapping(), integrationRoutes(), createOrderAction()] | lang=en
- "scripts_seed_demo_runseeddemo": "runSeedDemo()" | kind=code-symbol | source=scripts/seed-demo.mjs:L224 | neighbors=[seed-demo.mjs, DemoSeedRefusal, isSanitizedTarget(), server.js, seed-demo-postgres.test.js, seed-demo-safety.test.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@dd5fca605f1b0f213ad856fa47328cd286f81a39": "dd5fca6 feat(ops-web): implementa novo fluxo de pedido via modais de catalogo e…" | kind=Commit | source=git | neighbors=[60a3a7e fix(ops-web): force cache bust …, codex/unificacao-lgpd-visual, main, 3487db7 feat: refatoracao completa UI, …, 8bcab6d merge: resolve merge conflicts, main.js] | lang=nl
- "domain_index_createorder": "createOrder()" | kind=code-symbol | source=packages/domain/index.js:L57 | neighbors=[index.js, createCancellationOrder(), calculateOrderTotal(), normalizeDiscountPercent(), domain.test.js, finance.test.js] | lang=en
- "ops_web_main_calculateorderpreviewtotal": "calculateOrderPreviewTotal()" | kind=code-symbol | source=apps/ops-web/main.js:L187 | neighbors=[main.js, validDiscountPercent(), renderActiveTab(), renderOrderItems(), syncCashChange(), ops-web.test.js] | lang=en
- "ops_web_main_renderorderitems": "renderOrderItems()" | kind=code-symbol | source=apps/ops-web/main.js:L419 | neighbors=[main.js, refreshAll(), calculateOrderPreviewTotal(), money(), renderActiveTab(), syncCashChange()] | lang=en
- "src_order_tab_assignment": "order-tab-assignment.js" | kind=code-symbol | source=apps/api/src/order-tab-assignment.js:L1 | neighbors=[79c5964 feat(orders): vincular pedido e…, clean(), ELIGIBLE_STATUSES, normalizeTabAssignmentPayload(), sameTabAssignment(), tabAssignmentEligibility()] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@4e6bbe45ec8ed5cc039c4ef61b85ee450042f132": "4e6bbe4 feat(render): adicionar inicializacao automatica de dados demo no boot …" | kind=Commit | source=git | neighbors=[main, aac6e03 Add root health GET and HEAD en…, seed-demo.mjs, server.js, f5d44ad fix(render): corrigir chave do …] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@5c45a5cb275c5d9b7ada60db5d6851e50bdb3aad": "5c45a5c feat(ops-web): abrir modal de novo pedido associado a comanda criada se…" | kind=Commit | source=git | neighbors=[1f99625 feat(ops-web): exibir estoque d…, main, 075c321 Audita demo e endurece operacao, main.js, ops-web.test.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@ea7238b8f488234bbe5bb6e85b3163c6fa077e00": "ea7238b fix(ops-web): remove Object.groupBy para compatibilidade com navegadore…" | kind=Commit | source=git | neighbors=[24da310 Merge pull request #15 from fea…, codex/unificacao-lgpd-visual, main, 60a3a7e fix(ops-web): force cache bust …, main.js] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@eef1d5a0216c37edc51a81d50ecd0154fe4627c2": "eef1d5a fix(integrations): tornar eventos diretos idempotentes" | kind=Commit | source=git | neighbors=[e0a6d46 fix(integrations): classificar …, main, a045fac docs(spec): impedir auto-seed d…, order-actions.js, integrations.test.js] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@f3fc468aaeb691ca6e7038092385e14991d13afb": "f3fc468 feat(ops-web): atribuir pedido em andamento" | kind=Commit | source=git | neighbors=[79c5964 feat(orders): vincular pedido e…, main, 9dbb57a test(release): consolidar regre…, main.js, ops-web.test.js] | lang=pt
- "integrations_integration_repository_columnfor": "columnFor()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L35 | neighbors=[integration-repository.js, updateChannelCommand(), updateChannelEvent(), updateChannelMapping(), updateOwnedChannelCommand()] | lang=en
- "integrations_integration_repository_getorderwithmapping": "getOrderWithMapping()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L267 | neighbors=[integration-repository.js, integration-routes.js, order-actions.js, deliverymuch.js, ifood.js] | lang=en
- "integrations_integration_repository_updatechannelmapping": "updateChannelMapping()" | kind=code-symbol | source=apps/api/src/integrations/integration-repository.js:L69 | neighbors=[integration-repository.js, columnFor(), order-actions.js, deliverymuch.js, ifood.js] | lang=en
- "ops_web_main_api": "api()" | kind=code-symbol | source=apps/ops-web/main.js:L841 | neighbors=[main.js, showLoginDialog(), catalogAdminApi(), chooseCancellationReason(), refreshAll()] | lang=en

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-002.json

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
