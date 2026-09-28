package com.leaveflow.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "leave_balance_ledgers")
public class LeaveBalanceLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "balance_id", nullable = false)
    private LeaveBalance balance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id")
    private LeaveRequest request;

    @Column(name = "transaction_type", nullable = false, length = 30)
    private String transactionType; // ENTITLEMENT_GRANT, RESERVE, RELEASE, CONSUME, RESTORE, ADJUSTMENT

    @Column(name = "entitlement_delta", nullable = false, precision = 5, scale = 1)
    private BigDecimal entitlementDelta = BigDecimal.ZERO;

    @Column(name = "pending_delta", nullable = false, precision = 5, scale = 1)
    private BigDecimal pendingDelta = BigDecimal.ZERO;

    @Column(name = "used_delta", nullable = false, precision = 5, scale = 1)
    private BigDecimal usedDelta = BigDecimal.ZERO;

    @Column(length = 500)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private Employee createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected LeaveBalanceLedger() {}

    public LeaveBalanceLedger(
        LeaveBalance balance,
        LeaveRequest request,
        String transactionType,
        BigDecimal entitlementDelta,
        BigDecimal pendingDelta,
        BigDecimal usedDelta,
        String note,
        Employee createdBy
    ) {
        this.balance = balance;
        this.request = request;
        this.transactionType = transactionType;
        this.entitlementDelta = entitlementDelta != null ? entitlementDelta : BigDecimal.ZERO;
        this.pendingDelta = pendingDelta != null ? pendingDelta : BigDecimal.ZERO;
        this.usedDelta = usedDelta != null ? usedDelta : BigDecimal.ZERO;
        this.note = note;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public LeaveBalance getBalance() { return balance; }
    public LeaveRequest getRequest() { return request; }
    public String getTransactionType() { return transactionType; }
    public BigDecimal getEntitlementDelta() { return entitlementDelta; }
    public BigDecimal getPendingDelta() { return pendingDelta; }
    public BigDecimal getUsedDelta() { return usedDelta; }
    public String getNote() { return note; }
    public Employee getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}
