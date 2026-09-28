package com.leaveflow.web.dto;

import com.leaveflow.domain.calculator.WorkingDayCalculator;
import com.leaveflow.domain.model.LeaveStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class LeaveDto {
    private LeaveDto() {}

    public record LeavePreviewRequest(
        Long leaveTypeId,
        LocalDate startDate,
        LocalDate endDate
    ) {}

    public record LeavePreviewResponse(
        BigDecimal workingDays,
        List<LocalDate> workingDayList,
        List<WorkingDayCalculator.ExcludedDate> excludedDates,
        BigDecimal paidDays,
        BigDecimal unpaidDays,
        BigDecimal estimatedDeduction,
        List<DeductionEntry> deductionBreakdown,
        boolean salarySet,
        BigDecimal balanceBefore,
        BigDecimal balanceAfter,
        boolean conflictWarning,
        int teammateAbsenceCount,
        List<String> warnings
    ) {}

    public record DeductionEntry(
        String month,
        BigDecimal unpaidDays,
        BigDecimal dailyRate,
        BigDecimal amount
    ) {}

    public record LeaveSubmitRequest(
        Long leaveTypeId,
        LocalDate startDate,
        LocalDate endDate,
        String reason,
        String handoverNotes,
        boolean acknowledgeUnpaid
    ) {}

    public record LeaveActionRequest(
        LeaveStatus expectedStatus,
        String comment
    ) {}

    public record LeaveSummaryResponse(
        Long id,
        String requestNumber,
        Long employeeId,
        String employeeName,
        String employeeCode,
        String teamName,
        Long leaveTypeId,
        String leaveTypeName,
        String leaveTypeCode,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal workingDays,
        BigDecimal paidDays,
        BigDecimal unpaidDays,
        LeaveStatus status,
        int escalationLevel,
        boolean escalated,
        String coverageStatus,
        boolean conflictFlag,
        Instant stageDeadlineAt,
        Instant createdAt
    ) {}

    public record LeaveEventDto(
        Long id,
        String eventType,
        String fromStatus,
        String toStatus,
        String actorName,
        String comments,
        int seq,
        Instant createdAt
    ) {}

    public record LeaveDetailResponse(
        Long id,
        String requestNumber,
        Long employeeId,
        String employeeName,
        String employeeCode,
        String teamName,
        Long leaveTypeId,
        String leaveTypeName,
        String leaveTypeCode,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal workingDays,
        BigDecimal paidDays,
        BigDecimal unpaidDays,
        BigDecimal estimatedDeduction,
        List<DeductionEntry> deductionBreakdown,
        String handoverNotes,
        String reason,
        LeaveStatus status,
        Instant stageEnteredAt,
        Instant stageDeadlineAt,
        Instant escalatedAt,
        int escalationLevel,
        boolean escalated,
        String coverageStatus,
        boolean conflictFlag,
        List<String> allowedActions,
        List<LeaveEventDto> timeline,
        List<CoverageDto.CoverageAssignmentResponse> coverageAssignments,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record BalanceResponse(
        Long id,
        Long leaveTypeId,
        String leaveTypeCode,
        String leaveTypeName,
        int year,
        BigDecimal entitled,
        BigDecimal carried,
        BigDecimal adjustment,
        BigDecimal pending,
        BigDecimal used,
        BigDecimal available
    ) {}

    public record NotificationResponse(
        Long id,
        String title,
        String message,
        String type,
        Long referenceId,
        boolean read,
        Instant createdAt
    ) {}
}
