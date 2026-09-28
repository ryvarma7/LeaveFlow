package com.leaveflow.domain.calculator;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

public final class CoverageRules {

    private CoverageRules() {}

    public static BigDecimal calculateCoveredDays(BigDecimal workingDays, BigDecimal sharePercent) {
        if (workingDays == null || sharePercent == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return workingDays.multiply(sharePercent)
            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    public static boolean validateShareSum(BigDecimal existingSharesSum, BigDecimal newSharePercent) {
        BigDecimal current = (existingSharesSum != null) ? existingSharesSum : BigDecimal.ZERO;
        BigDecimal toAdd = (newSharePercent != null) ? newSharePercent : BigDecimal.ZERO;
        return current.add(toAdd).compareTo(BigDecimal.valueOf(100)) <= 0;
    }

    public static boolean validateMonthlyCap(
        BigDecimal currentMonthCoveredDays,
        BigDecimal newCoveredDays,
        BigDecimal monthlyCapDays
    ) {
        BigDecimal cap = (monthlyCapDays != null) ? monthlyCapDays : BigDecimal.valueOf(5);
        BigDecimal current = (currentMonthCoveredDays != null) ? currentMonthCoveredDays : BigDecimal.ZERO;
        BigDecimal adding = (newCoveredDays != null) ? newCoveredDays : BigDecimal.ZERO;
        return current.add(adding).compareTo(cap) <= 0;
    }

    public static boolean isCandidateEligible(
        Long candidateId,
        Long requesterId,
        Long candidateTeamId,
        Long requesterTeamId,
        boolean isActive,
        LocalDate candidateJoinedDate,
        LocalDate requestStartDate,
        List<LocalDate> requestWorkingDays,
        List<LocalDate> candidateLeaveDates
    ) {
        if (candidateId == null || requesterId == null) return false;
        if (candidateId.equals(requesterId)) return false;
        if (!isActive) return false;
        if (candidateTeamId == null || !candidateTeamId.equals(requesterTeamId)) return false;
        if (candidateJoinedDate != null && candidateJoinedDate.isAfter(requestStartDate)) return false;

        if (candidateLeaveDates != null && requestWorkingDays != null) {
            for (LocalDate day : requestWorkingDays) {
                if (candidateLeaveDates.contains(day)) {
                    return false;
                }
            }
        }
        return true;
    }
}
