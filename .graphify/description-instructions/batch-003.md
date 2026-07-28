# Node Description Batch 4 of 14

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

- "commit:repo:github.com/millennium42/camoburguer-demo@5c45a5cb275c5d9b7ada60db5d6851e50bdb3aad": "5c45a5c feat(ops-web): abrir modal de novo pedido associado a comanda criada se…" | kind=Commit | source=git | neighbors=[1f99625 feat(ops-web): exibir estoque d…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 075c321 Audita demo e endurece operacao, main.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@ea7238b8f488234bbe5bb6e85b3163c6fa077e00": "ea7238b fix(ops-web): remove Object.groupBy para compatibilidade com navegadore…" | kind=Commit | source=git | neighbors=[24da310 Merge pull request #15 from fea…, codex/unificacao-lgpd-visual, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 60a3a7e fix(ops-web): force cache bust …] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@eef1d5a0216c37edc51a81d50ecd0154fe4627c2": "eef1d5a fix(integrations): tornar eventos diretos idempotentes" | kind=Commit | source=git | neighbors=[e0a6d46 fix(integrations): classificar …, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, a045fac docs(spec): impedir auto-seed d…, order-actions.js] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@f3fc468aaeb691ca6e7038092385e14991d13afb": "f3fc468 feat(ops-web): atribuir pedido em andamento" | kind=Commit | source=git | neighbors=[79c5964 feat(orders): vincular pedido e…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 9dbb57a test(release): consolidar regre…, main.js] | lang=pt
- "scripts_seed_demo_runseeddemo": "runSeedDemo()" | kind=code-symbol | source=scripts/seed-demo.mjs:L224 | neighbors=[seed-demo.mjs, DemoSeedRefusal, isSanitizedTarget(), server.js, seed-demo-postgres.test.js, seed-demo-safety.test.js] | lang=en
- "tests_print_queue_test": "print-queue.test.js" | kind=code-symbol | source=tests/print-queue.test.js:L1 | neighbors=[e0f5e6f New Commit, assertBridgeStatus(), assertPrintPayloadSize(), classifyPrintFailure(), printBackoffMs(), printPayloadBytes()] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@199ab9ba3c12e24e738e3ae2d877434197528941": "199ab9b chore(ops-web): remover botao lancar itens dos cards de comandas" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, b5581df feat(ops-web): substituir card …, main.js, 38cc0d0 feat(ops-web): adicionar calcul…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@1f9962581e205d43e693ed5f9b7222e3316c5120": "1f99625 feat(ops-web): exibir estoque de paes no painel operacional e atualizar…" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 5c45a5c feat(ops-web): abrir modal de n…, main.js, b5581df feat(ops-web): substituir card …] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@344d87e2f40bf5d06d4cdc1d8ee778c63f2f6aac": "344d87e fix(ops-web): correcao de renderizacao em tempo real de itens de comand…" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 5276954 docs: unificar documentacao cen…, main.js, 6661297 fix(api): aumentar rate limit p…] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@38cc0d064e97ba836cc56bf3a0279db5681efae2": "38cc0d0 feat(ops-web): adicionar calculo de troco para parcelas de pagamento de…" | kind=Commit | source=git | neighbors=[1bd28c8 fix(ops-web): ajustar layout re…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 199ab9b chore(ops-web): remover botao l…, main.js] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@3fb67d4a7f451127a7b9fcbf5fed8f98360eaa20": "3fb67d4 fix: point ops-web apiBase to camoburguer-api subdomain on Render" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 1bb0752 docs: atualizar documentacao co…, main.js, 9aae1fb Fix API base URL for Render dep…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@60a3a7eca068bcad40896741f25f2a54e25dfb4b": "60a3a7e fix(ops-web): force cache bust of main.js" | kind=Commit | source=git | neighbors=[codex/unificacao-lgpd-visual, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, dd5fca6 feat(ops-web): implementa novo …, ea7238b fix(ops-web): remove Object.gro…] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@61ee2f5526119956891a4fa400a424cded0ec1e3": "61ee2f5 feat(ops-web): ordenacao de pedidos ativos em cima e finalizados ao fun…" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 6661297 fix(api): aumentar rate limit p…, main.js, 8bcab6d merge: resolve merge conflicts] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@66612970daa632117176be7a4e33659fe429d3c9": "6661297 fix(api): aumentar rate limit para 1000 req/min no modo demo" | kind=Commit | source=git | neighbors=[61ee2f5 feat(ops-web): ordenacao de ped…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 344d87e fix(ops-web): correcao de rende…, server.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@69c446f0bcb8aeaa0bcfe84f8eba44beca82adc8": "69c446f feat(ops-web): permitir vincular e criar comanda/mesa no formulario de …" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, a6bb648 feat(ops-web): adicionar calcul…, main.js, 8a1a7c1 feat(ops-web): embarcar formula…] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@6e6b2d9bde58b919313ad0039a8a972a7f381ada": "6e6b2d9 feat(ops-web): redesenhar interface com tema POS escuro e modais de acao" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, e172bfe feat(ops-web): embarcar formula…, main.js, ccc816f chore(graphify): atualizar graf…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@8a1a7c11e8abd9999cf63cddd1a0fc09e78407f7": "8a1a7c1 feat(ops-web): embarcar formulario de novo pedido em modal popup" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 69c446f feat(ops-web): permitir vincula…, main.js, e172bfe feat(ops-web): embarcar formula…] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@9aae1fb0f3d8cfafe0fa23db0fee345396b5cea4": "9aae1fb Fix API base URL for Render deployment" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 3fb67d4 fix: point ops-web apiBase to c…, main.js, bee1646 Remove duplicate HEAD route for…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@a6bb648edf01e52ab5b9c4e150d27781279e1051": "a6bb648 feat(ops-web): adicionar calculo automatico de troco para pagamento em …" | kind=Commit | source=git | neighbors=[69c446f feat(ops-web): permitir vincula…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 1bd28c8 fix(ops-web): ajustar layout re…, main.js] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@aac6e038cc493d0fc79c093d9f92ff0160b99de7": "aac6e03 Add root health GET and HEAD endpoints" | kind=Commit | source=git | neighbors=[4e6bbe4 feat(render): adicionar inicial…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, bee1646 Remove duplicate HEAD route for…, server.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@b5581df309faad11522197c75f073537cc575460": "b5581df feat(ops-web): substituir card de novo pedido na aba pedidos por resumo…" | kind=Commit | source=git | neighbors=[199ab9b chore(ops-web): remover botao l…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 1f99625 feat(ops-web): exibir estoque d…, main.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@bee1646caf6a74bf1459c4bfe561713ba713de6d": "bee1646 Remove duplicate HEAD route for '/'" | kind=Commit | source=git | neighbors=[aac6e03 Add root health GET and HEAD en…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 9aae1fb Fix API base URL for Render dep…, server.js] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@e172bfe233b5f8695e977e1a17a68d73d2fbd270": "e172bfe feat(ops-web): embarcar formularios diretamente nos modais de comanda e…" | kind=Commit | source=git | neighbors=[6e6b2d9 feat(ops-web): redesenhar inter…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 8a1a7c1 feat(ops-web): embarcar formula…, main.js] | lang=nl
- "domain_index_createorder": "createOrder()" | kind=code-symbol | source=packages/domain/index.js:L57 | neighbors=[index.js, createCancellationOrder(), calculateOrderTotal(), normalizeDiscountPercent(), domain.test.js, finance.test.js] | lang=en
- "ops_web_main_calculateorderpreviewtotal": "calculateOrderPreviewTotal()" | kind=code-symbol | source=apps/ops-web/main.js:L187 | neighbors=[main.js, validDiscountPercent(), renderActiveTab(), renderOrderItems(), syncCashChange(), ops-web.test.js] | lang=en
- "ops_web_main_renderorderitems": "renderOrderItems()" | kind=code-symbol | source=apps/ops-web/main.js:L419 | neighbors=[main.js, refreshAll(), calculateOrderPreviewTotal(), money(), renderActiveTab(), syncCashChange()] | lang=en
- "src_idempotency_fingerprint": "fingerprint()" | kind=code-symbol | source=apps/api/src/idempotency.js:L56 | neighbors=[order-actions.js, deliverymuch.js, idempotency.js, canonicalJson(), server.js, idempotency.test.js] | lang=en
- "src_idempotency_moneycents": "moneyCents()" | kind=code-symbol | source=apps/api/src/idempotency.js:L25 | neighbors=[idempotency.js, canonicalAddon(), canonicalItem(), decimalUnits(), server.js, idempotency.test.js] | lang=en
- "src_order_tab_assignment": "order-tab-assignment.js" | kind=code-symbol | source=apps/api/src/order-tab-assignment.js:L1 | neighbors=[79c5964 feat(orders): vincular pedido e…, clean(), ELIGIBLE_STATUSES, normalizeTabAssignmentPayload(), sameTabAssignment(), tabAssignmentEligibility()] | lang=en
- "tests_idempotency_test": "idempotency.test.js" | kind=code-symbol | source=tests/idempotency.test.js:L1 | neighbors=[e0f5e6f New Commit, cancellationFingerprintPayload(), canonicalJson(), fingerprint(), moneyCents(), orderFingerprintPayload()] | lang=en
- "tests_simulator_test": "simulator.test.js" | kind=code-symbol | source=tests/simulator.test.js:L1 | neighbors=[e0f5e6f New Commit, demo-simulator-client.mjs, assertSafeSimulationBaseUrl(), runSimulation(), happyApi(), json()] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@03f8302df65d38210d0d82c255ed0ccb20fce5c0": "03f8302 docs(operations): definir catálogo, entrega direta e vínculo tardio" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 87b872c feat(domain): congelar classifi…, 075c321 Audita demo e endurece operacao] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@0ee55180db949258b3da1ac3681fb07b1c61c60c": "0ee5518 fix(auth): impedir escalada de privilegio da cozinha" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, auth.js, server.js, auth.test.js, e0f5e6f New Commit] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@152ed2f4068ad65e35a8dd2cd5a66d4c080de3d1": "152ed2f docs(seed): documentar operação explícita e rollback" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 176899c fix(docker): resolver domínio n…, 98ec659 fix(api): impedir seed destruti…] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@1bb0752734a1717f23176d1b61d933ed7ac3146c": "1bb0752 docs: atualizar documentacao completa, README, 5W2H (PRs 13-18), guia d…" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, ccc816f chore(graphify): atualizar graf…, 3fb67d4 fix: point ops-web apiBase to c…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@1bd28c844f1a7636e83333ed0ad3bf8a49519b89": "1bd28c8 fix(ops-web): ajustar layout responsivo e largura das linhas do carrinh…" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 38cc0d0 feat(ops-web): adicionar calcul…, a6bb648 feat(ops-web): adicionar calcul…] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@52769546694d0f2fe9ded35f5bf56b3b10c11a23": "5276954 docs: unificar documentacao central e criar blueprint de deploy no Rend…" | kind=Commit | source=git | neighbors=[344d87e fix(ops-web): correcao de rende…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, f5d44ad fix(render): corrigir chave do …] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@9dbb57a2b9adb6909498c8bbf8e30324a9779bb3": "9dbb57a test(release): consolidar regressões e mapa do projeto" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 0009eb5 fix(release): alinhar cancelame…, f3fc468 feat(ops-web): atribuir pedido …] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@a045facc63ed90cdaacd573442b597ef7bf073bb": "a045fac docs(spec): impedir auto-seed destrutivo" | kind=Commit | source=git | neighbors=[fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, f3191d3 fix(render): desativar auto-see…, eef1d5a fix(integrations): tornar event…] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@ccc816fa058054a98296168dea607f3add4d8d3d": "ccc816f chore(graphify): atualizar grafo de conhecimento e script WSL após atua…" | kind=Commit | source=git | neighbors=[1bb0752 docs: atualizar documentacao co…, fix/c01-rbac-cozinha, fix/h01-orders-dto-estrutural, main, 6e6b2d9 feat(ops-web): redesenhar inter…] | lang=en

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
