package com.leaveflow.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "coverage_assignments")
public class CoverageAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private LeaveRequest request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "covering_employee_id", nullable = false)
    private Employee coveringEmployee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offered_by", nullable = false)
    private Employee offeredBy;

    @Column(name = "share_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal sharePercent;

    @Column(name = "covered_days", nullable = false, precision = 5, scale = 2)
    private BigDecimal coveredDays;

    @Column(nullable = false, length = 12)
    private String status; // OFFERED, ACCEPTED, DECLINED, WITHDRAWN, EXPIRED

    @Column(length = 500)
    private String note;

    @Column(name = "decline_reason", length = 300)
    private String declineReason;

    @Column(name = "allowance_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal allowanceAmount = BigDecimal.ZERO;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "allowance_breakdown", columnDefinition = "jsonb")
    private String allowanceBreakdown;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    protected CoverageAssignment() {}

    public CoverageAssignment(
        LeaveRequest request,
        Employee coveringEmployee,
        Employee offeredBy,
        BigDecimal sharePercent,
        BigDecimal coveredDays,
        BigDecimal allowanceAmount,
        String allowanceBreakdown,
        String note
    ) {
        this.request = request;
        this.coveringEmployee = coveringEmployee;
        this.offeredBy = offeredBy;
        this.sharePercent = sharePercent;
        this.coveredDays = coveredDays;
        this.allowanceAmount = allowanceAmount != null ? allowanceAmount : BigDecimal.ZERO;
        this.allowanceBreakdown = allowanceBreakdown;
        this.note = note;
        this.status = "OFFERED";
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public LeaveRequest getRequest() { return request; }
    public Employee getCoveringEmployee() { return coveringEmployee; }
    public Employee getOfferedBy() { return offeredBy; }
    public BigDecimal getSharePercent() { return sharePercent; }
    public BigDecimal getCoveredDays() { return coveredDays; }
    public String getStatus() { return status; }
    public String getNote() { return note; }
    public String getDeclineReason() { return declineReason; }
    public BigDecimal getAllowanceAmount() { return allowanceAmount; }
    public String getAllowanceBreakdown() { return allowanceBreakdown; }
    public Instant getRespondedAt() { return respondedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }

    public void accept(Instant now) {
        this.status = "ACCEPTED";
        this.respondedAt = now;
        this.updatedAt = now;
    }

    public void decline(String reason, Instant now) {
        this.status = "DECLINED";
        this.declineReason = reason;
        this.respondedAt = now;
        this.updatedAt = now;
    }

    public void withdraw(Instant now) {
        this.status = "WITHDRAWN";
        this.updatedAt = now;
    }

    public void expire(Instant now) {
        this.status = "EXPIRED";
        this.updatedAt = now;
    }
}
