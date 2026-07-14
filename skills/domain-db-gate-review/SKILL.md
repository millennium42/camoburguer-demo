---
name: domain-db-gate-review
description: Review the Camoburguer entity model, state transitions and database shape for integrity, drift and unnecessary complexity. Use after domain or schema changes and before backend implementation continues.
---

# Domain DB Gate Review

Review the domain as if it were a migration point of no return.

## Checklist

- one source of truth per entity
- valid status transitions
- order, print and finance links are explicit
- finance entries are append-only enough for audit
- no table or field exists only for imagined future use

## Decision Output

Return `aprovado`, `aprovado com ressalvas` or `reprovado`, then list concrete schema or invariant issues.

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` for connected evidence before claiming a field is unused or risky.
- Use `graphify` to confirm entity-to-file spread once the graph exists.
- Use `Ponytail full` to remove speculative fields.
