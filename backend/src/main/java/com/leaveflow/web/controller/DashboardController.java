package com.leaveflow.web.controller;

import com.leaveflow.common.DomainException;
import com.leaveflow.common.EmployeePrincipal;
import com.leaveflow.common.ErrorCode;
import com.leaveflow.entity.Employee;
import com.leaveflow.entity.LeaveBalance;
import com.leaveflow.entity.LeaveRequest;
import com.leaveflow.repository.CoverageAssignmentRepository;
import com.leaveflow.repository.EmployeeRepository;
import com.leaveflow.repository.LeaveBalanceRepository;
import com.leaveflow.repository.LeaveRequestRepository;
import com.leaveflow.web.dto.DashboardDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@Tag(name = "Dashboard", description = "Role-aware dashboard metrics and KPI cards")
public class DashboardController {

    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository requestRepository;
    private final LeaveBalanceRepository balanceRepository;
    private final CoverageAssignmentRepository coverageRepository;
    private final Clock clock;

    public DashboardController(
        EmployeeRepository employeeRepository,
        LeaveRequestRepository requestRepository,
        LeaveBalanceRepository balanceRepository,
        CoverageAssignmentRepository coverageRepository,
        Clock clock
    ) {
        this.employeeRepository = employeeRepository;
        this.requestRepository = requestRepository;
        this.balanceRepository = balanceRepository;
        this.coverageRepository = coverageRepository;
        this.clock = clock;
    }

    @GetMapping("/summary")
    @Operation(summary = "Get role-aware dashboard summary KPIs with live data")
    public DashboardDto.DashboardSummaryResponse getDashboardSummary() {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        int currentYear = LocalDate.now(clock).getYear();
        LocalDate today = LocalDate.now(clock);
        Instant startOfMonth = YearMonth.now(clock).atDay(1).atStartOfDay(ZoneId.of("UTC")).toInstant();

        // Employee metrics
        List<LeaveBalance> balances = balanceRepository.findByEmployeeIdAndYear(employee.getId(), currentYear);
        BigDecimal annualAvail = balances.stream().filter(b -> "ANNUAL".equalsIgnoreCase(b.getLeaveType().getCode())).findFirst().map(LeaveBalance::getAvailable).orElse(BigDecimal.ZERO);
        BigDecimal sickAvail = balances.stream().filter(b -> "SICK".equalsIgnoreCase(b.getLeaveType().getCode())).findFirst().map(LeaveBalance::getAvailable).orElse(BigDecimal.ZERO);
        BigDecimal casualAvail = balances.stream().filter(b -> "CASUAL".equalsIgnoreCase(b.getLeaveType().getCode())).findFirst().map(LeaveBalance::getAvailable).orElse(BigDecimal.ZERO);
        long pendingReqCount = requestRepository.countPendingByEmployeeId(employee.getId());
        long waitingOffersCount = coverageRepository.countPendingOffersForEmployee(employee.getId());

        // Manager metrics
        Long awaitingDecision = null;
        Long escalatedToManager = null;
        Long teamOffToday = null;
        Long teamSize = null;
        Long coverageGaps = null;

        if ("MANAGER".equalsIgnoreCase(principal.getRole()) || "HR".equalsIgnoreCase(principal.getRole())) {
            awaitingDecision = requestRepository.countAwaitingManagerDecision(employee.getId());
            escalatedToManager = (long) requestRepository.findEscalatedForManager(employee.getId()).size();
            if (employee.getTeam() != null) {
                teamSize = (long) employeeRepository.findByTeamIdAndActiveTrue(employee.getTeam().getId()).size();
                teamOffToday = (long) requestRepository.findTeamMembersOnLeaveToday(employee.getTeam().getId(), today).size();
            }
            coverageGaps = 0L; // proxy for gaps
        }

        // HR metrics
        Long awaitingHr = null;
        Long totalEscalated = null;
        Long employeesOnLeaveToday = null;
        Long requestsThisMonth = null;

        if ("HR".equalsIgnoreCase(principal.getRole())) {
            awaitingHr = requestRepository.countAwaitingHr();
            totalEscalated = requestRepository.countTotalEscalated();
            employeesOnLeaveToday = (long) requestRepository.findEmployeesOnLeaveToday(today).size();
            requestsThisMonth = requestRepository.countRequestsThisMonth(startOfMonth);
        }

        return new DashboardDto.DashboardSummaryResponse(
            principal.getRole(),
            annualAvail,
            sickAvail,
            casualAvail,
            pendingReqCount,
            waitingOffersCount,
            awaitingDecision,
            escalatedToManager,
            teamOffToday,
            teamSize,
            coverageGaps,
            awaitingHr,
            totalEscalated,
            employeesOnLeaveToday,
            requestsThisMonth
        );
    }
}
