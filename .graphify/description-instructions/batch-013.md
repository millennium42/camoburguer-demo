# Node Description Batch 14 of 14

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

- "tests_seed_demo_postgres_test_snapshot": "snapshot()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L114 | neighbors=[seed-demo-postgres.test.js]
- "tests_seed_demo_postgres_test_validoptions": "validOptions()" | kind=code-symbol | source=tests/seed-demo-postgres.test.js:L323 | neighbors=[seed-demo-postgres.test.js]
- "tests_seed_demo_safety_test_catalogrows": "catalogRows()" | kind=code-symbol | source=tests/seed-demo-safety.test.js:L20 | neighbors=[seed-demo-safety.test.js]
- "tests_seed_demo_safety_test_fakedb": "fakeDb()" | kind=code-symbol | source=tests/seed-demo-safety.test.js:L37 | neighbors=[seed-demo-safety.test.js]
- "tests_seed_demo_safety_test_operational_tables": "OPERATIONAL_TABLES" | kind=code-symbol | source=tests/seed-demo-safety.test.js:L16 | neighbors=[seed-demo-safety.test.js]
- "tests_seed_demo_safety_test_validoptions": "validOptions()" | kind=code-symbol | source=tests/seed-demo-safety.test.js:L81 | neighbors=[seed-demo-safety.test.js]
- "tests_simulator_test_happyapi": "happyApi()" | kind=code-symbol | source=tests/simulator.test.js:L16 | neighbors=[simulator.test.js]
- "tests_simulator_test_json": "json()" | kind=code-symbol | source=tests/simulator.test.js:L9 | neighbors=[simulator.test.js]
- "tests_smoke_authheaders": "authHeaders" | kind=code-symbol | source=tests/smoke.mjs:L9 | neighbors=[smoke.mjs]
- "tests_smoke_bridgepayload": "bridgePayload" | kind=code-symbol | source=tests/smoke.mjs:L957 | neighbors=[smoke.mjs]
- "tests_smoke_catalogdrink": "catalogDrink" | kind=code-symbol | source=tests/smoke.mjs:L192 | neighbors=[smoke.mjs]
- "tests_smoke_cookies": "cookies" | kind=code-symbol | source=tests/smoke.mjs:L83 | neighbors=[smoke.mjs]
- "tests_smoke_currentshift": "currentShift" | kind=code-symbol | source=tests/smoke.mjs:L939 | neighbors=[smoke.mjs]
- "tests_smoke_database": "database" | kind=code-symbol | source=tests/smoke.mjs:L199 | neighbors=[smoke.mjs]
- "tests_smoke_observeorderevents": "observeOrderEvents()" | kind=code-symbol | source=tests/smoke.mjs:L36 | neighbors=[smoke.mjs]
- "tests_smoke_orders": "orders" | kind=code-symbol | source=tests/smoke.mjs:L874 | neighbors=[smoke.mjs]
- "tests_smoke_originalordersnapshot": "originalOrderSnapshot" | kind=code-symbol | source=tests/smoke.mjs:L239 | neighbors=[smoke.mjs]
- "tests_smoke_previousopenshift": "previousOpenShift" | kind=code-symbol | source=tests/smoke.mjs:L648 | neighbors=[smoke.mjs]
- "tests_smoke_runid": "runId" | kind=code-symbol | source=tests/smoke.mjs:L10 | neighbors=[smoke.mjs]
- "tests_smoke_seededdrink": "seededDrink" | kind=code-symbol | source=tests/smoke.mjs:L175 | neighbors=[smoke.mjs]
- "tests_smoke_stockmovementsbeforeassignment": "stockMovementsBeforeAssignment" | kind=code-symbol | source=tests/smoke.mjs:L249 | neighbors=[smoke.mjs]
- "tests_sse_auth_test_fakereply": "fakeReply()" | kind=code-symbol | source=tests/sse-auth.test.js:L6 | neighbors=[sse-auth.test.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\milla\Documents\Projetos\Git\camoburguer-demo\.graphify\description-instructions\batch-013.json

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
