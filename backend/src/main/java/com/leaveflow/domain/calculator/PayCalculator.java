package com.leaveflow.domain.calculator;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

public final class PayCalculator {

    public record MonthDeduction(
        String month, // YYYY-MM
        BigDecimal unpaidDays,
        BigDecimal dailyRate,
        BigDecimal amount
    ) {}

    public record MonthAllowance(
        String month, // YYYY-MM
        BigDecimal coveredDays,
        BigDecimal dailyRate,
        BigDecimal amount
    ) {}

    public record PayCalculationResult(
        BigDecimal paidDays,
        BigDecimal unpaidDays,
        BigDecimal estimatedDeduction,
        List<MonthDeduction> deductionBreakdown,
        boolean salarySet
    ) {}

    private PayCalculator() {}

    public static BigDecimal calculateDailyRate(BigDecimal monthlySalary, int workingDaysInMonth) {
        if (monthlySalary == null || monthlySalary.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        int effectiveWorkingDays = Math.max(1, workingDaysInMonth);
        return monthlySalary.divide(BigDecimal.valueOf(effectiveWorkingDays), 2, RoundingMode.HALF_UP);
    }

    public static PayCalculationResult calculateLeavePay(
        List<LocalDate> workingDays,
        BigDecimal availableBalance,
        BigDecimal monthlySalary,
        Map<YearMonth, Integer> monthWorkingDaysMap
    ) {
        boolean salarySet = (monthlySalary != null && monthlySalary.compareTo(BigDecimal.ZERO) > 0);
        BigDecimal totalWorkingDays = BigDecimal.valueOf(workingDays.size()).setScale(1, RoundingMode.HALF_UP);
        
        BigDecimal avail = (availableBalance != null) ? availableBalance : BigDecimal.ZERO;
        BigDecimal paidDays = totalWorkingDays.min(avail.max(BigDecimal.ZERO)).setScale(1, RoundingMode.HALF_UP);
        BigDecimal unpaidDays = totalWorkingDays.subtract(paidDays).setScale(1, RoundingMode.HALF_UP);

        if (unpaidDays.compareTo(BigDecimal.ZERO) <= 0) {
            return new PayCalculationResult(
                paidDays,
                BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP),
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                Collections.emptyList(),
                salarySet
            );
        }

        // Allocate paid days first in date order; unpaid days are the trailing days
        int paidCount = paidDays.intValue(); // fractional handled
        // If fractional paid days: e.g. 9.5 paid out of 10 days
        double paidRemaining = paidDays.doubleValue();

        Map<YearMonth, BigDecimal> unpaidPerMonth = new TreeMap<>();

        for (LocalDate day : workingDays) {
            YearMonth ym = YearMonth.from(day);
            if (paidRemaining >= 1.0) {
                paidRemaining -= 1.0;
            } else if (paidRemaining > 0) {
                double unpaidFrac = 1.0 - paidRemaining;
                paidRemaining = 0;
                unpaidPerMonth.merge(ym, BigDecimal.valueOf(unpaidFrac), BigDecimal::add);
            } else {
                unpaidPerMonth.merge(ym, BigDecimal.ONE, BigDecimal::add);
            }
        }

        List<MonthDeduction> breakdown = new ArrayList<>();
        BigDecimal totalDeduction = BigDecimal.ZERO;

        for (Map.Entry<YearMonth, BigDecimal> entry : unpaidPerMonth.entrySet()) {
            YearMonth ym = entry.getKey();
            BigDecimal unpDays = entry.getValue().setScale(1, RoundingMode.HALF_UP);
            int monthWorkingDays = monthWorkingDaysMap.getOrDefault(ym, 22);
            BigDecimal dailyRate = salarySet ? calculateDailyRate(monthlySalary, monthWorkingDays) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            BigDecimal amount = unpDays.multiply(dailyRate).setScale(2, RoundingMode.HALF_UP);
            
            totalDeduction = totalDeduction.add(amount);
            breakdown.add(new MonthDeduction(ym.toString(), unpDays, dailyRate, amount));
        }

        return new PayCalculationResult(
            paidDays,
            unpaidDays,
            totalDeduction.setScale(2, RoundingMode.HALF_UP),
            Collections.unmodifiableList(breakdown),
            salarySet
        );
    }

    public static List<MonthAllowance> calculateCoverageAllowance(
        List<LocalDate> workingDays,
        BigDecimal sharePercent,
        BigDecimal monthlySalary,
        Map<YearMonth, Integer> monthWorkingDaysMap,
        BigDecimal allowancePercent
    ) {
        if (workingDays == null || workingDays.isEmpty() || sharePercent == null || sharePercent.compareTo(BigDecimal.ZERO) <= 0) {
            return Collections.emptyList();
        }

        BigDecimal pct = (allowancePercent != null) ? allowancePercent : BigDecimal.valueOf(20);
        BigDecimal multiplier = pct.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal shareFactor = sharePercent.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);

        // Group working days by month
        Map<YearMonth, Integer> daysPerMonth = new TreeMap<>();
        for (LocalDate day : workingDays) {
            daysPerMonth.merge(YearMonth.from(day), 1, Integer::sum);
        }

        List<MonthAllowance> allowances = new ArrayList<>();
        for (Map.Entry<YearMonth, Integer> entry : daysPerMonth.entrySet()) {
            YearMonth ym = entry.getKey();
            int monthDays = entry.getValue();
            BigDecimal coveredDays = BigDecimal.valueOf(monthDays).multiply(shareFactor).setScale(2, RoundingMode.HALF_UP);
            
            int totalMonthWorkingDays = monthWorkingDaysMap.getOrDefault(ym, 22);
            BigDecimal dailyRate = calculateDailyRate(monthlySalary, totalMonthWorkingDays);
            BigDecimal amount = coveredDays.multiply(dailyRate).multiply(multiplier).setScale(2, RoundingMode.HALF_UP);

            allowances.add(new MonthAllowance(ym.toString(), coveredDays, dailyRate, amount));
        }

        return Collections.unmodifiableList(allowances);
    }
}
