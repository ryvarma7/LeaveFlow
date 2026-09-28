# BUILD.md: LeaveFlow hackathon build guide for Claude Code

Working prototype, fully functional, deployed. Backend first, UI last.
This file holds: decisions, the extra spec (work coverage + payroll impact), the design system rules, and one master prompt per phase.

---

## 0. How to use this file

1. Create the repo. Put the earlier architecture file at `docs/BLUEPRINT.txt` (the `LeaveFlow_Project_Blueprint.txt` I gave you) and this file at `BUILD.md`.
2. Save the block in section 3 as `CLAUDE.md` in the repo root. Claude Code reads it automatically in every session.
3. Paste ONE phase prompt per Claude Code session (section 6 onward). Run `/clear` between phases.
4. Do not start the next phase until the "Done when" list of the current one is true. Commit and tag after each phase.
5. If Claude Code proposes changing the state table, the invariants or the lock order, say no. Those are the architecture.

Priority if time runs out, cut in this order (last item is cut first):
`Phase 17 polish extras` > `Phase 16 HR extras` > `coverage suggestions ranking` > `payroll statement pages`.
Never cut: phases 2, 5, 7, 8, 11.

---

## 1. Decisions taken from your last message

| Topic | Decision |
|---|---|
| Email notifications, ShedLock, login rate limiting | Not built (marked NONEED). |
| Business-hour timeouts, carry-forward, half-day, policy admin UI | Not built. Holidays and team thresholds are seeded and editable through the API only. |
| Work split | Built as "Coverage" (section 2). It is a side workflow, NOT a third approval stage, so the state machine stays five states. |
| Extra work is unpopular | Consent, pay, fairness ranking, monthly cap, handover notes, no penalty for declining (section 2.3). |
| Paid leave exhausted | Request is allowed but the extra days become unpaid. Employee sees the estimated salary loss and must confirm (section 2.4). |
| Covering teammate pay | Coverage allowance shown upfront to the teammate (section 2.5). |
| Deployment | Frontend on Vercel. Database on Vercel's Postgres offering (Marketplace, Neon). **A separate backend host is required** (section 4). |
| UI | Professional dashboard, rules in section 5. Reference image used for layout only. |

### What I cut from the earlier blueprint to keep this a prototype
ArchUnit, CSV export, the reconcile endpoint (kept as a test helper only), employee deactivation flow, balance adjustment endpoint, load testing, full Playwright suite (3 smoke tests only), policy admin screens.
The safety core stays: state machine, single mutation gateway, row locks, conditional balance updates, DB constraints, escalation ladder, conflict flag, pro-rating.

---

## 2. Addendum spec: Coverage (work split) and Payroll impact

These rules extend `docs/BLUEPRINT.txt`. Where they differ, this section wins.

### 2.1 Coverage model

Goal: when someone is on leave, their work does not stall. The manager splits it among teammates, and teammates opt in.

- Coverage is attached to a leave request. It has its own tiny lifecycle per assignment: `OFFERED -> ACCEPTED | DECLINED | WITHDRAWN | EXPIRED`.
- Coverage never blocks approval. It only shows a gap indicator.
- Request-level coverage status is derived: `NONE` (0 percent accepted), `PARTIAL` (below 100), `FULL` (100).
- Handover notes: the employee may write up to 1000 characters at submission (`handover_notes`). The manager and the teammates see them.
- Who can offer: the requester's direct manager, or HR. Offers are allowed while the request is `PENDING_MANAGER`, `PENDING_HR` or `APPROVED`, and only while `end_date >= today`.
- Candidates: active, same team as the requester, not the requester, joined on or before the start date, and with no active leave overlapping any working day of the request.
- Split: each assignment has `share_percent` (0 < x <= 100). Sum of `OFFERED + ACCEPTED` shares for one request must be <= 100. Checked under the request row lock.
- Covered days for an assignment: `working_days * share_percent / 100`, rounded to 2 decimals.
- Monthly cap: a teammate cannot hold more than `leave.coverage.monthly-cap-days` (default 5) covered days per calendar month across `OFFERED + ACCEPTED`. Checked at offer AND again at accept.
- Auto effects, all inside the workflow transaction: when a request becomes `REJECTED` or `CANCELLED`, every `OFFERED/ACCEPTED` assignment becomes `WITHDRAWN` and the teammates are notified.
- Expiry: assignments still `OFFERED` when the leave `start_date` arrives become `EXPIRED` (done by the scheduler sweep).
- If a teammate who has an `ACCEPTED` assignment submits leave overlapping those days, the submit is refused with `COVERAGE_COMMITMENT_CONFLICT` ("You accepted coverage on these dates. Ask your manager to reassign first."). Their `OFFERED` assignments in that range are auto-declined by the system.
- Lock order: `leave_requests` row, then `coverage_assignments` row, then `leave_balances` row.

### 2.2 Coverage tables (fold into V1/V2 migrations)

```sql
CREATE TABLE coverage_assignments (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id           BIGINT NOT NULL REFERENCES leave_requests(id),
  covering_employee_id BIGINT NOT NULL REFERENCES employees(id),
  offered_by           BIGINT NOT NULL REFERENCES employees(id),
  share_percent        NUMERIC(5,2) NOT NULL CHECK (share_percent > 0 AND share_percent <= 100),
  covered_days         NUMERIC(5,2) NOT NULL CHECK (covered_days > 0),
  status               VARCHAR(12) NOT NULL CHECK (status IN
                       ('OFFERED','ACCEPTED','DECLINED','WITHDRAWN','EXPIRED')),
  note                 VARCHAR(500),
  decline_reason       VARCHAR(300),
  allowance_amount     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (allowance_amount >= 0),
  allowance_breakdown  JSONB,             -- [{month, coveredDays, dailyRate, amount}]
  responded_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  version              BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uq_active_assignment
  ON coverage_assignments (request_id, covering_employee_id)
  WHERE status IN ('OFFERED','ACCEPTED');
CREATE INDEX ix_cov_employee_status ON coverage_assignments (covering_employee_id, status);
CREATE INDEX ix_cov_request ON coverage_assignments (request_id);
```

