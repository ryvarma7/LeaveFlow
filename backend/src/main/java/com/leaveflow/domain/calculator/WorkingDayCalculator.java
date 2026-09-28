package com.leaveflow.domain.calculator;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

public final class WorkingDayCalculator {

    public record ExcludedDate(LocalDate date, String reason) {}

    public record CalculationResult(
        BigDecimal workingDays,
        List<LocalDate> workingDayList,
        List<ExcludedDate> excludedDates
    ) {}

    private static final Set<DayOfWeek> DEFAULT_WEEKENDS = Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);

    private WorkingDayCalculator() {}

    public static CalculationResult calculate(
        LocalDate startDate,
        LocalDate endDate,
        Set<DayOfWeek> weekendDays,
        Map<LocalDate, String> holidays
    ) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("Start date and end date must not be null");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }

        Set<DayOfWeek> weekends = (weekendDays != null) ? weekendDays : DEFAULT_WEEKENDS;
        Map<LocalDate, String> holidayMap = (holidays != null) ? holidays : Collections.emptyMap();

        List<LocalDate> workingDayList = new ArrayList<>();
        List<ExcludedDate> excludedDates = new ArrayList<>();

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            if (weekends.contains(current.getDayOfWeek())) {
                excludedDates.add(new ExcludedDate(current, "WEEKEND"));
            } else if (holidayMap.containsKey(current)) {
                excludedDates.add(new ExcludedDate(current, "HOLIDAY: " + holidayMap.get(current)));
            } else {
                workingDayList.add(current);
            }
            current = current.plusDays(1);
        }

        return new CalculationResult(
            BigDecimal.valueOf(workingDayList.size()).setScale(1),
            Collections.unmodifiableList(workingDayList),
            Collections.unmodifiableList(excludedDates)
        );
    }
}
