package com.leaveflow.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "leave_balances", uniqueConstraints = {
    @UniqueConstraint(name = "uq_employee_leave_year", columnNames = {"employee_id", "leave_type_id", "year"})
})
public class LeaveBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Column(nullable = false)
    private int year;

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal entitled = BigDecimal.ZERO;

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal carried = BigDecimal.ZERO;

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal adjustment = BigDecimal.ZERO;

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal pending = BigDecimal.ZERO;

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal used = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    protected LeaveBalance() {}

    public LeaveBalance(Employee employee, LeaveType leaveType, int year, BigDecimal entitled, BigDecimal carried, BigDecimal adjustment) {
        this.employee = employee;
        this.leaveType = leaveType;
        this.year = year;
        this.entitled = entitled != null ? entitled : BigDecimal.ZERO;
        this.carried = carried != null ? carried : BigDecimal.ZERO;
        this.adjustment = adjustment != null ? adjustment : BigDecimal.ZERO;
        this.pending = BigDecimal.ZERO;
        this.used = BigDecimal.ZERO;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public Employee getEmployee() { return employee; }
    public LeaveType getLeaveType() { return leaveType; }
    public int getYear() { return year; }
    public BigDecimal getEntitled() { return entitled; }
    public BigDecimal getCarried() { return carried; }
    public BigDecimal getAdjustment() { return adjustment; }
    public BigDecimal getPending() { return pending; }
    public BigDecimal getUsed() { return used; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }

    public BigDecimal getAvailable() {
        return entitled.add(carried).add(adjustment).subtract(pending).subtract(used);
    }
}
