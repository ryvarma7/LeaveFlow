-- Hardening constraints and triggers

-- Exclusion constraint to prevent overlapping active leaves for the same employee
ALTER TABLE leave_requests
    ADD CONSTRAINT uq_leave_request_no_overlap
    EXCLUDE USING gist (
        employee_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
    )
    WHERE (status IN ('PENDING_MANAGER', 'PENDING_HR', 'APPROVED'));

-- Append-only trigger function for audit ledgers and events
CREATE OR REPLACE FUNCTION trg_prevent_update_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Updates and deletes are not allowed on this audit table.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leave_request_events_immutable
BEFORE UPDATE OR DELETE ON leave_request_events
FOR EACH ROW EXECUTE FUNCTION trg_prevent_update_delete();

CREATE TRIGGER trg_leave_balance_ledgers_immutable
BEFORE UPDATE OR DELETE ON leave_balance_ledgers
FOR EACH ROW EXECUTE FUNCTION trg_prevent_update_delete();
