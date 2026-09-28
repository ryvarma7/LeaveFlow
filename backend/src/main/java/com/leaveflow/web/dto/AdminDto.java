package com.leaveflow.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class AdminDto {
    private AdminDto() {}

    public record CreateEmployeeRequest(
        String employeeCode,
        String firstName,
        String lastName,
        String email,
        String password,
        String role,
        Long teamId,
        Long managerId,
        BigDecimal monthlySalary,
        LocalDate joinedDate
    ) {}

    public record UpdateTeamThresholdRequest(
        BigDecimal maxAbsentPercent
    ) {}
}
