# Camoburguer Demo - AGENTS

## Operating Doctrine

- Use `Ponytail full` by default. Prefer the shortest working path, native platform features and the fewest moving parts possible.
- Prefix every shell command with `rtk`. Use `rtk proxy` only when the wrapped command is timing out or needs raw output.
- Use `m1nd` as the first structural orientation layer before broad grep, globbing or speculative file reads whenever the task is not trivial.
- Treat `Graphify` as the persistent project map. Build it early, query it before wide navigation, and keep it fresh after meaningful changes.

## Speeds

- Light mode: trivial local tasks can use `rtk` + `Ponytail` without extra ritual.
- Structural mode: architecture, domain, review, printing, finance, integration or risky edits must use `rtk` + `m1nd` + `Graphify` + `Ponytail`.

## Graphify

This project keeps a knowledge graph in `graphify-out/`.

Rules:

- If `graphify-out/graph.json` exists and the question is about architecture, relationships, file ownership, data flow or where something lives, run `rtk graphify query "<question>"` first.
- Use `rtk graphify path "<A>" "<B>"` to understand dependencies or bridges between concepts.
- Use `rtk graphify explain "<concept>"` for focused concept refreshes.
- Read `graphify-out/wiki/index.md` for broad navigation when it exists.
- Read `graphify-out/GRAPH_REPORT.md` only for broader architecture review or when query/path/explain are not enough.
- After changing code or core docs, run `rtk graphify update .`. If the graph does not exist yet, create it with `rtk graphify extract . --out .`.

## Implementation Boundaries

- Keep a single operational core for orders. Channel-specific behavior belongs in adapters or scenario rules, never inside the operator UI.
- Keep the kitchen ticket contract stable. If the ticket format changes, update `docs/padrao-ticket-cozinha.md` first and then the implementation.
- Keep finance gerencial in v1. Do not introduce fiscal-heavy logic, CMV by recipe or bespoke client customizations unless explicitly requested.
- Prefer static docs and simple data contracts over speculative abstractions.

## Required Seed Artifacts

The repository is expected to maintain at least:

- `docs/contexto-operacional.md`
- `docs/canais-e-captura.md`
- `docs/ciclo-do-pedido.md`
- `docs/ciclo-financeiro.md`
- `docs/padrao-ticket-cozinha.md`
- `docs/automacoes-por-cenario.md`
- `docs/arquitetura-do-sistema.md`
- `SUBAGENTES.md`
- `skills/`
- `workflows/`

## Review Standard

- Report what was proved directly versus what was inferred from docs or graph output.
- Before risky edits, inspect blast radius with `m1nd` or `graphify`.
- When a simpler alternative exists and still satisfies the requirement, take it.
