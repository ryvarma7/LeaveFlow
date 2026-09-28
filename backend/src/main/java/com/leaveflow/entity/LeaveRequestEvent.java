package com.leaveflow.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "leave_request_events")
public class LeaveRequestEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private LeaveRequest request;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    @Column(name = "from_status", length = 20)
    private String fromStatus;

    @Column(name = "to_status", length = 20)
    private String toStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private Employee actor;

    @Column(length = 500)
    private String comments;

    @Column(nullable = false)
    private int seq;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected LeaveRequestEvent() {}

    public LeaveRequestEvent(
        LeaveRequest request,
        String eventType,
        String fromStatus,
        String toStatus,
        Employee actor,
        String comments,
        int seq,
        String metadata
    ) {
        this.request = request;
        this.eventType = eventType;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.actor = actor;
        this.comments = comments;
        this.seq = seq;
        this.metadata = metadata;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public LeaveRequest getRequest() { return request; }
    public String getEventType() { return eventType; }
    public String getFromStatus() { return fromStatus; }
    public String getToStatus() { return toStatus; }
    public Employee getActor() { return actor; }
    public String getComments() { return comments; }
    public int getSeq() { return seq; }
    public String getMetadata() { return metadata; }
    public Instant getCreatedAt() { return createdAt; }
}
