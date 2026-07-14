---
name: restaurant-demo-qa
description: "Validate the Camoburguer demo end to end: orders, kitchen queue, reprint, cancellation, cash shift and finance summary. Use after implementation or infra changes and before final review."
---

# Restaurant Demo QA

Prove the demo through behavior, not optimism.

## Test Scope

- create order from each source
- move order across statuses
- print and reprint
- conclude and cancel
- open, adjust and close cash shift
- verify finance summary and entries
- verify container boot when compose is available

## Mandatory Output

- executed checks
- passed checks
- failed checks
- evidence paths or command output summary
- residual risks

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` only when a failing behavior needs structural orientation.
- Use `graphify` to inspect cross-file responsibility if a failure path is unclear.
- Use `Ponytail full` to keep smoke checks focused on the smallest proofs that fail loudly.
