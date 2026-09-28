# LeaveFlow

Modern, high-integrity enterprise leave management system featuring a 2-stage approval workflow (Manager → HR), automated escalation ladders, team absence conflict flags, pro-rated accrual balances, opt-in peer coverage with allowance splits, and real-time payroll impact adjustments.

---

## System Architecture

```text
+-------------------------------------------------------------------------------+
|                                React Frontend                                 |
|          (Vite + TypeScript + Tailwind + Radix UI + TanStack Query)           |
+-------------------------------------------------------------------------------+
                                      |
                                      | REST / JSON (RFC 7807)
                                      v
+-------------------------------------------------------------------------------+
|                           Spring Boot 3.5 Backend                             |
|                                                                               |
|  +--------------------+   +---------------------+   +----------------------+  |
|  | LeaveWorkflowSvc   |   |   BalanceService    |   |   CoverageService    |  |
|  | (5-State Engine)   |   | (Reserve / Consume) |   | (Offers & Fairness)  |  |
|  +--------------------+   +---------------------+   +----------------------+  |
|            |                         |                         |              |
|            +-------------------------+-------------------------+              |
|                                      |                                        |
|                          +-----------------------+                            |
|                          | EscalationScheduler   |                            |
|                          +-----------------------+                            |
+-------------------------------------------------------------------------------+
                                      |
                                      | PostgreSQL 16 (Row Locks, Triggers,
                                      | btree_gist Exclusion Constraints)
                                      v
+-------------------------------------------------------------------------------+
|                            PostgreSQL Database                                |
+-------------------------------------------------------------------------------+
```

---

## Key Features

1. **Deterministic 5-State Machine**:
   - States: `PENDING_MANAGER`, `PENDING_HR`, `APPROVED`, `REJECTED`, `CANCELLED`.
   - Single mutation gateway ensures no invalid transitions or un-audited state changes.
2. **Loss of Pay (LOP) & Unpaid Days**:
   - Automatic split of requested duration into `paid_days` and `unpaid_days` based on available balance.
   - Real-time estimated salary deduction breakdown by month with explicit employee acknowledgement.
3. **Peer Coverage System**:
   - Opt-in side workflow with financial allowance calculation.
   - Monthly load caps, 90-day fairness-ranked suggestions, and automated withdrawal on request cancellation.
4. **Automated Escalation**:
   - Configurable stage deadlines with automated escalation to skip-level managers or HR.
5. **Team Conflict Detection**:
   - Live threshold checking against team capacity (e.g., max 25% absent).
6. **Strict Enterprise Security & Privacy**:
   - JWT authentication, role-based endpoint protection (EMPLOYEE, MANAGER, HR), and privacy isolation (salary figures and conflict names strictly scoped).

---

## Quick Start

### 1. Start Database
```bash
docker compose up -d postgres
```

### 2. Run Backend
```bash
cd backend
./mvnw spring-boot:run
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Demo Accounts

Password for all seeded accounts: `Password@123`

| Role | Email | Name | Details |
|---|---|---|---|
| HR | `hannah@leaveflow.internal` | Hannah | Primary HR administrator |
| HR | `harish@leaveflow.internal` | Harish | Secondary HR administrator |
| Manager | `meera@leaveflow.internal` | Meera | Engineering Lead (reports to none) |
| Employee | `arun@leaveflow.internal` | Arun | Senior Engineer (Engineering team) |
| Employee | `bala@leaveflow.internal` | Bala | Software Engineer (Engineering team) |
| Employee | `chitra@leaveflow.internal` | Chitra | QA Engineer (Engineering team) |
| Employee | `divya@leaveflow.internal` | Divya | Joined mid-year (pro-rated balance) |
