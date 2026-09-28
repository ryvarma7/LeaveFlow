package com.leaveflow.web.controller;

import com.leaveflow.common.DomainException;
import com.leaveflow.common.EmployeePrincipal;
import com.leaveflow.common.ErrorCode;
import com.leaveflow.entity.Employee;
import com.leaveflow.repository.EmployeeRepository;
import com.leaveflow.service.JwtService;
import com.leaveflow.web.dto.AuthDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Login and user profile endpoints")
public class AuthController {

    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(
        EmployeeRepository employeeRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService
    ) {
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and issue JWT token")
    public AuthDto.LoginResponse login(@RequestBody AuthDto.LoginRequest request) {
        if (request.email() == null || request.password() == null) {
            throw new DomainException(ErrorCode.AUTHENTICATION_FAILED);
        }

        Employee employee = employeeRepository.findByEmail(request.email().trim().toLowerCase())
            .orElseThrow(() -> new DomainException(ErrorCode.AUTHENTICATION_FAILED));

        if (!employee.isActive() || !passwordEncoder.matches(request.password(), employee.getPasswordHash())) {
            throw new DomainException(ErrorCode.AUTHENTICATION_FAILED);
        }

        String token = jwtService.generateToken(
            employee.getId(),
            employee.getEmail(),
            employee.getRole(),
            employee.getFullName()
        );

        String teamName = (employee.getTeam() != null) ? employee.getTeam().getName() : null;

        return new AuthDto.LoginResponse(
            token,
            employee.getId(),
            employee.getEmployeeCode(),
            employee.getEmail(),
            employee.getFullName(),
            employee.getRole(),
            teamName
        );
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile")
    public AuthDto.UserProfile getProfile() {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        return new AuthDto.UserProfile(
            employee.getId(),
            employee.getEmployeeCode(),
            employee.getFirstName(),
            employee.getLastName(),
            employee.getFullName(),
            employee.getEmail(),
            employee.getRole(),
            employee.getTeam() != null ? employee.getTeam().getId() : null,
            employee.getTeam() != null ? employee.getTeam().getName() : null,
            employee.getManager() != null ? employee.getManager().getId() : null,
            employee.getManager() != null ? employee.getManager().getFullName() : null,
            employee.getMonthlySalary(),
            employee.getJoinedDate(),
            employee.isActive()
        );
    }
}
