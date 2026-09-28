package com.leaveflow.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class CoverageDto {
    private CoverageDto() {}

    public record CoverageOfferRequest(
        Long coveringEmployeeId,
        BigDecimal sharePercent,
        String note
    ) {}

    public record CoverageDeclineRequest(
        String reason
    ) {}

    public record AllowanceEntry(
        String month,
        BigDecimal coveredDays,
        BigDecimal dailyRate,
        BigDecimal amount
    ) {}

    public record CoverageAssignmentResponse(
        Long id,
        Long requestId,
        String requestNumber,
        String requesterName,
        LocalDate startDate,
        LocalDate endDate,
        Long coveringEmployeeId,
        String coveringEmployeeName,
        Long offeredById,
        String offeredByName,
        BigDecimal sharePercent,
        BigDecimal coveredDays,
        String status,
        String note,
        String declineReason,
        BigDecimal allowanceAmount, // Hidden unless covering employee or HR
        List<AllowanceEntry> allowanceBreakdown,
        Instant respondedAt,
        Instant createdAt
    ) {}

    public record CoverageInboxResponse(
        List<CoverageAssignmentResponse> incomingOffers,
        List<CoverageAssignmentResponse> activeCommitments,
        BigDecimal monthlyLoadDays,
        BigDecimal monthlyCapDays
    ) {}

    public record CoverageSuggestionResponse(
        Long employeeId,
        String employeeCode,
        String fullName,
        BigDecimal coveredDaysLast90Days,
        BigDecimal leaveDaysThisYear,
        boolean eligible,
        String eligibilityReason
    ) {}
}
