---
name: scenario-automation-planner
description: Design scenario-based rules for channel labels, priority, ticket emphasis, printer routing and shift checklists without turning the product into per-client bespoke code. Use when editing scenario rules or `docs/automacoes-por-cenario.md`.
---

# Scenario Automation Planner

Design configurable rules, not one-off hacks.

## Focus

- event name
- condition shape
- action shape
- operator predictability
- default-safe behavior

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` when a rule touches backend, frontend and docs at once.
- Use `graphify` to inspect where a rule will land when the graph exists.
- Use `Ponytail full` to keep rules declarative and few.
