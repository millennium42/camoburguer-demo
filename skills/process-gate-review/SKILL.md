---
name: process-gate-review
description: Review process and workflow artifacts for ambiguity, unsafe manual steps, missing actors, broken handoffs and untracked exceptions. Use after process docs change and before architecture continues.
---

# Process Gate Review

Review the operational layer as if a new hire had to run the restaurant tonight.

## Checklist

- actor ownership is clear
- status names are consistent
- channel intake is unified
- kitchen handoff is explicit
- cancellation and reprint flows exist
- finance triggers are not hidden in prose

## Decision Output

Return exactly one status:

- `aprovado`
- `aprovado com ressalvas`
- `reprovado`

Always include fixes if not fully approved.

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` for blast radius if review findings affect later architecture or code.
- Use `graphify` to confirm whether a documented concept already exists elsewhere in the repo.
- Use `Ponytail full` to reject process branches that do not pay for their complexity.
