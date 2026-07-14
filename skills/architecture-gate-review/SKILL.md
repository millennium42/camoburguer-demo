---
name: architecture-gate-review
description: Review architecture proposals for hidden coupling, unnecessary services, misplaced responsibilities and weak seams. Use after architecture docs or module boundaries change and before domain or implementation proceeds.
---

# Architecture Gate Review

Review whether the system is still simple enough to run and evolve.

## Checklist

- single order core remains intact
- channel logic is not leaking into UI
- print bridge is isolated from finance
- finance rules are not hardcoded into presentation
- future adapters have seams
- no extra service exists without a concrete need

## Decision Output

Return `aprovado`, `aprovado com ressalvas` or `reprovado`, then list the reasons.

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` for impact and neighboring modules.
- Use `graphify` to verify cross-module paths once the graph exists.
- Use `Ponytail full` to delete speculative architecture.
