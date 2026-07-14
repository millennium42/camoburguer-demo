---
name: restaurant-architecture-designer
description: Design modules, boundaries, events, adapters and deployment shape for the Camoburguer platform. Use when updating `docs/arquitetura-do-sistema.md`, shaping app/package boundaries or deciding where order, finance and print responsibilities belong.
---

# Restaurant Architecture Designer

Design the smallest architecture that still keeps order core, finance and printing separate.

## Focus

- app boundaries
- package boundaries
- internal events
- adapter seams
- delivery versus kitchen responsibilities
- finance trigger placement

## Mandatory Output

- updated architecture doc
- module map
- event list
- explicit seams for future adapters
- risks for over-coupling

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` first for structural orientation.
- Use `graphify path` or `graphify query` once the graph exists to verify boundaries and cross-file links.
- Use `Ponytail full` to reject extra services, abstractions or packages without real leverage.
