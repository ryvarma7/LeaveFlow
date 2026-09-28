package com.leaveflow.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "holidays")
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true)
    private LocalDate date;

    @Column(name = "is_floating", nullable = false)
    private boolean isFloating = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Holiday() {}

    public Holiday(String name, LocalDate date, boolean isFloating) {
        this.name = name;
        this.date = date;
        this.isFloating = isFloating;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public LocalDate getDate() { return date; }
    public boolean isFloating() { return isFloating; }
    public Instant getCreatedAt() { return createdAt; }
}
