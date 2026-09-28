package com.leaveflow.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "leave_types")
public class LeaveType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "annual_entitlement", nullable = false, precision = 4, scale = 1)
    private BigDecimal annualEntitlement = BigDecimal.ZERO;

    @Column(name = "is_paid", nullable = false)
    private boolean isPaid = true;

    @Column(name = "max_consecutive_days")
    private Integer maxConsecutiveDays;

    @Column(name = "backdate_days", nullable = false)
    private int backdateDays = 0;

    @Column(name = "requires_document", nullable = false)
    private boolean requiresDocument = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected LeaveType() {}

    public LeaveType(String code, String name, BigDecimal annualEntitlement, boolean isPaid, Integer maxConsecutiveDays, int backdateDays, boolean requiresDocument) {
        this.code = code;
        this.name = name;
        this.annualEntitlement = annualEntitlement != null ? annualEntitlement : BigDecimal.ZERO;
        this.isPaid = isPaid;
        this.maxConsecutiveDays = maxConsecutiveDays;
        this.backdateDays = backdateDays;
        this.requiresDocument = requiresDocument;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public BigDecimal getAnnualEntitlement() { return annualEntitlement; }
    public boolean isPaid() { return isPaid; }
    public Integer getMaxConsecutiveDays() { return maxConsecutiveDays; }
    public int getBackdateDays() { return backdateDays; }
    public boolean isRequiresDocument() { return requiresDocument; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