Also add:
- `employees.monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monthly_salary >= 0)`.
- `leave_requests.paid_days NUMERIC(5,1) NOT NULL`, `unpaid_days NUMERIC(5,1) NOT NULL DEFAULT 0`, `estimated_deduction NUMERIC(12,2) NOT NULL DEFAULT 0`, `deduction_breakdown JSONB`, `handover_notes VARCHAR(1000)`, and `CHECK (paid_days + unpaid_days = working_days)`.
- A trigger or service rule so a terminal-state request cannot keep `OFFERED/ACCEPTED` assignments (service rule is enough, plus a test).

### 2.3 Handling "employees do not like extra work"

Built into the product, not just explained:

1. **Consent.** A teammate gets an offer, not an order. Accept or decline. Declining needs no reason and has no consequence anywhere in the system. No decline counter is stored or shown.
2. **Pay.** The offer shows the allowance the teammate will earn, before they answer.
3. **Fairness.** The manager sees a ranked suggestion list ordered by fewest covered days in the last 90 days, then fewest leave days. It shows load, never salary.
4. **Cap.** Hard monthly cap on covered days per person.
5. **Split.** Work is divided in shares across several people, so nobody carries all of it.
6. **Handover notes.** The person leaving writes what needs covering, so the extra work is defined and finite.

Not built, mention as future: compensatory time off credits, task-level assignment.

### 2.4 Paid leave exhausted: unpaid days and salary impact

Replaces the old `INSUFFICIENT_BALANCE` rejection for balance-backed leave types.

- At preview and submit: `available = entitled + carried + adjustment - used - pending`.
- `paid_days = min(working_days, max(available, 0))`, `unpaid_days = working_days - paid_days`. Paid days are consumed first, in date order. The LAST working days of the range are the unpaid ones.
- `UNPAID` leave type: `paid_days = 0`, all days unpaid.
- If `unpaid_days > 0`, submit requires `acknowledgeUnpaid = true`, otherwise `422 UNPAID_ACKNOWLEDGEMENT_REQUIRED` with `{unpaidDays, estimatedDeduction, breakdown}` in the body.
- Balance reservation uses `paid_days` only. Consume, release and restore also use `paid_days`.
- Race safety: submit locks the balance row (`SELECT ... FOR UPDATE`) FIRST, computes the split from the locked values, inserts the request, then applies the reservation. This is the only path that locks balance before request, and it is safe because the new request row is invisible to everyone else until commit. Workflow actions keep the order request then balance.
- `INSUFFICIENT_BALANCE` is no longer thrown. If the reservation guard still fails after locking, treat it as a bug: throw `IllegalStateException`, roll back.
- Deduction estimate, per unpaid working day: `monthly_salary / working_days_in_that_month`, where working days of the month = weekdays minus public holidays. Sum per calendar month into `deduction_breakdown`: `[{month:"2026-10", unpaidDays, dailyRate, amount}]`. Rounding: HALF_UP, 2 decimals, BigDecimal only. Guard: if the month has zero working days, use 1.
- If `monthly_salary = 0`, the estimate is 0 and the UI shows "Salary not set" instead of a number.
- Estimate is a snapshot stored on the request. Wording in UI: "Estimated deduction. Final payroll may differ."

### 2.5 Coverage allowance

- `allowance = covered_days * covering_daily_rate * leave.coverage.allowance-percent-of-daily-rate / 100` (default 20).
- Computed per calendar month over the request's working days (same helper as 2.4), snapshotted on the assignment at offer time, shown to the covering teammate only.
- Managers see days and share, never amounts. HR sees amounts in the payroll statement.
- Only paid out when the leave is `APPROVED` and the assignment is `ACCEPTED`. Otherwise it is shown as `PROJECTED`.

### 2.6 Payroll adjustment statement (computed on read, nothing stored)

For a given `YYYY-MM`, per employee:
- `lopDeduction`: sum of `deduction_breakdown` entries for that month from `APPROVED` requests (status `CONFIRMED`) and pending ones (status `PROJECTED`).
- `coverageAllowance`: same from `ACCEPTED` assignments, using each parent request's status for CONFIRMED vs PROJECTED.
- `netAdjustment = coverageAllowance - lopDeduction`, shown with base salary for context.
- Cancelling an approved leave removes its effect automatically because it is computed on read.
- Visibility: an employee sees only their own; HR sees everyone; managers see none.

### 2.7 New and changed endpoints

| Method and path | Who | Purpose |
|---|---|---|
| `POST /leave-requests/preview` | any | Adds `paidDays, unpaidDays, estimatedDeduction, deductionBreakdown, salarySet`. |
| `POST /leave-requests` | any | Body adds `handoverNotes?`, `acknowledgeUnpaid?`. |
| `GET /leave-requests/{id}/coverage` | owner, manager in scope, HR | Assignments, coverage status. Amounts hidden except to the covering teammate. |
| `GET /leave-requests/{id}/coverage/suggestions` | manager in scope, HR | Ranked candidates with load and eligibility reason. |
| `POST /leave-requests/{id}/coverage/offers` | manager in scope, HR | Body `{coveringEmployeeId, sharePercent, note?}`. |
| `POST /coverage/{id}/accept` | the covering employee | Re-validates cap and leave overlap under lock. |
| `POST /coverage/{id}/decline` | the covering employee | Body `{reason?}`. |
| `POST /coverage/{id}/withdraw` | manager in scope, HR | Only for `OFFERED` or `ACCEPTED`. |
| `GET /me/coverage?status=` | any | Incoming offers and commitments, with monthly load vs cap. |
| `GET /me/payroll/adjustments?month=` | any | Own statement. |
| `GET /hr/payroll/adjustments?month=&teamId=` | HR | Everyone. |
| `GET /dashboard/summary` | any | Role-aware counts for the dashboard cards (real data only). |
| `POST /internal/escalation/run` | header `X-Cron-Secret` | Runs the escalation and coverage-expiry sweep once. Used by an external pinger. |

New error codes: `UNPAID_ACKNOWLEDGEMENT_REQUIRED` (422), `COVERAGE_CAP_EXCEEDED` (422), `COVERAGE_OVERSHARE` (422), `COVERAGE_CANDIDATE_UNAVAILABLE` (422), `COVERAGE_NOT_ALLOWED_STATE` (409), `COVERAGE_COMMITMENT_CONFLICT` (422).

### 2.8 Config keys to add

