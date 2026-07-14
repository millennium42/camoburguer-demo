---
name: backend-gate-review
description: Review backend routes, finance triggers, print handoff, error handling and idempotence for the Camoburguer API. Use after backend changes and before frontend or infra proceeds.
---

# Backend Gate Review

Review behavior, not style.

## Checklist

- route contracts match docs
- shared domain rules are reused
- finance launches exactly when intended
- print failures do not lose order state
- SSE updates remain coherent
- no duplicate or dead logic exists

## Decision Output

Return `aprovado`, `aprovado com ressalvas` or `reprovado`, with precise backend findings.

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` for blast radius around shared backend files.
- Use `graphify` to trace backend-to-package links when the graph exists.
- Use `Ponytail full` to delete duplicated guards and wrapper layers.
