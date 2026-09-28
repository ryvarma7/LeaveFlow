package com.leaveflow.domain;

import com.leaveflow.domain.calculator.CoverageRules;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class CoverageRulesTest {

    @Test
    @DisplayName("Verify covered days calculation")
    void testCoveredDays() {
        BigDecimal days = CoverageRules.calculateCoveredDays(BigDecimal.valueOf(5.0), BigDecimal.valueOf(50.0));
        assertThat(days).isEqualByComparingTo(BigDecimal.valueOf(2.50));
    }

    @Test
    @DisplayName("Verify share sum constraint")
    void testShareSum() {
        assertThat(CoverageRules.validateShareSum(BigDecimal.valueOf(50), BigDecimal.valueOf(50))).isTrue();
        assertThat(CoverageRules.validateShareSum(BigDecimal.valueOf(60), BigDecimal.valueOf(50))).isFalse();
    }

    @Test
    @DisplayName("Verify monthly cap constraint")
    void testMonthlyCap() {
        assertThat(CoverageRules.validateMonthlyCap(BigDecimal.valueOf(3.0), BigDecimal.valueOf(2.0), BigDecimal.valueOf(5.0))).isTrue();
        assertThat(CoverageRules.validateMonthlyCap(BigDecimal.valueOf(4.0), BigDecimal.valueOf(2.0), BigDecimal.valueOf(5.0))).isFalse();
    }
}
