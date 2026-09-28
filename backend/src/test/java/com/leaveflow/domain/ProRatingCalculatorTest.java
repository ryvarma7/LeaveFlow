package com.leaveflow.domain;

import com.leaveflow.domain.calculator.ProRatingCalculator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class ProRatingCalculatorTest {

    @Test
    @DisplayName("Full year entitlement for employee joined before or on Jan 1")
    void testFullYear() {
        BigDecimal annual = BigDecimal.valueOf(18.0);
        BigDecimal result = ProRatingCalculator.calculate(annual, LocalDate.of(2025, 6, 1), 2026);
        assertThat(result).isEqualByComparingTo(BigDecimal.valueOf(18.0));

        BigDecimal jan1 = ProRatingCalculator.calculate(annual, LocalDate.of(2026, 1, 1), 2026);
        assertThat(jan1).isEqualByComparingTo(BigDecimal.valueOf(18.0));
    }

    @Test
    @DisplayName("Pro-rated entitlement for employee joining mid-year")
    void testMidYearJoin() {
        BigDecimal annual = BigDecimal.valueOf(18.0);
        // Jul 1 in non-leap year (184 remaining days out of 365)
        BigDecimal result = ProRatingCalculator.calculate(annual, LocalDate.of(2025, 7, 1), 2025);
        assertThat(result).isEqualByComparingTo(BigDecimal.valueOf(9.1));

        // Future year joiner gives 0
        BigDecimal future = ProRatingCalculator.calculate(annual, LocalDate.of(2027, 1, 1), 2026);
        assertThat(future).isEqualByComparingTo(BigDecimal.ZERO);
    }
}
