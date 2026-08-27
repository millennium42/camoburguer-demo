---
tags: [governanca, agentes]
---

# Camoburguer Demo — AGENTS

> Doutrina operacional para agentes de IA atuando neste repositório.
> Estabelece o padrão de uso de ferramentas (Ponytail, m1nd, Graphify),
> limites arquiteturais e artefatos obrigatórios. Leia antes de propor
> qualquer plano de execução estrutural.

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

## Ver também

[00-mapa-do-projeto.md](00-mapa-do-projeto.md) ·
[docs/guia-de-desenvolvimento.md](docs/guia-de-desenvolvimento.md)

## Política explícita do Bloco 2

> completar Bloco 2 + commits granulares + push + handoff + CI REMOTO VERDE.

Registrar e seguir workflow multiagente, diferentes modelos/esforços, um
microproblema por vez, implementação → review extensa proporcional ao risco →
red/green. Usar Luna/low para docs/triagem, Luna/medium para mudança
delimitada, Terra/high para review de dados/segurança e Sol/high somente como
escalada bloqueante. Reusar agentes/contexto, cápsulas concisas, sem
repetições; preservar IDs/status/evidências para continuar os mesmos
subagentes após interrupção/compactação quando a plataforma permitir, sem
alegar retomada garantida se indisponível. Não simular subagentes.

Uma microtarefa escritora por vez exige review independente, testes vermelhos
antes e verdes depois, sem alterar testes para esconder erro, e commit focado
após revisão. Nunca declarar completo sem CI verde no SHA publicado e handoff
com limites. O mesmo fluxo vale para desenvolvimento futuro por preferência
explícita do usuário, mantendo autorização da plataforma. Para typo, escalar o
esforço e evitar cerimônia cara, conservando review e registrando a economia.
Preservar mudanças preexistentes e limites de segurança.

## Continuidade de subagentes

Orientação explícita do usuário: nunca interromper subagentes em andamento,
sem importar quanto tempo levem. Não usar `interrupt=true`, `close` ou
`terminate` em agente em andamento por impaciência ou tempo; aguardar e
retomar pelos IDs. Mensagens de orientação devem ser enfileiradas sem
interromper.

O comando WSL robusto usa `--exec env PATH=... rtk`, não `-- env`. Como `rg`
não está disponível no WSL, usar `rtk /usr/bin/grep` ou leitura focada.
`m1nd` first-minute Linux tentou e retornou `needs_authority`; o fallback
autorizado pelo payload é Graphify + prova direta.