```yaml
leave:
  coverage:
    allowance-percent-of-daily-rate: 20
    monthly-cap-days: 5
  payroll:
    scale: 2
  internal:
    cron-secret: ${CRON_SECRET}
```

### 2.9 Extra failure cases to test

Two teammates accepting at once so shares exceed 100. Accept after the teammate's own leave got approved. Offer cap breached by two concurrent offers. Request cancelled while an offer is pending (auto-withdraw, no orphan rows). Leave spanning two months (split rates). Salary 0. Fractional available balance (9.5 available, 10 requested: 9.5 paid, 0.5 unpaid). Double submit with `acknowledgeUnpaid` (exclusion constraint still wins).

---

## 3. CLAUDE.md (save this in the repo root)

```markdown
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
```

---

## 4. Deployment: do you need a backend server?

**Yes.** Vercel hosts the frontend and serverless functions in supported runtimes. A Spring Boot app is a long-running Java process and Vercel does not run it. The only source I found says exactly that (a Vercel staff reply in their community discussions, from before 2025), so check Vercel's current docs once before you commit. Your problem statement also requires Spring Boot, and the escalation scheduler needs a process that stays alive.

```
Browser -> Vercel (React static build)
              |  vercel.json rewrite  /api/*  ->  https://<backend-host>/api/*
              v
        Backend host (Docker, Spring Boot)  ->  Postgres (Vercel Marketplace, Neon)
```

- **Frontend:** Vercel, Vite build. Use `vercel.json` rewrites so the browser only talks to your Vercel domain. That removes CORS entirely and keeps the backend URL private. Put the `/api/(.*)` rewrite before the SPA fallback to `/index.html`. `vercel.json` cannot read env vars, so paste the backend URL into the file.
- **Database:** create the Postgres from Vercel's Marketplace (it is Neon under the hood; check the dashboard, naming changes). Copy the connection string, convert it to JDBC (`jdbc:postgresql://HOST/DB?sslmode=require`), use the **direct** (non-pooled) connection, keep Hikari `maximum-pool-size` at 5. Run `CREATE EXTENSION IF NOT EXISTS btree_gist;` once to confirm it is allowed; the overlap constraint needs it.
- **Backend host:** any free Docker host: Render, Railway, Fly.io or Koyeb. Check the current free-tier limits. Free web services usually sleep after idle time, so:
  - The escalation design already catches up after downtime (deadlines are stored data).
  - Add a free external pinger (cron-job.org or a GitHub Actions schedule) calling `GET /actuator/health` every 5 to 10 minutes and `POST /internal/escalation/run` with `X-Cron-Secret`. Warm it up manually 5 minutes before any demo.
