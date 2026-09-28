package com.leaveflow.web.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leaveflow.common.DomainException;
import com.leaveflow.common.EmployeePrincipal;
import com.leaveflow.common.ErrorCode;
import com.leaveflow.domain.model.LeaveStatus;
import com.leaveflow.entity.CoverageAssignment;
import com.leaveflow.entity.Employee;
import com.leaveflow.entity.LeaveRequest;
import com.leaveflow.repository.CoverageAssignmentRepository;
import com.leaveflow.repository.EmployeeRepository;
import com.leaveflow.repository.LeaveRequestRepository;
import com.leaveflow.web.dto.CoverageDto;
import com.leaveflow.web.dto.LeaveDto;
import com.leaveflow.web.dto.PayrollDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Payroll Statement", description = "Endpoints for loss of pay and coverage allowance salary adjustments")
public class PayrollController {

    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository requestRepository;
    private final CoverageAssignmentRepository coverageRepository;
    private final ObjectMapper objectMapper;

    public PayrollController(
        EmployeeRepository employeeRepository,
        LeaveRequestRepository requestRepository,
        CoverageAssignmentRepository coverageRepository,
        ObjectMapper objectMapper
    ) {
        this.employeeRepository = employeeRepository;
        this.requestRepository = requestRepository;
        this.coverageRepository = coverageRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/me/payroll/adjustments")
    @Operation(summary = "Get own monthly payroll adjustment statement")
    public PayrollDto.EmployeePayrollStatement getMyPayrollAdjustments(@RequestParam(required = false) String month) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        String targetMonth = (month != null && !month.isBlank())
            ? month
            : YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        return buildStatement(employee, targetMonth);
    }

    @GetMapping("/hr/payroll/adjustments")
    @Operation(summary = "Get payroll adjustment statements for all employees (HR only)")
    public List<PayrollDto.EmployeePayrollStatement> getAllPayrollAdjustments(
        @RequestParam(required = false) String month,
        @RequestParam(required = false) Long teamId
    ) {
        String targetMonth = (month != null && !month.isBlank())
            ? month
            : YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        List<Employee> employees = employeeRepository.findAll();
        if (teamId != null) {
            employees = employees.stream()
                .filter(e -> e.getTeam() != null && e.getTeam().getId().equals(teamId))
                .collect(Collectors.toList());
        }

        return employees.stream()
            .map(e -> buildStatement(e, targetMonth))
            .collect(Collectors.toList());
    }

    private PayrollDto.EmployeePayrollStatement buildStatement(Employee emp, String targetMonth) {
        List<LeaveRequest> requests = requestRepository.findByEmployeeIdOrderByCreatedAtDesc(emp.getId());
        List<CoverageAssignment> coverageAssignments = coverageRepository.findByCoveringEmployeeIdOrderByCreatedAtDesc(emp.getId());

        List<PayrollDto.PayrollAdjustmentItem> items = new ArrayList<>();
        BigDecimal confirmedLop = BigDecimal.ZERO;
        BigDecimal projectedLop = BigDecimal.ZERO;
        BigDecimal confirmedAllowance = BigDecimal.ZERO;
        BigDecimal projectedAllowance = BigDecimal.ZERO;

        // Process LOP Deductions
        for (LeaveRequest req : requests) {
            if (req.getStatus() == LeaveStatus.REJECTED || req.getStatus() == LeaveStatus.CANCELLED) {
                continue; // Cancelled/rejected leaves have zero effect
            }
            if (req.getDeductionBreakdown() != null && !req.getDeductionBreakdown().isBlank()) {
                try {
                    List<LeaveDto.DeductionEntry> entries = objectMapper.readValue(
                        req.getDeductionBreakdown(),
                        new TypeReference<List<LeaveDto.DeductionEntry>>() {}
                    );
                    for (LeaveDto.DeductionEntry entry : entries) {
                        if (targetMonth.equals(entry.month()) && entry.amount().compareTo(BigDecimal.ZERO) > 0) {
                            String itemStatus = (req.getStatus() == LeaveStatus.APPROVED) ? "CONFIRMED" : "PROJECTED";
                            if ("CONFIRMED".equals(itemStatus)) {
                                confirmedLop = confirmedLop.add(entry.amount());
                            } else {
                                projectedLop = projectedLop.add(entry.amount());
                            }
                            items.add(new PayrollDto.PayrollAdjustmentItem(
                                "LOP_DEDUCTION",
                                req.getRequestNumber(),
                                "Unpaid leave deduction (" + entry.unpaidDays() + " days)",
                                itemStatus,
                                entry.unpaidDays(),
                                entry.dailyRate(),
                                entry.amount()
                            ));
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        // Process Coverage Allowances
        for (CoverageAssignment cov : coverageAssignments) {
            if (!"ACCEPTED".equals(cov.getStatus())) {
                continue;
            }
            LeaveRequest parent = cov.getRequest();
            if (parent.getStatus() == LeaveStatus.REJECTED || parent.getStatus() == LeaveStatus.CANCELLED) {
                continue;
            }

            if (cov.getAllowanceBreakdown() != null && !cov.getAllowanceBreakdown().isBlank()) {
                try {
                    List<CoverageDto.AllowanceEntry> entries = objectMapper.readValue(
                        cov.getAllowanceBreakdown(),
                        new TypeReference<List<CoverageDto.AllowanceEntry>>() {}
                    );
                    for (CoverageDto.AllowanceEntry entry : entries) {
                        if (targetMonth.equals(entry.month()) && entry.amount().compareTo(BigDecimal.ZERO) > 0) {
                            String itemStatus = (parent.getStatus() == LeaveStatus.APPROVED) ? "CONFIRMED" : "PROJECTED";
                            if ("CONFIRMED".equals(itemStatus)) {
                                confirmedAllowance = confirmedAllowance.add(entry.amount());
                            } else {
                                projectedAllowance = projectedAllowance.add(entry.amount());
                            }
                            items.add(new PayrollDto.PayrollAdjustmentItem(
                                "COVERAGE_ALLOWANCE",
                                parent.getRequestNumber(),
                                "Work coverage allowance for " + parent.getEmployee().getFullName() + " (" + entry.coveredDays() + " days)",
                                itemStatus,
                                entry.coveredDays(),
                                entry.dailyRate(),
                                entry.amount()
                            ));
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        BigDecimal netConfirmed = confirmedAllowance.subtract(confirmedLop);
        BigDecimal netProjected = projectedAllowance.subtract(projectedLop);
        BigDecimal estimatedNetSalary = emp.getMonthlySalary().add(netConfirmed);

        return new PayrollDto.EmployeePayrollStatement(
            emp.getId(),
            emp.getEmployeeCode(),
            emp.getFullName(),
            emp.getTeam() != null ? emp.getTeam().getName() : null,
            targetMonth,
            emp.getMonthlySalary(),
            confirmedLop,
            projectedLop,
            confirmedAllowance,
            projectedAllowance,
            netConfirmed,
            netProjected,
            estimatedNetSalary,
            items
        );
    }
}
