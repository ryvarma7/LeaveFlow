CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE teams (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    max_absent_percent NUMERIC(5,2) NOT NULL DEFAULT 25.00 CHECK (max_absent_percent >= 0 AND max_absent_percent <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE employees (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_code VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('EMPLOYEE', 'MANAGER', 'HR')),
    team_id BIGINT REFERENCES teams(id),
    manager_id BIGINT REFERENCES employees(id),
    monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monthly_salary >= 0),
    joined_date DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE leave_types (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    annual_entitlement NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (annual_entitlement >= 0),
    is_paid BOOLEAN NOT NULL DEFAULT true,
    max_consecutive_days INT,
    backdate_days INT NOT NULL DEFAULT 0 CHECK (backdate_days >= 0),
    requires_document BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leave_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_number VARCHAR(30) NOT NULL UNIQUE,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    leave_type_id BIGINT NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    working_days NUMERIC(5,1) NOT NULL CHECK (working_days > 0),
    paid_days NUMERIC(5,1) NOT NULL,
    unpaid_days NUMERIC(5,1) NOT NULL DEFAULT 0,
    estimated_deduction NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (estimated_deduction >= 0),
    deduction_breakdown JSONB,
    handover_notes VARCHAR(1000),
    reason VARCHAR(500),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED')),
    stage_entered_at TIMESTAMPTZ,
    stage_deadline_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    escalation_level INT NOT NULL DEFAULT 0,
    coverage_status VARCHAR(10) NOT NULL DEFAULT 'NONE' CHECK (coverage_status IN ('NONE', 'PARTIAL', 'FULL')),
    conflict_flag BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    CHECK (paid_days + unpaid_days = working_days),
    CHECK (end_date >= start_date)
);

CREATE TABLE leave_request_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES leave_requests(id),
    event_type VARCHAR(30) NOT NULL,
    from_status VARCHAR(20),
    to_status VARCHAR(20),
    actor_id BIGINT REFERENCES employees(id),
    comments VARCHAR(500),
    seq INT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leave_balances (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    leave_type_id BIGINT NOT NULL REFERENCES leave_types(id),
    year INT NOT NULL,
    entitled NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (entitled >= 0),
    carried NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (carried >= 0),
    adjustment NUMERIC(5,1) NOT NULL DEFAULT 0,
    pending NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (pending >= 0),
    used NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (used >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_employee_leave_year UNIQUE(employee_id, leave_type_id, year),
    CONSTRAINT chk_balance_available CHECK (pending + used <= entitled + carried + adjustment)
);

CREATE TABLE leave_balance_ledgers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    balance_id BIGINT NOT NULL REFERENCES leave_balances(id),
    request_id BIGINT REFERENCES leave_requests(id),
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('ENTITLEMENT_GRANT', 'RESERVE', 'RELEASE', 'CONSUME', 'RESTORE', 'ADJUSTMENT')),
    entitlement_delta NUMERIC(5,1) NOT NULL DEFAULT 0,
    pending_delta NUMERIC(5,1) NOT NULL DEFAULT 0,
    used_delta NUMERIC(5,1) NOT NULL DEFAULT 0,
    note VARCHAR(500),
    created_by BIGINT REFERENCES employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE coverage_assignments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES leave_requests(id),
    covering_employee_id BIGINT NOT NULL REFERENCES employees(id),
    offered_by BIGINT NOT NULL REFERENCES employees(id),
    share_percent NUMERIC(5,2) NOT NULL CHECK (share_percent > 0 AND share_percent <= 100),
    covered_days NUMERIC(5,2) NOT NULL CHECK (covered_days > 0),
    status VARCHAR(12) NOT NULL CHECK (status IN ('OFFERED','ACCEPTED','DECLINED','WITHDRAWN','EXPIRED')),
    note VARCHAR(500),
    decline_reason VARCHAR(300),
    allowance_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (allowance_amount >= 0),
    allowance_breakdown JSONB,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE holidays (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL UNIQUE,
    is_floating BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES employees(id),
    title VARCHAR(200) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    type VARCHAR(50) NOT NULL,
    reference_id BIGINT,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_active_assignment
    ON coverage_assignments (request_id, covering_employee_id)
    WHERE status IN ('OFFERED','ACCEPTED');

CREATE INDEX ix_cov_employee_status ON coverage_assignments (covering_employee_id, status);
CREATE INDEX ix_cov_request ON coverage_assignments (request_id);
CREATE INDEX ix_leave_requests_employee ON leave_requests (employee_id, status);
CREATE INDEX ix_leave_requests_dates ON leave_requests (start_date, end_date);
CREATE INDEX ix_leave_balances_lookup ON leave_balances (employee_id, leave_type_id, year);
