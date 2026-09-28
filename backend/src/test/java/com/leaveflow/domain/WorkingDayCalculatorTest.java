package com.leaveflow.domain;

import com.leaveflow.domain.calculator.WorkingDayCalculator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WorkingDayCalculatorTest {

    @Test
    @DisplayName("Calculate standard work week without holidays")
    void testStandardWeek() {
        LocalDate monday = LocalDate.of(2026, 10, 5);
        LocalDate friday = LocalDate.of(2026, 10, 9);

        WorkingDayCalculator.CalculationResult result = WorkingDayCalculator.calculate(monday, friday, null, Map.of());

        assertThat(result.workingDays()).isEqualByComparingTo(BigDecimal.valueOf(5.0));
        assertThat(result.workingDayList()).hasSize(5);
        assertThat(result.excludedDates()).isEmpty();
    }

    @Test
    @DisplayName("Calculate range with weekend and holiday")
    void testWithWeekendAndHoliday() {
        LocalDate fri = LocalDate.of(2026, 10, 2); // Holiday (Gandhi Jayanti)
        LocalDate tue = LocalDate.of(2026, 10, 6);

        Map<LocalDate, String> holidays = Map.of(fri, "Gandhi Jayanti");

        WorkingDayCalculator.CalculationResult result = WorkingDayCalculator.calculate(fri, tue, null, holidays);

        // Fri (Holiday), Sat (Weekend), Sun (Weekend), Mon (Work), Tue (Work) = 2 working days
        assertThat(result.workingDays()).isEqualByComparingTo(BigDecimal.valueOf(2.0));
        assertThat(result.workingDayList()).containsExactly(
            LocalDate.of(2026, 10, 5),
            LocalDate.of(2026, 10, 6)
        );
        assertThat(result.excludedDates()).hasSize(3);
    }
}
