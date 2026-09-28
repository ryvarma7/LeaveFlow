package com.leaveflow.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private Employee recipient;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Notification() {}

    public Notification(Employee recipient, String title, String message, String type, Long referenceId) {
        this.recipient = recipient;
        this.title = title;
        this.message = message;
        this.type = type;
        this.referenceId = referenceId;
        this.read = false;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public Employee getRecipient() { return recipient; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getType() { return type; }
    public Long getReferenceId() { return referenceId; }
    public boolean isRead() { return read; }
    public Instant getCreatedAt() { return createdAt; }

    public void markAsRead() {
        this.read = true;
    }
}
