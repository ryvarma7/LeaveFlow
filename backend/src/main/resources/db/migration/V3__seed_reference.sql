-- Reference Data: Leave Types
INSERT INTO leave_types (code, name, annual_entitlement, is_paid, max_consecutive_days, backdate_days, requires_document)
VALUES 
    ('ANNUAL', 'Annual Leave', 18.0, true, 15, 0, false),
    ('SICK', 'Sick Leave', 12.0, true, 5, 7, true),
    ('CASUAL', 'Casual Leave', 6.0, true, 3, 0, false),
    ('UNPAID', 'Unpaid Leave (Loss of Pay)', 0.0, false, 30, 0, false);

-- Reference Data: Public Holidays (India sample for 2026 and 2027)
INSERT INTO holidays (name, date, is_floating) VALUES
    ('Republic Day', '2026-01-26', false),
    ('Holi', '2026-03-04', false),
    ('Good Friday', '2026-04-03', false),
    ('Eid ul-Fitr', '2026-03-21', false),
    ('Independence Day', '2026-08-15', false),
    ('Mahatma Gandhi Jayanti', '2026-10-02', false),
    ('Dussehra', '2026-10-20', false),
    ('Diwali', '2026-11-08', false),
    ('Christmas Day', '2026-12-25', false),
    ('Republic Day', '2027-01-26', false),
    ('Independence Day', '2027-08-15', false),
    ('Gandhi Jayanti', '2027-10-02', false),
    ('Diwali', '2027-10-29', false),
    ('Christmas Day', '2027-12-25', false);
