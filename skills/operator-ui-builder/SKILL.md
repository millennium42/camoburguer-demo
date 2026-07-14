---
name: operator-ui-builder
description: Build the Camoburguer operator interface for orders, kitchen queue, cash shift and finance summary. Use when editing `apps/ops-web/` and any low-cognitive-load operational interaction.
---

# Operator UI Builder

Build for tired operators in a rush, not for ideal users in a demo deck.

## Focus

- large actions
- short forms
- visible status
- low click count
- quick kitchen readability
- light financial overview

## Mandatory Output

- touched UI paths
- user-facing behavior changed
- friction risks
- test or smoke evidence

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` if UI changes depend on backend or contract assumptions.
- Use `graphify` to trace contract usage when the graph exists.
- Use `Ponytail full` to reject component bloat and front-end abstractions that do not help operators.
