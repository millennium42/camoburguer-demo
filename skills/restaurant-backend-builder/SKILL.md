---
name: restaurant-backend-builder
description: Implement the Camoburguer API, SSE streams, automatic finance entries, print handoff and cash-shift endpoints. Use when editing `apps/api/`, backend contracts or app-to-package integration code.
---

# Restaurant Backend Builder

Implement the backend as one clean operational core.

## Focus

- HTTP routes
- SSE updates
- order lifecycle
- print handoff
- automatic finance entries
- cash-shift workflow

## Mandatory Output

- touched backend paths
- changed contracts
- test evidence
- failure modes and follow-up risk

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` before refactoring shared backend code.
- Use `graphify` to inspect handler-to-domain connections when the graph exists.
- Use `Ponytail full` to avoid service layers that only rename calls.
