package com.leaveflow.domain;

import com.leaveflow.domain.calculator.PayCalculator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PayCalculatorTest {

    @Test
    @DisplayName("Calculate pay split when available balance covers all days")
    void testFullBalance() {
        List<LocalDate> days = List.of(
            LocalDate.of(2026, 10, 5),
            LocalDate.of(2026, 10, 6),
            LocalDate.of(2026, 10, 7)
        );

        PayCalculator.PayCalculationResult result = PayCalculator.calculateLeavePay(
            days,
            BigDecimal.valueOf(10.0),
            BigDecimal.valueOf(100000.0),
            Map.of(YearMonth.of(2026, 10), 22)
        );

        assertThat(result.paidDays()).isEqualByComparingTo(BigDecimal.valueOf(3.0));
        assertThat(result.unpaidDays()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.estimatedDeduction()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.deductionBreakdown()).isEmpty();
    }

    @Test
    @DisplayName("Calculate pay split with partial balance and LOP deduction")
    void testPartialBalanceWithLop() {
        List<LocalDate> days = List.of(
            LocalDate.of(2026, 10, 5),
            LocalDate.of(2026, 10, 6),
            LocalDate.of(2026, 10, 7),
            LocalDate.of(2026, 10, 8),
            LocalDate.of(2026, 10, 9)
        );

        // 2 paid days available out of 5 requested => 3 unpaid days
        // salary 110,000 / 22 working days = 5,000/day
        // deduction = 3 * 5,000 = 15,000
        PayCalculator.PayCalculationResult result = PayCalculator.calculateLeavePay(
            days,
            BigDecimal.valueOf(2.0),
            BigDecimal.valueOf(110000.0),
            Map.of(YearMonth.of(2026, 10), 22)
        );

        assertThat(result.paidDays()).isEqualByComparingTo(BigDecimal.valueOf(2.0));
        assertThat(result.unpaidDays()).isEqualByComparingTo(BigDecimal.valueOf(3.0));
        assertThat(result.estimatedDeduction()).isEqualByComparingTo(BigDecimal.valueOf(15000.00));
        assertThat(result.deductionBreakdown()).hasSize(1);
    }
}
