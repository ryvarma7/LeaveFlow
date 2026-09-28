package com.leaveflow.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "teams")
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "max_absent_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal maxAbsentPercent = BigDecimal.valueOf(25.00);

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    protected Team() {}

    public Team(String name, BigDecimal maxAbsentPercent) {
        this.name = name;
        this.maxAbsentPercent = maxAbsentPercent != null ? maxAbsentPercent : BigDecimal.valueOf(25.00);
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public BigDecimal getMaxAbsentPercent() { return maxAbsentPercent; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }

    public void updateMaxAbsentPercent(BigDecimal maxAbsentPercent) {
        this.maxAbsentPercent = maxAbsentPercent;
        this.updatedAt = Instant.now();
    }
}
