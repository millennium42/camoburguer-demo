# Node Description Batch 2 of 12

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

- "commit:repo:github.com/millennium42/camoburguer-demo@544287bc48c691dbe1102ea7bdc93a700c41d91c": "544287b Merge pull request #2 from feat/demo-simulator" | kind=Commit | source=git | neighbors=[1728360 Merge pull request #1 from fix/…, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@82019fcd8c62ee5a3a3dc443cf12acea562de5fd": "82019fc feat: expor retirada e filtros financeiros coerentes" | kind=Commit | source=git | neighbors=[38b122a feat: permitir pagamentos múlti…, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo] | lang=en
- "providers_deliverymuch": "deliverymuch.js" | kind=code-symbol | source=apps/api/src/integrations/providers/deliverymuch.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, 0bd5e05 fix: resolve circular dependenc…, 1728360 Merge pull request #1 from fix/…, 181d2eb feat: Entrega 3 - Delivery Much, 3487db7 feat: refatoracao completa UI, …, e0a6d46 fix(integrations): classificar …] | lang=en
- "src_db": "db.js" | kind=code-symbol | source=apps/api/src/db.js:L1 | neighbors=[02492d9 feat: Entrega 1 - Contrato e Pe…, 075c321 Audita demo e endurece operacao, 24da310 Merge pull request #15 from fea…, 3487db7 feat: refatoracao completa UI, …, 38b122a feat: permitir pagamentos múlti…, 3d1125d feat: separar rodadas e tickets…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@1da343b107b2cd8484471cbb710e4b5b5ec15797": "1da343b feat: Entrega 5 - UI Premium e Fila de Autorizacao" | kind=Commit | source=git | neighbors=[chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo, feat/demo-simulator] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@4582cbbd48b5e0271dc065ed18641bb87c05ebdc": "4582cbb feat: Entrega 4 - iFood" | kind=Commit | source=git | neighbors=[181d2eb feat: Entrega 3 - Delivery Much, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@6186a900496a97b67b411e351a3298f8f2655c8b": "6186a90 feat: add simulate-order script and fix seed data" | kind=Commit | source=git | neighbors=[1728360 Merge pull request #1 from fix/…, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@bf49c376c4d8d117132a4825f70149927f036c9e": "bf49c37 chore: Adiciona script seed-demo para facilitar apresentacoes" | kind=Commit | source=git | neighbors=[1da343b feat: Entrega 5 - UI Premium e …, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo] | lang=en
- "branch:repo:github.com/millennium42/camoburguer-demo#fix/integration-boot": "fix/integration-boot" | kind=Branch | source=git | neighbors=[02492d9 feat: Entrega 1 - Contrato e Pe…, 0bd5e05 fix: resolve circular dependenc…, 181d2eb feat: Entrega 3 - Delivery Much, 1da343b feat: Entrega 5 - UI Premium e …, 38b122a feat: permitir pagamentos múlti…, 3d1125d feat: separar rodadas e tickets…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@b901fd4c8ca5bd7daf5b56086c197d364a1ee4bd": "b901fd4 chore: consolidar QA, documentação e release operacional" | kind=Commit | source=git | neighbors=[82019fc feat: expor retirada e filtros …, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo] | lang=pt
- "tests_domain_test": "domain.test.js" | kind=code-symbol | source=tests/domain.test.js:L1 | neighbors=[0009eb5 fix(release): alinhar cancelame…, 075c321 Audita demo e endurece operacao, 3487db7 feat: refatoracao completa UI, …, 3d1125d feat: separar rodadas e tickets…, 558ac72 feat: adicionar comandas livres…, 5b00ef8 feat: adicionar adicionais conf…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@00c09768d14dabaa6f40970c127927dc5a654b21": "00c0976 Merge pull request #3 from feat/ui-redesign" | kind=Commit | source=git | neighbors=[chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo, feat/print-cash-shifts] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@4be95944e339c32cf6ecf86db4bc5074866b80d2": "4be9594 docs: instituir guia de desenvolvimento e registro 5W2H" | kind=Commit | source=git | neighbors=[chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo, feat/demo-simulator] | lang=nl
- "commit:repo:github.com/millennium42/camoburguer-demo@83a137a462198c7a6547182bc8c77e51158ef181": "83a137a docs: Entrega 0 - Proposta de Venda e Deploy" | kind=Commit | source=git | neighbors=[chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo, feat/demo-simulator] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@3dd601b11d2d518126ff539bcbf5625372b6399b": "3dd601b chore: inicializar repositório Camoburguer Demo" | kind=Commit | source=git | neighbors=[chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo, feat/demo-simulator] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@5e26b9e4429509c5f9d8da9ff8916b53498c87de": "5e26b9e feat: redesign da aba de pedidos com cores marrom/preto e ícones" | kind=Commit | source=git | neighbors=[544287b Merge pull request #2 from feat…, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@a9fee291048cc799621a05015c78f9c1ec674e90": "a9fee29 Merge pull request #4 from feat/client-side-print-demo" | kind=Commit | source=git | neighbors=[00c0976 Merge pull request #3 from feat…, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/print-cash-shifts] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@f2dc9b611cbcc2e9893517a906e3ade78969f413": "f2dc9b6 Merge pull request #5 from feat/print-cash-shifts" | kind=Commit | source=git | neighbors=[a9fee29 Merge pull request #4 from feat…, e7fd889 feat: impressao de fechamento d…, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@fd185782faf7bcd7eba76fb91280bfcef48a9736": "fd18578 feat: mock print-bridge no frontend para demonstracao via window.print()" | kind=Commit | source=git | neighbors=[00c0976 Merge pull request #3 from feat…, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/client-side-print-demo] | lang=en
- "finance_core_index": "index.js" | kind=code-symbol | source=packages/finance-core/index.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, 3487db7 feat: refatoracao completa UI, …, 384a10f feat(ops-web): fluxo continuo d…, 38b122a feat: permitir pagamentos múlti…, 8bcab6d merge: resolve merge conflicts, bdd41dd feat: entregar demo operacional…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@32ed129585d0d3543f8e6ca654bb89f10a7da9e3": "32ed129 Merge pull request #6 from fix/tests" | kind=Commit | source=git | neighbors=[chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@e7fd889e523892007538aef0dd4785192a30f41d": "e7fd889 feat: impressao de fechamento de caixa detalhado e resumido no frontend" | kind=Commit | source=git | neighbors=[a9fee29 Merge pull request #4 from feat…, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feat/print-cash-shifts] | lang=nl
- "integrations_order_actions": "order-actions.js" | kind=code-symbol | source=apps/api/src/integrations/order-actions.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, 0bd5e05 fix: resolve circular dependenc…, 1728360 Merge pull request #1 from fix/…, 3487db7 feat: refatoracao completa UI, …, b5e40c6 feat(api): persistir e administ…, e0362f4 feat: Entrega 2 - Ingestao Segu…] | lang=en
- "tests_finance_test": "finance.test.js" | kind=code-symbol | source=tests/finance.test.js:L1 | neighbors=[3487db7 feat: refatoracao completa UI, …, 38b122a feat: permitir pagamentos múlti…, 87b872c feat(domain): congelar classifi…, 9174d61 feat: implementar descontos per…, bdd41dd feat: entregar demo operacional…, createCashShift()] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@6dab198552544b2af2f541949cf2bb1549330d5a": "6dab198 Merge pull request #7 from fix/ui-bugs" | kind=Commit | source=git | neighbors=[32ed129 Merge pull request #6 from fix/…, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feature/menu-tabs] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@e5d1e2089cb3b40cab7173ec9887a970f0ef9cfc": "e5d1e20 test: atualiza assercoes do teste para contemplar emojis da UI" | kind=Commit | source=git | neighbors=[chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@702249fdad75bc5c4aeb2ef146eeb430233fc323": "702249f fix: botoes de aceite de integracao e responsividade dos grids em linha" | kind=Commit | source=git | neighbors=[32ed129 Merge pull request #6 from fix/…, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feature/menu-tabs] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@ea7574fd1653b4d44de59b964f2dfccee136d469": "ea7574f Merge pull request #8 from fix/print-and-olaclick" | kind=Commit | source=git | neighbors=[2862510 fix: adiciona endereco de entre…, 6dab198 Merge pull request #7 from fix/…, chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual] | lang=en
- "ops_web_main_refreshall": "refreshAll()" | kind=code-symbol | source=apps/ops-web/main.js:L1038 | neighbors=[main.js, api(), reconcileCartItems(), renderCatalog(), renderEntries(), renderFinanceSummary()] | lang=en
- "shared_types_index": "index.js" | kind=code-symbol | source=packages/shared-types/index.js:L1 | neighbors=[02492d9 feat: Entrega 1 - Contrato e Pe…, 3487db7 feat: refatoracao completa UI, …, bdd41dd feat: entregar demo operacional…, assertEnum(), COMMAND_STATUSES, FINANCE_ENTRY_TYPES] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@28625107608d11f14a111ca06ef8ffa21016533b": "2862510 fix: adiciona endereco de entrega na comanda impressa e fonte OlaClick …" | kind=Commit | source=git | neighbors=[chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd] | lang=nl
- "tests_integrations_test": "integrations.test.js" | kind=code-symbol | source=tests/integrations.test.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, e0a6d46 fix(integrations): classificar …, eef1d5a fix(integrations): tornar event…, applyIntegratedTransition(), createOrderAction(), ingestExternalOrder()] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@ca242eb196481eeb2e2208bca900426323496cf4": "ca242eb Merge pull request #9 from chore/docs-update" | kind=Commit | source=git | neighbors=[032525a docs: atualiza documentacao com…, chore/add-roadmap-fase2, chore/dark-brown-ui, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd] | lang=en
- "src_config": "config.js" | kind=code-symbol | source=apps/api/src/config.js:L1 | neighbors=[02492d9 feat: Entrega 1 - Contrato e Pe…, 075c321 Audita demo e endurece operacao, 3487db7 feat: refatoracao completa UI, …, 98ec659 fix(api): impedir seed destruti…, bdd41dd feat: entregar demo operacional…, appEnvironment] | lang=en
- "tests_seed_demo_safety_test": "seed-demo-safety.test.js" | kind=code-symbol | source=tests/seed-demo-safety.test.js:L1 | neighbors=[176899c fix(docker): resolver domínio n…, 98ec659 fix(api): impedir seed destruti…, seed-demo.mjs, DemoSeedRefusal, PROTECTED_TABLES, requestDemoSeed()] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@032525ac1e15a4d083e5b5cbb22c76ff0f2fde86": "032525a docs: atualiza documentacao com entregas 10, 11 e 12 da integracao, pri…" | kind=Commit | source=git | neighbors=[chore/add-roadmap-fase2, chore/dark-brown-ui, chore/docs-update, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd] | lang=pt
- "commit:repo:github.com/millennium42/camoburguer-demo@5af8e52d1ddb03c8d4d2cf6123161d2e0b0cdbc7": "5af8e52 Merge pull request #11 from fix/print-shift-undefined" | kind=Commit | source=git | neighbors=[2b193e2 fix(ops-web): ajusta variaveis …, chore/dark-brown-ui, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd, fix/auth-queue-layout] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@6b53e060bacfb96626f2a17d3845f6603cf65ccf": "6b53e06 Merge pull request #10 from chore/add-roadmap-fase2" | kind=Commit | source=git | neighbors=[chore/dark-brown-ui, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd, fix/auth-queue-layout, fix/print-shift-undefined] | lang=en
- "integrations_order_ingestion": "order-ingestion.js" | kind=code-symbol | source=apps/api/src/integrations/order-ingestion.js:L1 | neighbors=[075c321 Audita demo e endurece operacao, 0bd5e05 fix: resolve circular dependenc…, 1728360 Merge pull request #1 from fix/…, 3487db7 feat: refatoracao completa UI, …, 87b872c feat(domain): congelar classifi…, e0362f4 feat: Entrega 2 - Ingestao Segu…] | lang=en
- "commit:repo:github.com/millennium42/camoburguer-demo@2b193e2bc66fb7382be404011fd791db64cd9a97": "2b193e2 fix(ops-web): ajusta variaveis de relatorio de caixa na impressao clien…" | kind=Commit | source=git | neighbors=[chore/dark-brown-ui, codex/unificacao-lgpd-visual, feature/menu-tabs, feature/security-lgpd, fix/auth-queue-layout, fix/print-shift-undefined] | lang=nl

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-001.json

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
