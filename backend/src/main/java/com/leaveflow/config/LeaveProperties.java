package com.leaveflow.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.time.Duration;

@ConfigurationProperties(prefix = "leave")
public record LeaveProperties(
    String timezone,
    Jwt jwt,
    Coverage coverage,
    Payroll payroll,
    Escalation escalation,
    Internal internal
) {
    public record Jwt(String secret, int expirationMinutes) {}
    public record Coverage(BigDecimal allowancePercentOfDailyRate, BigDecimal monthlyCapDays) {}
    public record Payroll(int scale) {}
    public record Escalation(
        long managerTimeoutSeconds,
        long skipLevelTimeoutSeconds,
        long hrTimeoutSeconds,
        long pollIntervalSeconds
    ) {}
    public record Internal(String cronSecret) {}
}
