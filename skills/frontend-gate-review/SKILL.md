---
name: frontend-gate-review
description: Review operator-facing screens for clarity, click count, state visibility, legibility and operational risk. Use after UI changes and before infra or QA continues.
---

# Frontend Gate Review

Review the UI like an operations coach, not like a component library curator.

## Checklist

- primary action is obvious
- current state is visible
- error paths are survivable
- finance and kitchen info are readable
- there are no hidden dependencies on channel-specific behavior
- the screen is lighter, not just prettier

## Decision Output

Return `aprovado`, `aprovado com ressalvas` or `reprovado` and list the operator risks.

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` when frontend findings require backend proof.
- Use `graphify` to trace event or contract usage when the graph exists.
- Use `Ponytail full` to cut ornamental UI and needless state management.
