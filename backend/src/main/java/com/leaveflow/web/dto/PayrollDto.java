package com.leaveflow.web.dto;

import java.math.BigDecimal;
import java.util.List;

public final class PayrollDto {
    private PayrollDto() {}

    public record PayrollAdjustmentItem(
        String type, // LOP_DEDUCTION, COVERAGE_ALLOWANCE
        String referenceNumber,
        String description,
        String status, // CONFIRMED (from approved leaves), PROJECTED (from pending leaves)
        BigDecimal days,
        BigDecimal dailyRate,
        BigDecimal amount
    ) {}

    public record EmployeePayrollStatement(
        Long employeeId,
        String employeeCode,
        String employeeName,
        String teamName,
        String month,
        BigDecimal baseSalary,
        BigDecimal confirmedLopDeduction,
        BigDecimal projectedLopDeduction,
        BigDecimal confirmedCoverageAllowance,
        BigDecimal projectedCoverageAllowance,
        BigDecimal netAdjustmentConfirmed,
        BigDecimal netAdjustmentProjected,
        BigDecimal estimatedNetSalary,
        List<PayrollAdjustmentItem> items
    ) {}
}
