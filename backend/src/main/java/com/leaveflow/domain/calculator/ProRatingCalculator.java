package com.leaveflow.domain.calculator;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class ProRatingCalculator {

    private ProRatingCalculator() {}

    public static BigDecimal calculate(BigDecimal annualEntitlement, LocalDate joinedDate, int targetYear) {
        if (annualEntitlement == null || annualEntitlement.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
        }
        if (joinedDate == null) {
            throw new IllegalArgumentException("Joined date must not be null");
        }

        int joinYear = joinedDate.getYear();
        if (joinYear > targetYear) {
            return BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
        }

        if (joinYear < targetYear) {
            return annualEntitlement.setScale(1, RoundingMode.HALF_UP);
        }

        // Joined in target year
        LocalDate startOfYear = LocalDate.of(targetYear, 1, 1);
        LocalDate endOfYear = LocalDate.of(targetYear, 12, 31);
        long totalDaysInYear = ChronoUnit.DAYS.between(startOfYear, endOfYear) + 1;
        long remainingDays = ChronoUnit.DAYS.between(joinedDate, endOfYear) + 1;

        if (remainingDays <= 0) {
            return BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
        }
        if (remainingDays >= totalDaysInYear) {
            return annualEntitlement.setScale(1, RoundingMode.HALF_UP);
        }

        return annualEntitlement
            .multiply(BigDecimal.valueOf(remainingDays))
            .divide(BigDecimal.valueOf(totalDaysInYear), 4, RoundingMode.HALF_UP)
            .setScale(1, RoundingMode.HALF_UP);
    }
}
