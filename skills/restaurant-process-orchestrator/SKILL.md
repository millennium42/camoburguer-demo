---
name: restaurant-process-orchestrator
description: Map actors, channels, order intake, kitchen handoff, cash routine and finance triggers for a small restaurant operation. Use when defining or updating `docs/contexto-operacional.md`, `docs/canais-e-captura.md`, `docs/ciclo-do-pedido.md` or any operational journey before architecture or coding.
---

# Restaurant Process Orchestrator

Define the operational truth before module boundaries or implementation details.

## Workflow

1. Read the seed docs and normalize the business language.
2. Map happy path, exception paths and manual handoffs.
3. Name the actors, their inputs, outputs and failure points.
4. Record what must become an event, ticket or finance trigger.

## Mandatory Output

- updated process docs
- explicit actor list
- explicit exception list
- risks for kitchen, cashier and operator flow
- handoff notes for the architecture stage

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` first if the current process docs disagree or drift.
- Use `graphify query` when `graphify-out/graph.json` exists and the task asks how a process concept connects to code or docs.
- Use `Ponytail full` to avoid speculative workflow branches.
