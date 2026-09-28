# LeaveFlow

[![Java](https://img.shields.io/badge/Java-21-orange.svg?style=flat-square&logo=openjdk)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.x-brightgreen.svg?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38b2ac.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](#)

> **Enterprise-Grade Leave Management, Automated Escalations, Peer Work Coverage, and Real-Time Payroll Adjustment System.**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Core Architectural Principles & Safety Invariants](#core-architectural-principles--safety-invariants)
4. [Key Functional Modules](#key-functional-modules)
   - [1. Deterministic 5-State Workflow Machine](#1-deterministic-5-state-workflow-machine)
   - [2. Automated SLA Escalation Ladder](#2-automated-sla-escalation-ladder)
   - [3. Pro-Rated Entitlements & Double-Entry Ledger](#3-pro-rated-entitlements--double-entry-ledger)
   - [4. Loss of Pay (LOP) & Unpaid Split Engine](#4-loss-of-pay-lop--unpaid-split-engine)
   - [5. Opt-In Peer Work Coverage & Fair Allocation](#5-opt-in-peer-work-coverage--fair-allocation)
   - [6. Team Absence Conflict & Capacity Detection](#6-team-absence-conflict--capacity-detection)
   - [7. Real-Time Payroll Adjustment Statement](#7-real-time-payroll-adjustment-statement)
5. [Database Schema & Hardening Invariants](#database-schema--hardening-invariants)
6. [Comprehensive API Reference](#comprehensive-api-reference)
   - [Authentication & Identity](#authentication--identity)
   - [Leave Requests & Balances](#leave-requests--balances)
   - [Peer Work Coverage](#peer-work-coverage)
   - [Manager Approvals & Team Calendar](#manager-approvals--team-calendar)
   - [HR Administration & System Policy](#hr-administration--system-policy)
   - [Payroll Statements](#payroll-statements)
   - [Dashboard Metrics & Meta](#dashboard-metrics--meta)
   - [Internal & Demo Simulation Tools](#internal--demo-simulation-tools)
   - [RFC 7807 Error Code Matrix](#rfc-7807-error-code-matrix)
7. [Demo Accounts & Seed Data](#demo-accounts--seed-data)
8. [Getting Started & Local Development](#getting-started--local-development)
   - [Prerequisites](#prerequisites)
   - [Environment Configuration](#environment-configuration)
   - [1. Start Database (PostgreSQL 16)](#1-start-database-postgresql-16)
   - [2. Start Spring Boot Backend](#2-start-spring-boot-backend)
   - [3. Start React Frontend](#3-start-react-frontend)
9. [UI & Design System Specification](#ui--design-system-specification)
10. [Automated Testing & Invariant Verification](#automated-testing--invariant-verification)
11. [Production Deployment Architecture](#production-deployment-architecture)
12. [Architecture Decision Records (ADRs)](#architecture-decision-records-adrs)

---

## Executive Summary

**LeaveFlow** is an enterprise leave management platform engineered to overcome the chronic failure modes of standard HR workflows:

- **Eliminates Deadlocks & Out-of-Order Approvals**: Employs a deterministic 5-state machine backed by row-level locking (`SELECT ... FOR UPDATE`) with a strict lock acquisition hierarchy (`leave_requests` &rarr; `coverage_assignments` &rarr; `leave_balances`).
- **No Combinatorial State Explosions**: Escalation is modeled as an *event and level*, not a mutated status, keeping workflow queries fast, uniform, and unfragmented.
- **Fair, Unforced Work Redistribution**: Leaves do not leave teams stranded. Managers split workloads across peers with an opt-in model that calculates financial coverage allowances, enforces monthly workload caps (default: 5 days/month), and recommends teammates based on 90-day fairness algorithms.
- **Transparent Loss of Pay (LOP) Tracking**: Eliminates blunt `INSUFFICIENT_BALANCE` rejections. Leave requests exceeding balance automatically split into `paid_days` and `unpaid_days`, calculating precise daily salary deductions by month with mandatory employee acknowledgment.
- **Bulletproof Financial & Absence Invariants**: Enforces double-entry audit ledgers, PostgreSQL `btree_gist` exclusion constraints against date overlaps, and append-only database triggers.

---

## System Architecture

```text
+-------------------------------------------------------------------------------------------------+
|                                         Web Browser                                             |
|                     React 18 SPA (Vite + TypeScript + Tailwind CSS + Radix UI)                  |
+-------------------------------------------------------------------------------------------------+
                                                  |
                                                  | HTTP / JSON REST
                                                  | RFC 7807 Problem Details
                                                  v
+-------------------------------------------------------------------------------------------------+
|                                 Spring Boot 3.5 Backend                                         |
|                                                                                                 |
|   +-----------------------------------------------------------------------------------------+   |
|   |                       Spring Security Filter & OAuth2 JWT Filter                        |   |
|   |                 (Role-based authorization: EMPLOYEE, MANAGER, HR)                       |   |
|   +-----------------------------------------------------------------------------------------+   |
|                                                  |                                              |
|         +----------------------------------------+------------------------------------+         |
|         |                                        |                                    |         |
|         v                                        v                                    v         |
|  +--------------------+               +--------------------+               +-----------------+  |
|  | LeaveWorkflowSvc   |               |   BalanceService   |               | CoverageService |  |
|  | (5-State Engine)   |               | (Reserve / Consume)|               | (Offers & Caps) |  |
|  +--------------------+               +--------------------+               +-----------------+  |
|         |                                        |                                    |         |
|         +----------------------------------------+------------------------------------+         |
|                                                  |                                              |
|                                                  v                                              |
|                                     +-------------------------+                                 |
|                                     |   EscalationScheduler   |                                 |
|                                     | (@Scheduled & Cron API) |                                 |
|                                     +-------------------------+                                 |
+-------------------------------------------------------------------------------------------------+
                                                  |
                                                  | JDBC / HikariCP Pool
                                                  | (Row-level Locks: FOR UPDATE)
                                                  v
+-------------------------------------------------------------------------------------------------+
|                                     PostgreSQL 16 Engine                                        |
|                                                                                                 |
|  [btree_gist Exclusion Constraints]       [Append-Only Event Triggers]                          |
|  - Prevent overlapping active leaves       - Immutable leave_request_events                      |
|                                            - Immutable leave_balance_ledgers                     |
|                                                                                                 |
|  [CHECK Constraints]                      [Double-Entry Balance Accounting]                     |
|  - paid_days + unpaid_days = working_days  - Entitled, Carried, Adjustment, Pending, Used       |
+-------------------------------------------------------------------------------------------------+
```

---

## Core Architectural Principles & Safety Invariants

### 1. Deterministic 5-State Machine
Only five distinct states exist:
`PENDING_MANAGER` &rarr; `PENDING_HR` &rarr; `APPROVED` &rarr; `REJECTED` &rarr; `CANCELLED`.
Transitions are validated against an immutable state lookup matrix. Only `LeaveWorkflowService` can mutate request status; entities have no public status mutators.

### 2. Strict Lock Order Hierarchy
To mathematically preclude deadlock conditions across concurrent user actions:
$$\text{Lock Order: } \mathbf{leave\_requests} \longrightarrow \mathbf{coverage\_assignments} \longrightarrow \mathbf{leave\_balances}$$
*(Exception: Initial submit locks the balance row first to compute paid/unpaid split atomically before row insertion, safe because the new request row is uncommitted and invisible to concurrent transactions).*

### 3. Temporal & Precision Discipline
- **Temporal Handling**: All timestamps originate from an injected `java.time.Clock` pinned to the corporate timezone (`Asia/Kolkata`). Direct calls to `LocalDate.now()` or `Instant.now()` are prohibited.
- **Monetary & Day Arithmetic**: All quantities, shares, working days, daily rates, and deduction figures are strictly `BigDecimal` using `HALF_UP` rounding. `double` or `float` are never used.

### 4. Database-Enforced Invariants
- `btree_gist` exclusion constraint prevents concurrent or overlapping active leaves for the same employee at the database level (`23P01`).
- Append-only PostgreSQL triggers guarantee `leave_request_events` and `leave_balance_ledgers` cannot be updated or deleted.
- Schema validation via Hibernate `ddl-auto: validate`; Flyway owns migrations end-to-end.

---

## Key Functional Modules

### 1. Deterministic 5-State Workflow Machine

```text
               +-------------------------------------------+
               |                  [NEW]                    |
               +-------------------------------------------+
                                     |
                         +-----------+-----------+
                         | SUBMIT                | SUBMIT_TO_HR (No Manager)
                         v                       v
               +-------------------+   +-------------------+
               |  PENDING_MANAGER  |   |    PENDING_HR     |
               +-------------------+   +-------------------+
                         |                       |
           +-------------+-------------+         |
           |             |             |         |
    MANAGER_APPROVE MANAGER_REJECT   CANCEL      |
           |             |             |         |
           v             |             |         |
     +------------+      |             |         |
     | PENDING_HR |      |             |         |
     +------------+      |             |         |
           |             |             |         |
     +-----+-----+       |             |         |
     |           |       |             |         |
 HR_APPROVE  HR_REJECT   |             |         |
     |           |       |             |         |
     v           v       v             v         |
+----------+   +-------------------+   +-------------------+
| APPROVED |   |     REJECTED      |   |     CANCELLED     |
+----------+   +-------------------+   +-------------------+
     |                                           ^
     | CANCEL (Future start_date only)           |
     +-------------------------------------------+
```

- **Rejections**: Require an explicit non-empty comment. Instantly releases all reserved `paid_days` and auto-withdraws active coverage assignments.
- **Cancellations**: 
  - If `PENDING`: Releases reserved `paid_days`.
  - If `APPROVED`: Permitted only when `start_date > today`. Restores consumed days back to available balance via ledger `RESTORE`. Auto-withdraws active coverage assignments.

---

### 2. Automated SLA Escalation Ladder

Escalations protect requests from stalling due to unresponsive managers.

```text
[PENDING_MANAGER] 
       | (SLA Elapsed: 48h / Demo: 60s)
       v
  [ESCALATE Event -> Level 1] (Escalated to Skip-Level Manager)
       | (SLA Elapsed: 24h / Demo: 60s)
       v
  [ESCALATE Event -> Level 2] (Escalated to HR Queue)
       |
       +--> HR may act directly on behalf of the unresponsive manager.
```

- **Non-Mutating State**: The request remains in `PENDING_MANAGER` or `PENDING_HR`; `escalation_level` is set to 1 or 2, and an `ESCALATED` audit event is recorded.
- **Safety**: The scheduler never auto-approves or auto-rejects.

---

### 3. Pro-Rated Entitlements & Double-Entry Ledger

Leave balance accounting follows double-entry principles across five explicit columns in `leave_balances`:
$$\text{Available} = \text{Entitled} + \text{Carried} + \text{Adjustment} - \text{Used} - \text{Pending}$$

$$\text{Database Invariant: } \mathbf{Pending + Used \le Entitled + Carried + Adjustment}$$

Every state transition writes an immutable audit record in `leave_balance_ledgers`:
- `ENTITLEMENT_GRANT`: Initial join-date accrual.
- `RESERVE`: Reserving `paid_days` upon submission.
- `RELEASE`: Unlocking reserved days upon rejection or cancellation while pending.
- `CONSUME`: Converting reserved days to `used` upon final HR approval.
- `RESTORE`: Returning used days back to balance upon cancellation of future approved leave.

#### Mid-Year Joiner Pro-Rating Formula
For an employee joining on date $D$ in a year with total days $Y$ (365 or 366):
$$\text{Entitlement} = \text{round\_to\_half}\left( \text{AnnualEntitlement} \times \frac{\text{DaysFromJoinToEndOfYear}}{Y} \right)$$
*Example*: Divya joins on July 1, 2026. Annual entitlement = 18.0 days.
$$\text{Entitlement} = \text{round\_to\_half}\left(18.0 \times \frac{184}{365}\right) = 9.0\text{ days}$$

---

### 4. Loss of Pay (LOP) & Unpaid Split Engine

Instead of rejecting employees whose balance is exhausted, LeaveFlow automatically allocates the requested range:
$$\text{paid\_days} = \min(\text{working\_days}, \max(\text{available}, 0))$$
$$\text{unpaid\_days} = \text{working\_days} - \text{paid\_days}$$

1. **Date-Ordered Consumption**: Paid days are allocated to the earliest working days; the trailing days become unpaid.
2. **Explicit Acknowledgment**: When `unpaid_days > 0`, submission requires `acknowledgeUnpaid = true`. Otherwise, the server responds with `422 UNPAID_ACKNOWLEDGEMENT_REQUIRED` containing the exact deduction breakdown.
3. **Monthly Salary Deduction Calculation**:
   $$\text{Daily Rate}_{\text{month}} = \frac{\text{Monthly Base Salary}}{\text{Working Days in Month (excluding weekends \& holidays)}}$$
   $$\text{Deduction} = \text{unpaid\_days}_{\text{month}} \times \text{Daily Rate}_{\text{month}}$$

---

### 5. Opt-In Peer Work Coverage & Fair Allocation

Coverage allows work to be split among peers without blocking the approval workflow.

```text
                  +-------------+
                  |   OFFERED   |
                  +-------------+
                         |
           +-------------+-------------+
           |                           |
           v                           v
     +------------+             +-------------+
     |  ACCEPTED  |             |   DECLINED  |
     +------------+             +-------------+
           |
     +-----+-----+
     |           | (Leave Cancelled or Rejected)
     v           v
[ACTIVE]   [WITHDRAWN]
```

- **Fairness-Ranked Suggestions**: Suggests colleagues from the same team ordered by fewest covered days in the last 90 days, then fewest leave days taken. Never exposes teammates' salaries to managers.
- **Hard Monthly Load Cap**: Teammates cannot hold more than **5 covered days** per calendar month across all active assignments.
- **Coverage Allowance**: Teammates receive an incentive allowance for covered days:
  $$\text{Allowance} = \text{Covered Days} \times \text{Covering Teammate Daily Rate} \times 20\%$$
- **Commitment Safeguard**: If an employee with an `ACCEPTED` coverage assignment attempts to submit leave on overlapping dates, submission is refused with `COVERAGE_COMMITMENT_CONFLICT`.

---

### 6. Team Absence Conflict & Capacity Detection

- **Live Capacity Monitoring**: Each team has a configured `max_absent_percent` threshold (default: 25.00%).
- **Calculation Formula**:
  $$\text{Allowed Absent} = \max\left(1, \left\lfloor \text{Team Size} \times \frac{\text{max\_absent\_percent}}{100} \right\rfloor\right)$$
- **Non-Blocking Awareness**: Conflict flags inform managers and HR of overlapping team absences without forcibly disabling the approval button.
- **Privacy Partitioning**: Requester employees only see an aggregated conflict count. Colleague names are strictly restricted to managers and HR.

---

### 7. Real-Time Payroll Adjustment Statement

Statements are computed dynamically on read without caching or stale snapshots:
- **Loss of Pay (LOP)**: Sum of unpaid deductions from `APPROVED` leaves (`CONFIRMED`) and pending leaves (`PROJECTED`).
- **Coverage Allowance**: Sum of coverage allowances from `ACCEPTED` assignments on `APPROVED` requests (`CONFIRMED`) or pending requests (`PROJECTED`).
- **Net Adjustment**:
  $$\text{Net Monthly Adjustment} = \text{Coverage Allowance} - \text{LOP Deduction}$$
- **Role Isolation**: Employees view their own statement only. HR can inspect statements organization-wide. Managers cannot access salary figures.

---

## Database Schema & Hardening Invariants

```text
       +-------------------+             +-----------------------+
       |       teams       |             |      leave_types      |
       +-------------------+             +-----------------------+
                 | 1                                 | 1
                 |                                   |
                 | *                                 | *
       +-------------------+             +-----------------------+
       |     employees     |<----------->|    leave_balances     |
       +-------------------+ 1         * +-----------------------+
                 | 1                                 | 1
                 |                                   |
                 | *                                 | *
       +-------------------+             +-----------------------+
       |  leave_requests   |             | leave_balance_ledgers |
       +-------------------+             +-----------------------+
        | 1        | 1                               ^
        |          +---------------------------------+
        | *
+-----------------------+
|  coverage_assignments |
+-----------------------+
```

### Table Definitions & Key Invariants

| Table | Primary Purpose | Hardening Constraints & Triggers |
|---|---|---|
| `teams` | Team definitions & absence thresholds | `max_absent_percent BETWEEN 0 AND 100` |
| `employees` | User directory, hierarchy, and salary | Unique `employee_code`, unique `email`, self-referencing `manager_id` |
| `leave_types` | Leave categories (Annual, Sick, Casual, Unpaid) | `annual_entitlement >= 0`, `backdate_days >= 0` |
| `leave_requests` | Core leave records with financial snapshots | `btree_gist` no-overlap exclusion constraint, `CHECK (paid_days + unpaid_days = working_days)` |
| `leave_request_events`| Immutable audit timeline of all transitions | Append-only trigger (`trg_leave_request_events_immutable` prohibits UPDATE/DELETE) |
| `leave_balances` | Double-entry quota balances per year | Unique `(employee_id, leave_type_id, year)`, `CHECK (pending + used <= entitled + carried + adjustment)` |
| `leave_balance_ledgers`| Audit ledger tracking every quota delta | Append-only trigger (`trg_leave_balance_ledgers_immutable` prohibits UPDATE/DELETE) |
| `coverage_assignments`| Opt-in peer work splits and allowances | Unique partial index on `(request_id, covering_employee_id)` for `OFFERED`/`ACCEPTED` |
| `holidays` | Corporate holiday calendar | Unique `date` constraint |
| `notifications` | In-app user alerts and messages | Foreign key to `recipient_id`, read status flag |

---

## Comprehensive API Reference

All requests accept and return `application/json` (or `application/problem+json` on errors). Endpoints require a Bearer token in the `Authorization` header unless marked public.

### Authentication & Identity

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Authenticates user credentials and returns a 60-minute JWT token. |
| `GET` | `/api/v1/auth/me` | Authenticated | Fetches profile, team details, role, and salary for the current user. |

### Leave Requests & Balances

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/leave-requests/preview` | Authenticated | Previews working days, holidays excluded, balance changes, and unpaid LOP deductions. |
| `POST` | `/api/v1/leave-requests` | Authenticated | Submits a leave request. Locks balance row, computes split, and reserves paid days. |
| `GET` | `/api/v1/leave-requests/mine` | Authenticated | Returns all leave requests submitted by the logged-in employee. |
| `GET` | `/api/v1/leave-requests/{id}` | Requester / Mgr / HR | Returns full details, audit event timeline, coverage assignments, and allowed actions. |
| `POST` | `/api/v1/leave-requests/{id}/cancel` | Requester / HR | Cancels a pending or future approved leave request; restores balance. |
| `POST` | `/api/v1/leave-requests/{id}/manager/approve`| Manager / HR | Approves request at Manager stage (transitions to `PENDING_HR`). |
| `POST` | `/api/v1/leave-requests/{id}/manager/reject` | Manager / HR | Rejects request at Manager stage (requires comment; releases balance). |
| `POST` | `/api/v1/leave-requests/{id}/hr/approve` | HR | Approves request at HR stage (transitions to `APPROVED`; consumes balance). |
| `POST` | `/api/v1/leave-requests/{id}/hr/reject` | HR | Rejects request at HR stage (requires comment; releases balance). |
| `GET` | `/api/v1/leave-types` | Authenticated | Lists all active leave policies and rules. |
| `GET` | `/api/v1/me/balances` | Authenticated | Returns current user leave quota balances for the selected year. |
| `GET` | `/api/v1/me/notifications` | Authenticated | Fetches in-app notifications for the logged-in user. |
| `POST` | `/api/v1/me/notifications/{id}/read` | Authenticated | Marks a specific notification as read. |
| `POST` | `/api/v1/me/notifications/read-all` | Authenticated | Marks all notifications as read. |

### Peer Work Coverage

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/leave-requests/{id}/coverage` | Requester / Mgr / HR | Lists coverage assignments for a request (allowance amounts visible only to covering peer/HR). |
| `GET` | `/api/v1/leave-requests/{id}/coverage/suggestions` | Manager / HR | Returns candidate suggestions ranked by fewest covered days in the last 90 days. |
| `POST` | `/api/v1/leave-requests/{id}/coverage/offers` | Manager / HR | Creates a coverage offer (`share_percent`, `coveringEmployeeId`). |
| `POST` | `/api/v1/coverage/{id}/accept` | Covering Employee | Accepts an offered assignment under lock; re-verifies monthly cap. |
| `POST` | `/api/v1/coverage/{id}/decline` | Covering Employee | Declines an offered assignment (no penalty, optional reason). |
| `POST` | `/api/v1/coverage/{id}/withdraw` | Manager / HR | Withdraws an offered or accepted coverage assignment. |
| `GET` | `/api/v1/me/coverage` | Authenticated | Returns incoming offers, accepted commitments, and monthly load vs 5-day cap. |

### Manager Approvals & Team Calendar

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/manager/queue` | Manager / HR | Retrieves queue (`?scope=pending`, `escalated`, or `history`). |
| `GET` | `/api/v1/manager/team-calendar` | Manager / HR | Returns day-by-day attendance grid and threshold breach indicators for `from` to `to`. |

### HR Administration & System Policy

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/hr/queue` | HR | Retrieves HR queue (`?scope=pending`, `escalated`, `manager-stage-escalated`, `history`). |
| `GET` | `/api/v1/hr/leave-requests` | HR | Filtered, paginated search across all organizational requests. |
| `GET` | `/api/v1/hr/employees` | HR | Lists all employees with reporting lines and salaries. |
| `POST` | `/api/v1/hr/employees` | HR | Onboards an employee and creates pro-rated balances in the same transaction. |
| `GET` | `/api/v1/hr/teams` | HR | Lists all teams and capacity limits. |
| `PUT` | `/api/v1/hr/teams/{id}` | HR | Updates team maximum absent percentage threshold. |
| `GET` | `/api/v1/hr/holidays` | HR | Lists all declared public holidays. |
| `POST` | `/api/v1/hr/holidays` | HR | Creates a new public holiday. |
| `DELETE`| `/api/v1/hr/holidays/{id}` | HR | Removes a declared public holiday. |
| `GET` | `/api/v1/hr/balances/reconcile` | HR | Asserts invariant consistency across `leave_balances` and ledger entries. |

### Payroll Statements

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/me/payroll/adjustments` | Authenticated | Fetches user's own monthly statement (base salary, LOP deductions, allowances, net). |
| `GET` | `/api/v1/hr/payroll/adjustments` | HR | Fetches monthly payroll adjustments organization-wide with optional `teamId` filter. |

### Dashboard Metrics & Meta

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | Authenticated | Role-aware KPI summary cards populated with live system counts. |
| `GET` | `/api/v1/meta/workflow` | Public | Returns the 5-state machine lookup matrix and valid transitions. |

### Internal & Demo Simulation Tools

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/internal/escalation/run`| `X-Cron-Secret` Header | Runs SLA escalation and coverage expiration sweep (called by external cron). |
| `POST` | `/api/v1/demo/scheduler/run-now`| HR (Demo profile) | Triggers immediate evaluation sweep of SLA deadlines. |
| `POST` | `/api/v1/demo/leave-requests/{id}/expire-stage` | HR (Demo profile) | Forces stage deadline expiration to test live escalations. |

### RFC 7807 Error Code Matrix

Every error returns `application/problem+json` containing a stable `code` and an MDC `traceId`.

| Error Code | HTTP Status | Root Cause & Resolution |
|---|---|---|
| `AUTHENTICATION_FAILED` | `401 Unauthorized` | Invalid username or password supplied. |
| `UNAUTHORIZED` | `401 Unauthorized` | Missing or invalid Bearer token. |
| `FORBIDDEN` | `403 Forbidden` | Access to this resource is prohibited for the user's role. |
| `SELF_APPROVAL_NOT_ALLOWED` | `403 Forbidden` | Managers cannot approve or reject their own leave requests. |
| `NOT_FOUND` | `404 Not Found` | Requested entity does not exist or user lacks permission to view it. |
| `VALIDATION_FAILED` | `400 Bad Request` | Request parameters failed validation (e.g. invalid date ranges). |
| `COMMENT_REQUIRED` | `400 Bad Request` | Rejections require an explicit, non-empty comment. |
| `CANNOT_CANCEL_PAST_LEAVE` | `400 Bad Request` | Approved leave can only be cancelled before the start date arrives. |
| `STALE_STATE` | `409 Conflict` | Optimistic lock detected concurrent modification. Refetch and retry. |
| `ILLEGAL_TRANSITION` | `409 Conflict` | State machine rejected the transition from current status. |
| `OVERLAPPING_REQUEST` | `409 Conflict` | Employee already has an active leave request covering the specified dates. |
| `COVERAGE_NOT_ALLOWED_STATE`| `409 Conflict` | Coverage offers are only valid for `PENDING_MANAGER`, `PENDING_HR`, or `APPROVED` requests. |
| `UNPAID_ACKNOWLEDGEMENT_REQUIRED` | `422 Unprocessable` | Leave exceeds paid balance. Must submit with `acknowledgeUnpaid = true`. |
| `COVERAGE_CAP_EXCEEDED` | `422 Unprocessable` | Teammate has reached the 5-day monthly coverage cap. |
| `COVERAGE_OVERSHARE` | `422 Unprocessable` | Total active coverage shares exceed 100% of the request. |
| `COVERAGE_CANDIDATE_UNAVAILABLE` | `422 Unprocessable` | Candidate belongs to another team, is inactive, or has overlapping leave. |
| `COVERAGE_COMMITMENT_CONFLICT` | `422 Unprocessable` | Employee has accepted coverage commitments during the requested dates. |
| `NO_ELIGIBLE_APPROVER` | `422 Unprocessable` | No direct manager or HR administrator exists to handle the request. |

---

## Demo Accounts & Seed Data

The `demo` profile auto-populates realistic enterprise accounts on startup:

> **Password for all seeded accounts**: `Password@123`

| Name | Role | Email | Base Salary | Scenario Profile |
|---|---|---|---|---|
| **Hannah Abbott** | `HR` | `hannah@leaveflow.internal` | ₹1,20,000 | Primary HR administrator. Full queue & payroll oversight. |
| **Harish Patel** | `HR` | `harish@leaveflow.internal` | ₹1,25,000 | Secondary HR administrator. Handles escalated requests. |
| **Meera Sharma** | `MANAGER` | `meera@leaveflow.internal` | ₹1,50,000 | Engineering Lead. Manages Arun, Bala, Chitra, and Divya. |
| **Arun Kumar** | `EMPLOYEE` | `arun@leaveflow.internal` | ₹80,000 | Senior Engineer. Standard full-year leave entitlement. |
| **Bala Vignesh** | `EMPLOYEE` | `bala@leaveflow.internal` | ₹75,000 | Software Engineer. Frequently takes coverage assignments. |
| **Chitra Devi** | `EMPLOYEE` | `chitra@leaveflow.internal` | ₹70,000 | QA Engineer. Active leave requester. |
| **Divya Ramesh** | `EMPLOYEE` | `divya@leaveflow.internal` | ₹65,000 | Mid-year joiner (July 1, 2026). Pro-rated 9.0-day annual balance. |

---

## Getting Started & Local Development

### Prerequisites

- **Java JDK 21+**
- **Node.js 18+ & npm**
- **Docker & Docker Compose** (for PostgreSQL 16)
- **Git**

### Environment Configuration

The repository contains `.env.example` in the root directory:

```properties
DB_URL=jdbc:postgresql://localhost:5432/leaveflow
DB_USER=leaveflow
DB_PASSWORD=leaveflow
JWT_SECRET=super-secret-key-that-is-at-least-32-bytes-long-for-hs256-signing
CRON_SECRET=demo-cron-secret-12345
LEAVE_TIMEZONE=Asia/Kolkata
PORT=8080
SPRING_PROFILES_ACTIVE=demo
```

### 1. Start Database (PostgreSQL 16)

```bash
docker compose up -d postgres
```

Verify that the database is healthy:
```bash
docker compose ps
```

### 2. Start Spring Boot Backend

```bash
cd backend
./mvnw spring-boot:run
```
*(On Windows PowerShell, run `.\mvnw.cmd spring-boot:run`)*

- **Backend API**: `http://localhost:8080`
- **Health Check**: `http://localhost:8080/actuator/health`
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON**: `http://localhost:8080/api-docs`

### 3. Start React Frontend

```bash
cd frontend
npm install
npm run dev
```

- **Frontend App**: `http://localhost:5173`

---

## UI & Design System Specification

The frontend adheres to strict enterprise UI principles defined in the project specification:

- **Color Palette**:
  - Canvas: `#F5F6F8` (Light neutral)
  - Cards: `#FFFFFF` with 1px border `#E4E7EC`
  - Accent: Deep Teal `#0B6E6E` (Hover `#095A5A`)
  - Status Badges:
    - `PENDING`: Amber text `#B54708` on `#FFFAEB`
    - `APPROVED`: Emerald text `#067647` on `#ECFDF3`
    - `REJECTED`: Crimson text `#B42318` on `#FEF3F2`
    - `CANCELLED`: Slate text `#475467` on `#F2F4F7`
    - `ESCALATED`: Outlined orange badge indicator
- **Typography**:
  - Geist Sans (variable) for UI copy
  - Geist Mono for money (INR formatting), dates, and employee codes
- **Strict Visual Restraints**:
  - Zero emoji anywhere in the UI.
  - No purple backgrounds, no glowing drop-shadows, no pill-shaped buttons.
  - Buttons and badges use clean `6px` / `10px` border-radii.
  - Every numerical metric on screen is derived directly from live API data.

---

## Automated Testing & Invariant Verification

### Backend Tests (JUnit 5 + AssertJ + Testcontainers)

```bash
cd backend
./mvnw clean test
```

Key test suites:
- **`LeaveStateMachineTest`**: Tests every permutation of `(CurrentState, Event)` including invalid attempts.
- **`WorkingDayCalculatorTest`**: Validates working day counts across multi-month intervals, holidays, and weekends.
- **`ProRatingCalculatorTest`**: Asserts exact pro-rata day grants for mid-year joiners across standard and leap years.
- **`PayCalculatorTest`**: Verifies exact monthly salary deduction splits and coverage allowance rates.
- **`CoverageRulesTest`**: Enforces candidate eligibility, share caps, and 5-day monthly workload ceilings.
- **`EscalationPolicyTest`**: Verifies 2-step escalation progression with and without skip-level managers.

### Frontend Tests (Vitest)

```bash
cd frontend
npm run test
```

Validates:
- RFC 7807 problem detail parsing into typed `ApiError`.
- INR currency formatters and UTC date converters.
- Role-based route authorization guards.

---

## Production Deployment Architecture

```text
Browser Client
     |
     | (HTTPS Requests)
     v
[ Vercel Edge Network ] (Frontend React SPA)
     |
     | vercel.json rewrite rule: /api/(.*) -> https://backend.internal/api/$1
     v
[ Docker Container Host ] (Render / Railway / Fly.io)
     |
     | Spring Boot 3.5 JRE (Profile: prod / demo)
     v
[ Managed PostgreSQL 16 ] (Neon / Supabase / Vercel Postgres)
     - btree_gist extension enabled
     - HikariCP max pool: 5
```

### Heartbeat & SLA Escalation Trigger
In serverless or auto-sleeping environments, configure an external cron job (e.g. `cron-job.org` or GitHub Actions) to ping the backend every 5 minutes:
```bash
curl -X POST https://your-backend.domain/api/v1/internal/escalation/run \
     -H "X-Cron-Secret: demo-cron-secret-12345"
```

---

## Architecture Decision Records (ADRs)

| ADR | Title | Summary |
|---|---|---|
| [ADR 0001](file:///docs/adr/0001-custom-state-machine.md) | Custom State Machine | Chose a table-driven Java state machine over Spring StateMachine for determinism and zero runtime overhead. |
| [ADR 0002](file:///docs/adr/0002-escalation-as-event-not-state.md) | Escalation as Event | Modeled escalation as an event + level rather than fracturing state into `ESCALATED_TO_SKIP_LEVEL`. |
| [ADR 0003](file:///docs/adr/0003-balance-reserve-consume-paid-unpaid-split.md) | Reserve / Consume Split | Replaced `INSUFFICIENT_BALANCE` rejections with automatic `paid_days` and `unpaid_days` LOP splits. |
| [ADR 0004](file:///docs/adr/0004-coverage-as-opt-in-side-workflow.md) | Work Coverage as Side Workflow | Modeled coverage as a non-blocking, opt-in side lifecycle with allowances and fairness ranking. |

---

## License

This software is developed and maintained as a proprietary enterprise solution. All rights reserved.
