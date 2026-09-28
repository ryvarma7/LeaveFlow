package com.leaveflow.domain.calculator;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

public final class ConflictCalculator {

    public record TeammateAbsence(
        Long employeeId,
        String employeeName,
        LocalDate startDate,
        LocalDate endDate,
        boolean isApproved
    ) {}

    public record DayConflict(
        LocalDate date,
        int approvedCount,
        int pendingCount,
        int totalAbsentIfApproved,
        int allowedAbsent,
        boolean exceeded,
        List<String> teammateNames
    ) {}

    public record ConflictResult(
        boolean hasConflict,
        int allowedAbsent,
        int maxAbsentOnAnyDay,
        List<DayConflict> dayConflicts
    ) {}

    private ConflictCalculator() {}

    public static int calculateAllowedAbsent(int teamSize, BigDecimal maxAbsentPercent) {
        if (teamSize <= 0) return 1;
        BigDecimal pct = (maxAbsentPercent != null) ? maxAbsentPercent : BigDecimal.valueOf(25);
        int computed = BigDecimal.valueOf(teamSize)
            .multiply(pct)
            .divide(BigDecimal.valueOf(100), 0, RoundingMode.FLOOR)
            .intValue();
        return Math.max(1, computed);
    }

    public static ConflictResult calculate(
        List<LocalDate> workingDays,
        int teamSize,
        BigDecimal maxAbsentPercent,
        List<TeammateAbsence> teammateAbsences
    ) {
        int allowed = calculateAllowedAbsent(teamSize, maxAbsentPercent);
        boolean overallConflict = false;
        int maxAbsentSeen = 0;
        List<DayConflict> dayConflicts = new ArrayList<>();

        for (LocalDate day : workingDays) {
            int approved = 0;
            int pending = 0;
            List<String> names = new ArrayList<>();

            if (teammateAbsences != null) {
                for (TeammateAbsence abs : teammateAbsences) {
                    if (!day.isBefore(abs.startDate()) && !day.isAfter(abs.endDate())) {
                        if (abs.isApproved()) {
                            approved++;
                        } else {
                            pending++;
                        }
                        if (abs.employeeName() != null && !abs.employeeName().isBlank()) {
                            names.add(abs.employeeName());
                        }
                    }
                }
            }

            int totalIfApproved = approved + pending + 1; // including current requester
            boolean exceeded = (totalIfApproved > allowed);
            if (exceeded) {
                overallConflict = true;
            }
            if (totalIfApproved > maxAbsentSeen) {
                maxAbsentSeen = totalIfApproved;
            }

            dayConflicts.add(new DayConflict(
                day,
                approved,
                pending,
                totalIfApproved,
                allowed,
                exceeded,
                Collections.unmodifiableList(names)
            ));
        }

        return new ConflictResult(
            overallConflict,
            allowed,
            maxAbsentSeen,
            Collections.unmodifiableList(dayConflicts)
        );
    }
}
