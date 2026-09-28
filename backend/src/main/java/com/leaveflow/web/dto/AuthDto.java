package com.leaveflow.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class AuthDto {
    private AuthDto() {}

    public record LoginRequest(String email, String password) {}

    public record LoginResponse(
        String token,
        Long id,
        String employeeCode,
        String email,
        String fullName,
        String role,
        String teamName
    ) {}

    public record UserProfile(
        Long id,
        String employeeCode,
        String firstName,
        String lastName,
        String fullName,
        String email,
        String role,
        Long teamId,
        String teamName,
        Long managerId,
        String managerName,
        BigDecimal monthlySalary,
        LocalDate joinedDate,
        boolean active
    ) {}
}
