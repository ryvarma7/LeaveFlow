# ADR 0001: Custom Table-Driven State Machine instead of Spring StateMachine

## Status
Accepted

## Context
LeaveFlow manages a multi-stage approval workflow with distinct transition rules, actors, and guards. Spring StateMachine introduces heavy abstraction, runtime overhead, and complex state persistence mapping.

## Decision
Implement a lightweight, deterministic, table-driven state machine in pure Java. 
- Five states only: `PENDING_MANAGER`, `PENDING_HR`, `APPROVED`, `REJECTED`, `CANCELLED`.
- Transitions defined in an immutable lookup table: `(CurrentState, Event) -> NextState`.
- Only `LeaveWorkflowService` can execute transitions. No entity setter for status.

## Consequences
- Crystal-clear transition validation without third-party framework baggage.
- Extremely testable via pure unit tests covering the complete state x event matrix.
