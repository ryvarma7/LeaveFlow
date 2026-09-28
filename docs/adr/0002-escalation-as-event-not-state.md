# ADR 0002: Escalation as an Event and Level, not a State

## Status
Accepted

## Context
When an approval request reaches its deadline at a given stage (e.g. Manager or HR), the responsibility must escalate up the management ladder or to HR. 

## Decision
Escalation is modelled as an event (`ESCALATE`), with metadata tracking `escalation_level` (1, 2) and `escalated_at`, rather than creating new states like `ESCALATED_TO_SKIP_LEVEL`.
The primary workflow state remains `PENDING_MANAGER` or `PENDING_HR`.

## Consequences
- Preserves the clean 5-state model.
- Avoids combinatorial state explosion across approval stages and escalation depths.
- Escalation status is queried via columns and audit timeline without fracturing state queries.
