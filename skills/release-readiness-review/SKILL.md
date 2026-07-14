---
name: release-readiness-review
description: Consolidate process, architecture, implementation, infra and QA evidence into a final go/no-go assessment for the Camoburguer demo. Use after QA finishes and before closing the implementation cycle.
---

# Release Readiness Review

Make the last call with evidence, not enthusiasm.

## Required Inputs

- process decision state
- architecture decision state
- domain integrity state
- backend and frontend review status
- infra validation
- QA evidence

## Mandatory Output

- overall status
- release blockers first
- acceptable residual risks
- what still needs manual verification

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` for final cross-checks when evidence conflicts.
- Use `graphify` to confirm where a late risk spreads when the graph exists.
- Use `Ponytail full` to reject last-minute scope creep.
