---
name: infra-gate-review
description: Review docker compose, service health, startup order, print bridge runtime and demo reliability. Use after infrastructure or runtime changes and before QA begins.
---

# Infra Gate Review

Review whether the demo starts cleanly and fails in understandable ways.

## Checklist

- containers boot in the right order
- health checks prove something useful
- print spool persists where expected
- the web and API can talk to each other
- no service exists only to look sophisticated

## Decision Output

Return `aprovado`, `aprovado com ressalvas` or `reprovado` and list runtime blockers first.

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` if changes touch multiple services or files.
- Use `graphify` to confirm runtime relationships when the graph exists.
- Use `Ponytail full` to prefer one compose file and obvious health checks.
