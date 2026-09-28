package com.leaveflow.web.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public final class DashboardDto {
    private DashboardDto() {}

    public record DashboardSummaryResponse(
        String role,
        // Employee fields
        BigDecimal availableAnnualLeave,
        BigDecimal availableSickLeave,
        BigDecimal availableCasualLeave,
        long pendingRequestsCount,
        long waitingCoverageOffersCount,
        // Manager fields
        Long awaitingDecisionCount,
        Long escalatedToManagerCount,
        Long teamOffTodayCount,
        Long teamSize,
        Long coverageGapsCount,
        // HR fields
        Long awaitingHrCount,
        Long totalEscalatedCount,
        Long employeesOnLeaveTodayCount,
        Long requestsThisMonthCount
    ) {}
}
