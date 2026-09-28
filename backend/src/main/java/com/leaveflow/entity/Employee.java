package com.leaveflow.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_code", nullable = false, unique = true, length = 20)
    private String employeeCode;

    @Column(name = "first_name", nullable = false, length = 50)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 50)
    private String lastName;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false, length = 20)
    private String role; // EMPLOYEE, MANAGER, HR

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private Employee manager;

    @Column(name = "monthly_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal monthlySalary = BigDecimal.ZERO;

    @Column(name = "joined_date", nullable = false)
    private LocalDate joinedDate;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private Long version = 0L;

    protected Employee() {}

    public Employee(
        String employeeCode,
        String firstName,
        String lastName,
        String email,
        String passwordHash,
        String role,
        Team team,
        Employee manager,
        BigDecimal monthlySalary,
        LocalDate joinedDate
    ) {
        this.employeeCode = employeeCode;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.team = team;
        this.manager = manager;
        this.monthlySalary = monthlySalary != null ? monthlySalary : BigDecimal.ZERO;
        this.joinedDate = joinedDate;
        this.active = true;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getEmployeeCode() { return employeeCode; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getFullName() { return firstName + " " + lastName; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getRole() { return role; }
    public Team getTeam() { return team; }
    public Employee getManager() { return manager; }
    public BigDecimal getMonthlySalary() { return monthlySalary; }
    public LocalDate getJoinedDate() { return joinedDate; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }

    public void setRole(String role) { this.role = role; this.updatedAt = Instant.now(); }
    public void setManager(Employee manager) { this.manager = manager; this.updatedAt = Instant.now(); }
    public void setTeam(Team team) { this.team = team; this.updatedAt = Instant.now(); }
    public void setMonthlySalary(BigDecimal monthlySalary) { this.monthlySalary = monthlySalary; this.updatedAt = Instant.now(); }
    public void setActive(boolean active) { this.active = active; this.updatedAt = Instant.now(); }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; this.updatedAt = Instant.now(); }
}
