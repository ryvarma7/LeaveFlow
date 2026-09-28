# LeaveFlow: rules for Claude Code

Project: Leave management with Manager -> HR approval chain, escalation, team conflict flags,
pro-rated balances, work coverage, payroll impact. Hackathon prototype that must actually work.
Read docs/BLUEPRINT.txt (architecture) and BUILD.md section 2 (extra spec). BUILD.md section 2 wins on conflicts.

## Stack
Backend: Java 21, Spring Boot 3.5.x, Maven, Spring Web, Data JPA, Security + OAuth2 resource server (JWT),
Validation, Flyway, PostgreSQL 16, springdoc. Tests: JUnit 5, AssertJ, Testcontainers (real PostgreSQL only, never H2).
Frontend: React + TypeScript + Vite, React Router, TanStack Query, React Hook Form + Zod, Tailwind + Radix (shadcn) restyled.
Verify latest stable versions before pinning anything.

## Non-negotiable architecture
- Five states only: PENDING_MANAGER, PENDING_HR, APPROVED, REJECTED, CANCELLED. ESCALATED is an event + level, never a state.
- Custom table-driven state machine. NO Spring StateMachine.
- Only LeaveWorkflowService changes LeaveRequest.status. No public setStatus anywhere.
- Only BalanceService changes leave_balances. Only CoverageService changes coverage_assignments.
- Lock order: leave_requests -> coverage_assignments -> leave_balances (exception: submit locks the balance row first, see BUILD.md 2.4).
- Time comes from an injected java.time.Clock in zone Asia/Kolkata. Never LocalDate.now() or Instant.now() directly.
- Money and days are BigDecimal. Never double.
- Never auto-approve or auto-reject anything from the scheduler.
- Errors are RFC 7807 problem+json with a stable "code" field. No stack traces or SQL in responses.
- Entities never appear in API JSON. DTOs are records. No Lombok on entities.
- Every DB invariant in the blueprint (exclusion constraint, CHECKs, triggers) stays. Hibernate ddl-auto=validate, Flyway owns the schema.

## Working rules
- Small commits, conventional commit messages. Run `./mvnw verify` (backend) or `npm run build && npm test` (frontend) before saying a task is done.
- Never disable, skip or weaken a test to make it pass. Fix the code.
- After each phase, print a short summary: what was built, what tests prove it, anything deferred.
- Do not add features that are not in the spec. Ask if something is ambiguous.
- Never use @Transactional on a method called through `this`. Scheduler and workflow are separate beans.

## UI rules (see BUILD.md section 5)
No purple or gradient backgrounds, no pill-shaped buttons, no emoji, no AI-generated images, no fake metrics or testimonials,
no scroll-triggered animation, no hero marketing text, no em dashes or en dashes in any user-facing copy.
Every number on screen comes from the API.
