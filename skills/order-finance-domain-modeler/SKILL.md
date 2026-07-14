---
name: order-finance-domain-modeler
description: Model the order, ticket, print job, cash shift and finance entry domain for Camoburguer. Use when defining entities, states, events, schemas or invariants that connect orders, kitchen flow and gerencial finance.
---

# Order Finance Domain Modeler

Model the domain so the same event can drive queue, ticket and finance without duplicated rules.

## Focus

- entity names
- state transitions
- event naming
- database shape
- finance invariants
- scenario rule structure

## Mandatory Output

- updated entity model
- updated state model
- updated schema or package contracts
- list of invariants and edge cases

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` to inspect connected entities before changing shared contracts.
- Use `graphify` to find cross-file relationships when the graph exists.
- Use `Ponytail full` to avoid optional fields or entities without a real use in v1.