- **Env vars on the backend host:** `SPRING_PROFILES_ACTIVE=demo`, `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (32+ random bytes), `CRON_SECRET`, `LEAVE_TIMEZONE=Asia/Kolkata`.
- Keep the demo profile in the deployed prototype so timeouts are short and the "run now" tools exist. Protect `/demo/**` behind HR role.

---

## 5. Design system rules (for every UI phase)

Reference: your SOLACE dashboard image. What I take from it: white cards on a light canvas, a KPI card row, a right rail with short lists, dense readable tables, a top bar with logo, section tabs, bell and user menu.
What I do NOT take, because it conflicts with your own avoid list: the purple gradient backdrop, the pill-shaped nav, the decorative gauges, and attendance/salary tabs (out of scope). Payroll impact lives on a "Pay impact" page and inside the leave form instead.

**Layout**
- Canvas `#F5F6F8`, cards `#FFFFFF`, 1px border `#E4E7EC`, card radius 10px, control radius 6px, almost no shadow.
- Top bar: logo text, tabs with square corners and a 2px accent underline for the active tab (not pills), bell, user menu. Max content width 1280px. Desktop first, works down to tablet, usable on mobile.
- Page pattern: page title and one plain sentence of context, KPI row (3 to 4 cards), main table on the left (about 2/3), right rail of short lists (about 1/3).

**Colour** (no purple, no gradients anywhere)
- Text `#101828`, secondary `#475467`, muted `#667085`.
- One accent: deep teal `#0B6E6E` (hover `#095A5A`). Focus ring 2px accent with 2px offset.
- Status colours, used consistently as small square-cornered badges with a dot: pending amber `#B54708` on `#FFFAEB`, approved green `#067647` on `#ECFDF3`, rejected red `#B42318` on `#FEF3F2`, cancelled slate `#475467` on `#F2F4F7`. "Escalated" is an extra outlined orange badge next to the status, not a status.
- Conflict warning uses amber. Unpaid or salary-loss warning uses red text on a pale red panel, never alarming animation.

**Typography**
- Geist Sans (variable) for UI via `@fontsource-variable/geist`, Geist Mono via `@fontsource-variable/geist-mono` for employee codes, dates in tables and money. Self-host, no Google Fonts request. Verify package names on npm.
- Sizes: 12, 13, 14 (body), 16, 20, 24, 30. Headings weight 600, letter-spacing -0.01em. Body line-height 1.5. Table numbers `font-variant-numeric: tabular-nums`, right aligned. Currency via `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR'})`.
- Sentence case everywhere. No ALL CAPS except tiny table column labels at 12px with 0.04em spacing.

**Components**
- Buttons: rectangular, radius 6px, heights 32/36/40. Primary solid accent, secondary white with border, destructive red outline. No pills, no gradients, no glow.
- Icons: lucide-react only, 16 or 18px, stroke 1.5. Zero emoji anywhere, including toasts and empty states.
- Avatars: initials in a neutral square-rounded tile. No photos, no generated images.
- Balance display: rectangular progress bars with used, pending and available segments plus the exact numbers. No gauges, no donut charts.
- Tables: sticky header, row hover, clear empty state, skeleton loading rows, pagination.
- Dialogs and menus from Radix primitives (keyboard and screen reader safe).

**Copy**
- Plain and specific. Example: "3 of 5 days exceed your paid leave. Estimated deduction: Rs 8,412." Not "Unlock your leave journey".
- No hero section, no slogans. Login page is a compact form with the product name and one functional line.
- No em dashes or en dashes in user-facing text. Use commas, colons, periods or "to".
- No fake numbers, fake testimonials, "trusted by" strips or placeholder lorem. Empty means empty: "No requests yet."

**Motion**
- 120 to 160ms opacity and colour transitions on hover, focus and dialogs only. No scroll-triggered animation, no parallax, no count-up numbers, no page transition theatrics. Respect `prefers-reduced-motion`.

**States and quality bar**
- Every list and form has loading, empty, error and success states. Every mutation button disables while in flight. 409 STALE_STATE shows "This request was updated. Refreshing." and refetches. Every form validates before submit with inline messages. Keyboard reachable, visible focus, AA contrast.

---

## 6. Phase prompts

Each prompt is self-contained. Paste one per session.

### PHASE 0: Repo and rules

```text
Set up the repository for the LeaveFlow project.
Read docs/BLUEPRINT.txt and BUILD.md fully first.

Create:
- backend/ (empty Maven Spring Boot module placeholder, done in phase 1) and frontend/ (empty, done in phase 13)
- CLAUDE.md in the root with the exact content from BUILD.md section 3
- docs/adr/ with 4 short ADRs: custom state machine instead of Spring StateMachine; escalation as event plus level, not a state; reserve then consume balance with paid/unpaid split; coverage as opt-in side workflow
- README.md skeleton: what it is, architecture diagram (ASCII from the blueprint section 5), how to run, links to docs
- .gitignore for Java, Node, env files; .env.example listing DB_URL, DB_USER, DB_PASSWORD, JWT_SECRET, CRON_SECRET, LEAVE_TIMEZONE
- docker-compose.yml with postgres:16 only (backend and frontend added later)

Commit as "chore: repo bootstrap". Print what you created. Do not write application code.
```
Done when: repo builds nothing yet, docs are in place, compose starts Postgres.

### PHASE 1: Backend skeleton and infrastructure

```text
Build the backend skeleton in backend/. Follow CLAUDE.md and docs/BLUEPRINT.txt sections 4, 5, 15, 18.

Do:
1. Spring Boot 3.5.x (verify latest stable), Java 21, Maven wrapper. Package root com.leaveflow with the package-by-feature layout from blueprint section 15 (create empty packages with package-info where needed).
2. Dependencies: web, data-jpa, validation, security, oauth2-resource-server, actuator, flyway-core + flyway-database-postgresql, postgresql, springdoc-openapi, test: testcontainers postgresql, spring-security-test, awaitility.
3. application.yml plus application-demo.yml and application-prod.yml. ddl-auto=validate, hibernate jdbc time_zone UTC, Hikari max pool 5, only health and info actuator endpoints exposed. Config keys from blueprint 10.4 and BUILD.md 2.8 bound with @ConfigurationProperties records (Duration types).
4. ClockConfig: a Clock bean in the zone from leave.timezone (default Asia/Kolkata) plus a MutableClock for tests.
5. Error model: ErrorCode enum (include every code listed in blueprint section 18 and BUILD.md 2.7), domain exception hierarchy, GlobalExceptionHandler returning RFC 7807 ProblemDetail with "code" and "traceId" (TraceIdFilter puts traceId in MDC and the response).
6. Flyway V1__init.sql containing only "CREATE EXTENSION IF NOT EXISTS btree_gist;" for now.
7. Base integration test class using a singleton Testcontainers PostgreSQL, and a test proving the context loads, Flyway ran and /actuator/health is UP.
8. GitHub Actions workflow running ./mvnw verify.
9. Dockerfile for the backend (multi-stage, Java 21 JRE, non-root user, honours PORT env var).

Done means: ./mvnw verify passes, docker compose up postgres works, app starts against it. Commit "feat: backend skeleton". Print the summary.
```
Done when: context test green in CI, health UP.

### PHASE 2: Pure domain logic (TDD, no Spring, no DB)

```text
Implement the pure domain logic, test-first. Read blueprint sections 8, 10, 11, 12 and BUILD.md sections 2.4 to 2.6. No Spring, no database, no static time access (pass LocalDate/Clock in).

Implement in the domain/ packages with JUnit 5 + AssertJ tests written first:
1. LeaveStatus, LeaveEvent, LeaveStateMachine exactly per blueprint 8.4/8.5. Test EVERY (state x event) pair including NEW: assert allowed or IllegalTransitionException exactly matching the table. Add a test that prints the table.
2. WorkingDayCalculator(start, end, weekendDays, holidays) returning working day list and excluded dates with reason. Cases: weekend only, holiday inside, holiday on weekend, single day, long range, custom weekend set.
3. ProRatingCalculator per blueprint 12.3 with the worked examples as tests (18.0, 18.0, 9.0, 9.0 for leap year, 14.5, 0.0, no row for future year, Q=12 case).
4. ConflictCalculator per blueprint 11 (allowed = max(1, floor(teamSize*percent/100)), per working day, approved vs pending split, closed intervals, teammate joining mid range). Tests for team sizes 1, 2, 3, 10 and boundaries equal vs greater than allowed.
5. EscalationPolicy (ladder with and without skip-level manager, last rung returns empty) and ApprovalAuthorityResolver (manager, skip-level at L1/L2, HR only after ladder reaches HR, self-approval blocked, inactive actor, HR segregation on/off/no other HR).
6. PayCalculator and LopAllocator per BUILD.md 2.4/2.5: allocate paid days first in date order, last days unpaid, fractional available (9.5 vs 10), per-month daily rate = monthlySalary / workingDaysInMonth, month split for ranges crossing months, salary 0, HALF_UP scale 2, zero-working-day guard. Also coverageAllowance(coveredDays, monthlySalary, months, percent).
7. CoverageRules: share sum <= 100, covered days calculation, monthly cap check, candidate eligibility (overlap, team, join date) as pure functions.

All BigDecimal. Target over 90 percent line coverage on these packages (add JaCoCo report). Commit in small steps. Print the coverage summary.
```
Done when: all unit tests green, coverage above 90 percent on domain logic.

### PHASE 3: Schema and persistence

```text
Create the full database schema and persistence layer. Read blueprint section 7 and BUILD.md 2.2.

1. Flyway migrations: V1__core.sql (all tables from blueprint 7 PLUS the extra columns and coverage_assignments table from BUILD.md 2.2, including employees.monthly_salary and leave_requests paid/unpaid/deduction/handover columns), V2__hardening.sql (append-only triggers on events and ledger, terminal-state guard trigger, exclusion constraint), V3__seed_reference.sql (leave types ANNUAL 18, SICK 12 with 7 days backdate, CASUAL 6, UNPAID; public holidays for the current and next year in India, mark clearly as sample data).
2. Ledger uses the three-delta design (entitlement_delta, pending_delta, used_delta) from blueprint 12.7.
3. JPA entities per blueprint 6 (field access, protected constructors, LAZY associations, no public setStatus, moveTo package-private), repositories, findByIdForUpdate with PESSIMISTIC_WRITE and 3s lock timeout hint, @Version on LeaveRequest, LeaveBalance, CoverageAssignment, Employee.
4. Demo seed (demo profile only, Flyway repeatable or a CommandLineRunner): 2 HR (Hannah, Harish), manager Meera with manager_id null, team Engineering with max_absent_percent 25 containing Arun, Bala, Chitra, Divya (Divya joined mid current year), realistic monthly salaries, BCrypt passwords from a documented demo password. Create balances through the ProRatingCalculator, not by hand.
5. Tests with raw SQL against Testcontainers proving each safety net: overlapping active requests rejected (23P01), overdraw CHECK, terminal-state trigger, append-only tables, paid+unpaid=working_days CHECK, duplicate active coverage assignment rejected.

Done: ddl-auto=validate passes, all constraint tests pass. Commit "feat: schema and persistence".
```
Done when: migrations run from empty, constraint tests pass.

### PHASE 4: Identity and security

```text
Implement authentication and authorization plumbing. Read blueprint section 13.

1. POST /api/v1/auth/login, GET /api/v1/auth/me. BCrypt. JWT (HS256, secret from JWT_SECRET, 60 min) issued with NimbusJwtEncoder and validated by the OAuth2 resource server.
2. EmployeeJwtConverter: load the employee by id on every request, reject if inactive, take the role from the DATABASE not the token.
3. SecurityFilterChain: stateless, CSRF off, URL rules from blueprint 13.2 (/hr/** HR, /manager/** MANAGER or HR, /demo/** HR, /internal/** permitted but guarded by X-Cron-Secret header check, everything else authenticated), 401 and 403 returned as problem+json.
4. CurrentUser helper that gives the authenticated Employee id. Client-supplied employee ids are never trusted.
5. Tests: login success and failure (same message for wrong email or wrong password), expired token, tampered token, deactivated user with a valid token gets 401, role demoted in DB takes effect immediately, endpoint access by role.

Commit "feat: security". Print the endpoint-role table you implemented.
```
Done when: security tests green.

### PHASE 5: Balance module

```text
Implement the balance module. Read blueprint section 12 and BUILD.md 2.4.

1. BalanceService is the ONLY writer of leave_balances. Operations reserve, consume, release, restore, each as ONE guarded native UPDATE (conditional WHERE) followed by a ledger row in the same transaction. Days used are the request's paid_days.
2. BalanceInitializer: create balance rows for an employee's join year via ProRatingCalculator, ledger ENTITLEMENT_GRANT with a note containing the calculation. Lazy creation for later years using INSERT ... ON CONFLICT DO NOTHING.
3. A method to lock a balance row FOR UPDATE and return its available amount (used by submit in phase 6).
4. A test-only ReconciliationHelper implementing the blueprint 12.7 query and an InvariantChecker asserting INV1, INV2, INV6 that other tests call after each scenario.
5. Tests including concurrency: 20 threads reserving against a balance that fits only some of them, total reserved never exceeds available, reconcile is empty; release/consume/restore guard failures throw IllegalStateException and roll back.

Commit "feat: balances". Print test summary.
```
Done when: concurrency test passes repeatedly (run it 20 times).

### PHASE 6: Leave submission and preview (with unpaid split)

```text
Implement leave preview and submission. Read blueprint 9.1 and 11, and BUILD.md 2.4 (this replaces the INSUFFICIENT_BALANCE flow).

1. POST /api/v1/leave-requests/preview: no side effects. Returns workingDays, excluded dates with reason, paidDays, unpaidDays, estimatedDeduction, deductionBreakdown, salarySet, balanceBefore, balanceAfter, conflict counts (names hidden for the employee), warnings.
2. POST /api/v1/leave-requests body {leaveTypeId,startDate,endDate,reason?,handoverNotes?,acknowledgeUnpaid?}. One transaction, this order: resolve requester from JWT; validate (dates, join date, single calendar year, max horizon, backdate rule per type); compute working days; resolve approvers (skip manager stage if no manager, NO_ELIGIBLE_APPROVER if none); refuse with COVERAGE_COMMITMENT_CONFLICT if the employee has ACCEPTED coverage overlapping (auto-decline their OFFERED ones); lock balance row FOR UPDATE; compute paid/unpaid split; if unpaidDays > 0 and not acknowledged return 422 UNPAID_ACKNOWLEDGEMENT_REQUIRED with details; insert request with saveAndFlush (exclusion constraint maps to OVERLAPPING_REQUEST); reserve paid days; store conflict snapshot; set status and deadline through the state machine; write SUBMITTED (or SUBMIT_TO_HR plus MANAGER_STAGE_SKIPPED) event; notify.
3. Server computes everything. Ignore any client-sent days or status.
4. Notification table and NotificationService (in-app rows written in the same transaction). GET /me/notifications and POST read.
5. GET /leave-requests/mine and GET /leave-requests/{id} (owner, approvers in scope, HR; 404 when not visible; conflict counts for the owner and names for manager/HR).
6. Integration tests: valid submit, weekend-only, holiday inside, before join date, cross-year, overlap (sequential and 5 concurrent threads -> exactly one), fractional available balance, unpaid days needing acknowledgement, UNPAID type, no manager, salary 0. Run InvariantChecker after each.

Commit "feat: leave submission". Print the error codes returned and the test summary.
```
Done when: all submit scenarios and invariants pass.

### PHASE 7: Workflow engine and approvals

```text
Implement the workflow engine, the core of the project. Read blueprint sections 8, 9.2 to 9.7, 13, 19.

1. LeaveWorkflowService.act(requestId, event, actor, expectedStatus, comment) is the ONLY status mutator. Steps under one transaction: lock request row FOR UPDATE (3s timeout) -> LeaveAuthorizationService (404 if not visible, 403 if not allowed, uses ApprovalAuthorityResolver) -> expectedStatus check (409 STALE_STATE) -> LeaveStateMachine.next (409 ILLEGAL_TRANSITION) -> guards (comment required on reject, cancel-approved only if start_date is after today) -> balance effect -> request.moveTo(...) sets stage timestamps, deadline, resets escalation level -> audit event with next seq -> notifications.
2. Balance effects use paid_days: approve at HR = consume; reject or cancel pending = release; cancel approved = restore.
3. Side effect: when a request becomes REJECTED or CANCELLED, call CoverageService.withdrawAllFor(request) if it exists (leave a clear hook if phase 9 is not built yet).
4. Endpoints: POST /leave-requests/{id}/manager/approve|reject, /hr/approve|reject, /cancel. Detail response includes allowedActions[], escalated, escalationLevel, stageDeadlineAt and the event timeline. GET /meta/workflow returns states, events and allowed transitions.
5. Queues: GET /manager/queue?scope=pending|escalated|history and GET /hr/queue?scope=pending|escalated|manager-stage-escalated|history.
6. ArchUnit is NOT required. Instead add a simple test that greps the source tree and fails if setStatus or moveTo is referenced outside the workflow package.
7. Tests: full happy path, reject at each stage, cancel pending and cancel approved (balance restored), HR approving before manager -> 409, other team's manager -> 403, self-approval -> 403, stale expectedStatus -> 409, 10 threads approving the same request -> exactly one success, manager approve vs employee cancel race, endpoint x role matrix. InvariantChecker after every test.

Commit "feat: workflow engine". Print the transition and authorization test matrix summary.
```
Done when: all lifecycle and race tests pass repeatedly.

### PHASE 8: Escalation

```text
Implement automatic escalation. Read blueprint section 10 fully.

1. EscalationScheduler (@Scheduled fixedDelay from config, @EnableScheduling in a config class, NOT @Transactional) calls DueRequestFinder.findDueIds(now, batchSize) then LeaveWorkflowService.systemEscalate(id, now) per id in its own transaction with try/catch per item.
2. systemEscalate: lock row; re-check under lock (pending, deadline not null and due); use EscalationPolicy.next; validate ESCALATE through the state machine (status unchanged); set level, escalated_at, next deadline or NULL; write ESCALATED event with metadata; notify new approvers, the original approver and the employee. Never approve or reject.
3. Stage deadlines are stored at stage entry (already done in phases 6 and 7). Config-driven timeouts, demo profile values 60s, 60s, 90s with poll every 5s.
4. POST /internal/escalation/run guarded by header X-Cron-Secret (constant-time compare): runs one sweep synchronously. Same sweep also expires OFFERED coverage assignments whose leave start date has arrived (leave the coverage part as a TODO hook until phase 9).
5. Demo-only endpoints (profile demo, HR role): POST /demo/scheduler/run-now, POST /demo/leave-requests/{id}/expire-stage, POST /demo/reset.
6. Tests with MutableClock and no Thread.sleep: advance past deadline -> level 1, second sweep no change, level 2, approval between rungs, HR-stage alert, downtime catch-up, config change does not alter stored deadlines, one failing item does not block the batch, sweep run twice concurrently plus an approval -> exactly one ESCALATED event and no exception.

Commit "feat: escalation". Print the ladder behaviour table you verified.
```
Done when: escalation suite green, no sleeps.

### PHASE 9: Coverage (work split)

```text
Implement the coverage module exactly as specified in BUILD.md section 2.1, 2.3 and 2.5.

1. CoverageService is the ONLY writer of coverage_assignments. Operations: suggestions, offer, accept, decline, withdraw, withdrawAllFor(request), expireDue(now), autoDeclineOverlapping(employee, range).
2. Every operation locks the parent leave_requests row first, then the assignment row. Offer validates: actor is the requester's manager or HR, request status is PENDING_MANAGER/PENDING_HR/APPROVED and end_date >= today, candidate eligibility (CoverageRules), share sum <= 100 (COVERAGE_OVERSHARE), monthly cap (COVERAGE_CAP_EXCEEDED), snapshot covered days and allowance (PayCalculator). Accept re-validates cap and leave overlap under lock. Decline needs no reason and stores no penalty or counter.
3. Suggestions ranking: fewest covered days in the last 90 days, then fewest leave days. Returns load and eligibility reason. Never returns salary or allowance to managers.
4. Endpoints from BUILD.md 2.7 (coverage list, suggestions, offers, accept, decline, withdraw, GET /me/coverage with monthly load versus cap). Amounts visible only to the covering employee (and HR in the payroll statement).
5. Wire the hooks: withdrawAllFor from the workflow side effect (phase 7), expireDue from the escalation sweep (phase 8), autoDeclineOverlapping and the COVERAGE_COMMITMENT_CONFLICT check from submit (phase 6).
6. Derived coverageStatus NONE/PARTIAL/FULL in the request detail. Notifications: offered (to teammate), accepted/declined (to manager), withdrawn (to teammate).
7. Tests: everything in BUILD.md 2.9 including two teammates accepting at once, cap breached by concurrent offers, cancellation auto-withdraw with no orphan rows, month-crossing allowance split, teammate leave conflict. InvariantChecker extended: share sum <= 100 per request, no active assignments on terminal requests.

Commit "feat: coverage". Print the test summary.
```
Done when: coverage tests and invariants pass.

### PHASE 10: Read APIs, HR admin, payroll statement, dashboard

```text
Implement the remaining APIs. Read blueprint section 14 and BUILD.md 2.6, 2.7.

1. GET /manager/team-calendar?from&to (names, status, teamSize, allowedAbsent, exceeded), GET /hr/leave-requests with filters and paging, GET /hr/employees, POST /hr/employees (creates prorated balances through BalanceInitializer in the same transaction, validates manager: not self, no cycle, active), GET /hr/teams, PUT /hr/teams/{id} threshold, GET /hr/holidays, POST/DELETE /hr/holidays, GET /me/balances, GET /leave-types.
2. Payroll statement computed on read: GET /me/payroll/adjustments?month and GET /hr/payroll/adjustments?month&teamId per BUILD.md 2.6 (CONFIRMED vs PROJECTED). Managers get 403.
3. GET /dashboard/summary role-aware, real counts only: employee (available paid days per type, pending requests, coverage offers waiting), manager (awaiting decision, escalated, team off today, coverage gaps), HR (awaiting HR, escalated, employees on leave today, requests this month). No fabricated values.
4. Privacy: employees never receive teammates' names in conflict data; managers see names only for their reports; only HR sees salary-derived amounts; a covering employee sees only their own allowance.
5. Tests: endpoint x role matrix for every endpoint (no token, employee, manager own/other, HR), privacy assertions, payroll statement numbers checked against hand-calculated cases (including a month-crossing leave and a cancelled approved leave disappearing).

Commit "feat: read apis and admin". Print the final endpoint list grouped by role.
```
Done when: matrix test green for all endpoints.

### PHASE 11: Backend hardening and freeze gate

```text
Harden the backend and prepare the freeze. Read blueprint Appendix B and C.

1. Walk Appendix B failure register item by item. For each, confirm an automated test exists; write the missing ones. Add the extra cases from BUILD.md 2.9.
2. Run the whole concurrency suite as repeated tests (20 repetitions) and fix any flakiness at the root cause.
3. Ensure InvariantChecker runs in an @AfterEach for every integration test class. Add the reconcile query as GET /hr/balances/reconcile (HR only) returning an empty list when healthy.
4. Verify no stack trace, SQL or class name can reach an API response (test a forced 500).
5. OpenAPI cleanup: tags, descriptions, error schemas. Export docs/openapi.json.
6. Create api.http (or a Bruno/Postman collection) in docs/ that runs the full demo scenario from blueprint section 24, extended with coverage and unpaid-leave steps, against the demo profile.
7. Add a test-time data volume check: seed 200 employees and 3000 requests and assert queue and calendar queries finish under 300 ms (log a warning instead of failing if the CI machine is slow).
8. Update README with the state table, escalation ladder, coverage and payroll rules, and the run instructions.

Then run Appendix C as a checklist and print each item with pass or fail. Fix every failure. Tag v1.0-backend.
```
Done when: Appendix C is fully green. Do not start the UI before this.

### PHASE 12: Backend deployment (before the UI)

```text
Deploy the backend and database so the UI can be built against the real thing.

1. Prepare a Vercel Marketplace Postgres (Neon). Give me exact steps to create it and where to copy the connection string; convert it to a JDBC URL with sslmode=require and use the DIRECT connection. Confirm CREATE EXTENSION btree_gist works, and Flyway migrations run against it.
2. Give me exact steps to deploy backend/Dockerfile on a free Docker host (Render preferred; alternatives Railway, Fly.io), with the env vars from BUILD.md section 4 and the demo profile. Health check path /actuator/health.
3. Add a scripts/smoke.sh that logs in as the demo users against the deployed URL and runs a submit, manager approve, HR approve, and prints the resulting balance.
4. Give me the exact setup for a free external pinger (cron-job.org or a GitHub Actions schedule) hitting /actuator/health and POST /internal/escalation/run with X-Cron-Secret every 5 to 10 minutes.
5. Document cold start behaviour and the 5-minute pre-demo warm-up in README.

Do not change application code except config. Tag v1.0-deployed when smoke.sh passes against the live URL.
```
Done when: smoke.sh passes against the live URL.

### PHASE 13: Frontend foundation and design system

```text
Start the frontend in frontend/. First read BUILD.md section 5 (design rules) completely and follow every rule. Backend is frozen; do not change it. Use docs/openapi.json.

1. Vite + React + TypeScript strict, React Router, TanStack Query, React Hook Form + Zod, Tailwind, Radix primitives via shadcn/ui components restyled to the design rules (radius 6/10, no pills, no gradients, no shadows beyond a hairline). lucide-react icons only.
2. Design tokens in one file (colors, radii, spacing, type scale) exactly as in BUILD.md section 5. Fonts: @fontsource-variable/geist and geist-mono, self-hosted. Verify the package names.
3. Generate API types from docs/openapi.json with openapi-typescript. API client: relative base /api/v1, Bearer token from memory plus sessionStorage, problem+json parsed into a typed ApiError with code, 401 -> logout and redirect.
4. Vite dev proxy /api -> http://localhost:8080. Add vercel.json with the /api rewrite to the backend URL (placeholder to fill) placed before the SPA fallback.
5. Auth context, RequireAuth, RequireRole, role-based route tree, app shell: top bar with logo text, square-cornered underline tabs per role, notification bell with unread count (poll 45s), user menu with logout.
6. Shared components: StatusBadge, EscalationBadge, EmptyState, ErrorState, Skeleton rows, DataTable (sticky header, tabular numerals, pagination), KpiCard, BalanceBar (used, pending, available segments with numbers), Timeline, ConflictBanner, UnpaidNotice, ConfirmDialog, InitialsAvatar, Money and DateText formatters (INR en-IN, date-only strings with no timezone traps).
7. Login page: compact form, product name, one functional line, no hero copy.
8. A /dev/kit route (dev only) rendering every shared component in every state for visual review.

Vitest tests for formatters, ApiError parsing and RequireRole. Commit "feat: frontend foundation". Screenshot-ready: run the app and tell me which routes to open.
```
Done when: login works against the backend, kit page looks right.

### PHASE 14: Employee screens

```text
Build the employee experience. Follow BUILD.md section 5 strictly and blueprint section 17. Use only real API data.

1. Dashboard: greeting with name and today's date, KPI cards from GET /dashboard/summary (available paid days, pending requests, coverage offers waiting), balance section with BalanceBar per leave type (entitled, used, pending, available with exact numbers), my recent requests table, right rail: next approved leave and unread notifications. No fabricated stats.
2. Apply leave: form (type, dates, reason, handover notes) with LIVE preview from /leave-requests/preview: working days, excluded weekends and holidays with names, balance after, teammate absence count warning (amber, non-blocking). When unpaidDays > 0 show UnpaidNotice: "N of M days exceed your paid leave. Estimated deduction: Rs X." with a per-month breakdown and a required confirmation checkbox that sets acknowledgeUnpaid. If salary is not set show "Salary not set". Submit disabled while invalid or in flight. Map every API error code to a clear inline message.
3. My requests: table with status filter and pagination, status and escalated badges.
4. Request detail: timeline of events (who, when, comment), current stage and deadline, coverage status and who is covering (no amounts unless it is my own), handover notes, cancel button when allowedActions has it, expectedStatus sent with every action, 409 STALE_STATE handled with refetch.
5. Coverage inbox (GET /me/coverage): offers with the absent colleague's name, dates, share, covered days, handover notes, MY allowance amount, my monthly load versus cap, Accept and Decline (no reason required). Show accepted commitments too.
6. Pay impact page (GET /me/payroll/adjustments): month selector, base salary, leave deduction, coverage allowance, net adjustment, each marked Confirmed or Projected, with the "estimate" wording.
7. Loading, empty, error states everywhere. Vitest tests for the form validation, unpaid flow and 409 handling. Playwright smoke test: login as an employee, apply, see it pending.

Commit "feat: employee ui". Run the app against the deployed or local backend and list any defect you found and fixed.
```
Done when: full employee flow works with no console errors.

### PHASE 15: Manager screens

```text
Build the manager experience. Follow BUILD.md section 5 and blueprint section 17.

1. Dashboard: KPI cards (awaiting your decision, escalated to you, team off today over team size, coverage gaps), approval queue table with tabs Pending, Escalated to me, History (escalated rows carry the Escalated badge), right rail: who is off this week (names, dates) and requests that still need coverage.
2. Request review page: employee, dates, working days, reason, handover notes, LIVE conflict banner (amber, names and statuses of teammates off, allowed versus actual per day), coverage panel, approve and reject with ConfirmDialog (reject requires a comment), expectedStatus on every action, stale handling. The conflict banner never disables the approve button. Never show salary or any amount to the manager.
3. Coverage panel: ranked suggestions with covered days in the last 90 days and eligibility reasons, "Offer coverage" dialog (share percent, note, with remaining unassigned percent shown), list of current assignments with status and Withdraw. Explain in one plain sentence that teammates can decline. Show FULL, PARTIAL or NONE coverage.
4. Team calendar: month grid built by hand, one row per report, days colored by status, days over the threshold outlined in amber, legend, month navigation. No third-party calendar library.
5. Playwright smoke test: manager approves a request and the queue updates.

Commit "feat: manager ui". List defects found and fixed.
```
Done when: approve, reject, coverage offer and calendar all work.

### PHASE 16: HR screens

```text
Build the HR experience. Follow BUILD.md section 5.

1. Dashboard: KPI cards (awaiting HR, escalated, on leave today, requests this month), HR queue with tabs Pending HR, Escalated, Manager stage escalated (HR acting for an unresponsive manager, labelled clearly), History. Right rail: employees on leave today and this month's payroll adjustment totals.
2. Request review page with the same components as the manager but HR actions per allowedActions, timeline including ESCALATED events, coverage view with amounts visible, unpaid breakdown.
3. All requests: filters (team, employee, status, type, dates), paging.
4. Employees: list, and "Add employee" form with a live pro-rated entitlement preview (uses the same rule as the backend, computed by calling a preview or showing the result after creation if no preview endpoint exists).
5. Payroll statement: month selector, table per employee (base salary, leave deduction, coverage allowance, net adjustment, Confirmed or Projected), totals row.
6. Holidays and team thresholds: read-only tables (editing is API-only in this prototype).
7. Demo tools panel (visible only when the backend reports the demo profile): run escalation now, expire a request's stage, reset data.
8. Playwright smoke test: HR approves a request that is at the HR stage.

Commit "feat: hr ui". List defects found and fixed.
```
Done when: HR can complete the full chain and see payroll figures.

### PHASE 17: QA and polish pass

```text
Do a strict quality pass across the whole frontend. No new features.

1. Visual audit against BUILD.md section 5. Search the codebase and fix: any gradient, any pill-shaped control (border-radius above 8px on buttons or badges), any emoji, any em dash or en dash in user-facing strings, any placeholder or lorem text, any scroll-triggered animation, any non-Geist font, any hardcoded number displayed to users that is not from the API. Add a test or lint script that fails on those patterns.
2. Check every screen at 1440, 1024 and 390 widths. Fix overflow, truncation, table scrolling and tap target sizes.
3. Check every list and form for loading, empty, error and success states, and every mutation for disabled-while-in-flight and error mapping.
4. Accessibility: keyboard order, visible focus, dialog focus trap, labels on every control, AA contrast, reduced-motion support.
5. Console must be clean (no errors or warnings) across the full demo scenario from blueprint section 24 run in the browser with Playwright.
6. Performance: no unnecessary refetch loops, sensible staleTime, bundle split per role route.
7. Copy review: plain, specific sentence case text everywhere.

Print a before and after list of defects. Tag v1.1-ui.
```
Done when: lint rule for banned patterns passes and the Playwright demo run is clean.

### PHASE 18: Vercel deployment and demo rehearsal

```text
Deploy the frontend and rehearse the demo.

1. Give me exact steps to import the repo into Vercel (root directory frontend, Vite preset), fill the backend URL in vercel.json, and confirm /api rewrites work and deep links to React routes work (SPA fallback).
2. Run the three Playwright smoke tests against the deployed URL.
3. Write docs/DEMO.md: a numbered script (about 8 minutes) covering: employee applies with a holiday inside; conflict flag shown to the manager; manager approves; double-click gives the stale message; HR tries to approve out of order and gets the illegal transition response; HR approves; escalation happening live with the demo timeouts and HR acting at manager stage; a teammate joining mid-year with pro-rated balance and the unpaid-days warning with the salary estimate; manager splits coverage and a teammate accepts and sees the allowance; a rejection releasing balance; cancelling approved future leave restoring balance; the reconcile endpoint returning empty; the workflow table at /meta/workflow.
4. Add a "reset demo data" step and a pre-demo checklist (warm the backend, log in as each role once, confirm timeouts).
5. Update README with live URLs, demo credentials, architecture diagram and the design decisions.

Tag v2.0. Print the final checklist with pass or fail.
```
Done when: the demo script runs end to end on the live URLs.

---

## 7. Demo accounts (seeded by phase 3)

| Role | Name | Purpose |
|---|---|---|
| HR | Hannah, Harish | Two HR users on purpose so segregation of duties never deadlocks |
| Manager | Meera | No manager of her own, so her leave skips the manager stage |
| Employees | Arun, Bala, Chitra, Divya | Team of four, 25 percent threshold, Divya joined mid-year (pro-rated) |

Use one documented demo password from the seed script. Never reuse it anywhere real.
