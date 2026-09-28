# ADR 0004: Work Coverage as an Opt-In Side Workflow

## Status
Accepted

## Context
When employees take leave, their work needs to be covered by team members. Making coverage a blocking approval gate introduces bottlenecks and managerial friction.

## Decision
- Coverage is modeled as an independent, opt-in side workflow with its own lifecycle: `OFFERED -> ACCEPTED | DECLINED | WITHDRAWN | EXPIRED`.
- Coverage assignments never block main leave approval; they compute an aggregate status (`NONE`, `PARTIAL`, `FULL`).
- Features consent-first principles: coverage offers include financial allowances, monthly load caps (5 days), fairness suggestions, and no penalties for declining.
- Coverage assignments are automatically withdrawn if the underlying leave request is rejected or cancelled.

## Consequences
- Leave approvals remain fast and unblocked.
- Team workload is distributed transparently and equitably with proper monetary incentives.
