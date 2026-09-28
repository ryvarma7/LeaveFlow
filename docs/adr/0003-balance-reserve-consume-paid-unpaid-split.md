# ADR 0003: Reserve then Consume Balance with Paid/Unpaid Split

## Status
Accepted

## Context
When employees request leave exceeding their available paid entitlement, traditional systems outright reject the request (`INSUFFICIENT_BALANCE`). Business requirements dictate that requests should proceed with excess days classified as unpaid leave (Loss of Pay) upon employee acknowledgement.

## Decision
- At submission: calculate `paid_days = min(working_days, available)` and `unpaid_days = working_days - paid_days`.
- If `unpaid_days > 0`, require explicit acknowledgement with salary deduction estimate before proceeding.
- Balance management reserves only `paid_days` on submit.
- On approval: reserve is converted to `used` (consumed).
- On rejection/cancellation: reserved or consumed `paid_days` are released/restored.
- Race conditions prevented via optimistic/pessimistic row locks and conditional database updates.

## Consequences
- No abrupt rejections when balance is exhausted.
- Accurate financial and quota impact tracking.
