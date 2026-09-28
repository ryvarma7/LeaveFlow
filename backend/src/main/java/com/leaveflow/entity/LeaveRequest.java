package com.leaveflow.entity;

import com.leaveflow.domain.model.LeaveStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "leave_requests")
public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_number", nullable = false, unique = true, length = 30)
    private String requestNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "working_days", nullable = false, precision = 5, scale = 1)
    private BigDecimal workingDays;

    @Column(name = "paid_days", nullable = false, precision = 5, scale = 1)
    private BigDecimal paidDays;

    @Column(name = "unpaid_days", nullable = false, precision = 5, scale = 1)
    private BigDecimal unpaidDays = BigDecimal.ZERO;

    @Column(name = "estimated_deduction", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedDeduction = BigDecimal.ZERO;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "deduction_breakdown", columnDefinition = "jsonb")
    private String deductionBreakdown;

    @Column(name = "handover_notes", length = 1000)
    private String handoverNotes;

    @Column(length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LeaveStatus status;

    @Column(name = "stage_entered_at")
    private Instant stageEnteredAt;

    @Column(name = "stage_deadline_at")
    private Instant stageDeadlineAt;

    @Column(name = "escalated_at")
    private Instant escalatedAt;

    @Column(name = "escalation_level", nullable = false)
    private int escalationLevel = 0;

    @Column(name = "coverage_status", nullable = false, length = 10)
    private String coverageStatus = "NONE";

    @Column(name = "conflict_flag", nullable = false)
    private boolean conflictFlag = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    protected LeaveRequest() {}

    public LeaveRequest(
        String requestNumber,
        Employee employee,
        LeaveType leaveType,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal workingDays,
        BigDecimal paidDays,
        BigDecimal unpaidDays,
        BigDecimal estimatedDeduction,
        String deductionBreakdown,
        String handoverNotes,
        String reason,
        LeaveStatus status,
        Instant stageEnteredAt,
        Instant stageDeadlineAt,
        boolean conflictFlag
    ) {
        this.requestNumber = requestNumber;
        this.employee = employee;
        this.leaveType = leaveType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.workingDays = workingDays;
        this.paidDays = paidDays;
        this.unpaidDays = unpaidDays != null ? unpaidDays : BigDecimal.ZERO;
        this.estimatedDeduction = estimatedDeduction != null ? estimatedDeduction : BigDecimal.ZERO;
        this.deductionBreakdown = deductionBreakdown;
        this.handoverNotes = handoverNotes;
        this.reason = reason;
        this.status = status;
        this.stageEnteredAt = stageEnteredAt;
        this.stageDeadlineAt = stageDeadlineAt;
        this.conflictFlag = conflictFlag;
        this.coverageStatus = "NONE";
        this.escalationLevel = 0;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getRequestNumber() { return requestNumber; }
    public Employee getEmployee() { return employee; }
    public LeaveType getLeaveType() { return leaveType; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public BigDecimal getWorkingDays() { return workingDays; }
    public BigDecimal getPaidDays() { return paidDays; }
    public BigDecimal getUnpaidDays() { return unpaidDays; }
    public BigDecimal getEstimatedDeduction() { return estimatedDeduction; }
    public String getDeductionBreakdown() { return deductionBreakdown; }
    public String getHandoverNotes() { return handoverNotes; }
    public String getReason() { return reason; }
    public LeaveStatus getStatus() { return status; }
    public Instant getStageEnteredAt() { return stageEnteredAt; }
    public Instant getStageDeadlineAt() { return stageDeadlineAt; }
    public Instant getEscalatedAt() { return escalatedAt; }
    public int getEscalationLevel() { return escalationLevel; }
    public String getCoverageStatus() { return coverageStatus; }
    public boolean isConflictFlag() { return conflictFlag; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }

    // Controlled mutation for LeaveWorkflowService only
    public void moveTo(LeaveStatus newStatus, Instant enteredAt, Instant deadlineAt) {
        this.status = newStatus;
        this.stageEnteredAt = enteredAt;
        this.stageDeadlineAt = deadlineAt;
        this.escalationLevel = 0;
        this.escalatedAt = null;
        this.updatedAt = Instant.now();
    }

    public void escalateTo(int level, Instant deadlineAt, Instant escalatedAt) {
        this.escalationLevel = level;
        this.stageDeadlineAt = deadlineAt;
        this.escalatedAt = escalatedAt;
        this.updatedAt = Instant.now();
    }

    public void setCoverageStatus(String coverageStatus) {
        this.coverageStatus = coverageStatus;
        this.updatedAt = Instant.now();
    }
}
