---
name: operator-friction-audit
description: Audit the Camoburguer operator flow for extra clicks, hidden states, confusing wording and preventable errors. Use after UI or workflow changes when the concern is operational friction rather than pure correctness.
---

# Operator Friction Audit

Look for small pains that become nightly operational drag.

## Checklist

- too many clicks for common tasks
- unclear labels
- hidden status changes
- mixed mental models between order, kitchen and finance
- unnecessary typing

## Tool Doctrine

- Use `rtk` for shell.
- Use `m1nd` if friction symptoms may come from backend or flow decisions.
- Use `graphify` to trace UI-to-contract usage when the graph exists.
- Use `Ponytail full` to cut forms, toggles and views that operators do not need.
