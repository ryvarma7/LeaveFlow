package com.leaveflow.web.controller;

import com.leaveflow.common.DomainException;
import com.leaveflow.common.EmployeePrincipal;
import com.leaveflow.common.ErrorCode;
import com.leaveflow.domain.calculator.ConflictCalculator;
import com.leaveflow.domain.calculator.WorkingDayCalculator;
import com.leaveflow.domain.model.LeaveStatus;
import com.leaveflow.entity.Employee;
import com.leaveflow.entity.Holiday;
import com.leaveflow.entity.LeaveRequest;
import com.leaveflow.repository.EmployeeRepository;
import com.leaveflow.repository.HolidayRepository;
import com.leaveflow.repository.LeaveRequestRepository;
import com.leaveflow.web.dto.LeaveDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/manager")
@Tag(name = "Manager Operations", description = "Endpoints for team managers to review queues and team calendar")
public class ManagerController {

    private final LeaveRequestRepository requestRepository;
    private final EmployeeRepository employeeRepository;
    private final HolidayRepository holidayRepository;

    public ManagerController(
        LeaveRequestRepository requestRepository,
        EmployeeRepository employeeRepository,
        HolidayRepository holidayRepository
    ) {
        this.requestRepository = requestRepository;
        this.employeeRepository = employeeRepository;
        this.holidayRepository = holidayRepository;
    }

    @GetMapping("/queue")
    @Operation(summary = "Get manager approval queue")
    public List<LeaveDto.LeaveSummaryResponse> getManagerQueue(
        @RequestParam(defaultValue = "pending") String scope
    ) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        List<LeaveRequest> requests;

        if ("escalated".equalsIgnoreCase(scope)) {
            requests = requestRepository.findEscalatedForManager(principal.getId());
        } else if ("history".equalsIgnoreCase(scope)) {
            requests = requestRepository.findHistoryForManager(principal.getId());
        } else {
            requests = requestRepository.findPendingForManager(principal.getId());
        }

        return requests.stream().map(this::toSummaryResponse).collect(Collectors.toList());
    }

    public record DayAttendance(
        LocalDate date,
        int activeLeaveCount,
        int allowedAbsent,
        boolean thresholdExceeded,
        List<String> absentEmployeeNames
    ) {}

    public record TeamCalendarResponse(
        Long teamId,
        String teamName,
        int teamSize,
        BigDecimal maxAbsentPercent,
        LocalDate fromDate,
        LocalDate toDate,
        List<DayAttendance> days
    ) {}

    @GetMapping("/team-calendar")
    @Operation(summary = "Get team attendance and conflict calendar for date range")
    public TeamCalendarResponse getTeamCalendar(
        @RequestParam LocalDate from,
        @RequestParam LocalDate to
    ) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee manager = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Manager not found"));

        if (manager.getTeam() == null) {
            throw new DomainException(ErrorCode.VALIDATION_FAILED, "Manager has no assigned team");
        }

        List<Employee> teamMembers = employeeRepository.findByTeamIdAndActiveTrue(manager.getTeam().getId());
        int teamSize = teamMembers.size();
        BigDecimal maxAbsentPct = manager.getTeam().getMaxAbsentPercent();
        int allowedAbsent = ConflictCalculator.calculateAllowedAbsent(teamSize, maxAbsentPct);

        List<LeaveRequest> teamLeaves = requestRepository.findTeamActiveRequestsBetween(
            manager.getTeam().getId(),
            from,
            to
        );

        List<DayAttendance> dayAttendances = new ArrayList<>();
        LocalDate current = from;

        while (!current.isAfter(to)) {
            LocalDate date = current;
            List<String> absents = new ArrayList<>();
            for (LeaveRequest lr : teamLeaves) {
                if (!date.isBefore(lr.getStartDate()) && !date.isAfter(lr.getEndDate())) {
                    absents.add(lr.getEmployee().getFullName() + " (" + lr.getStatus() + ")");
                }
            }
            boolean exceeded = (absents.size() > allowedAbsent);
            dayAttendances.add(new DayAttendance(date, absents.size(), allowedAbsent, exceeded, absents));
            current = current.plusDays(1);
        }

        return new TeamCalendarResponse(
            manager.getTeam().getId(),
            manager.getTeam().getName(),
            teamSize,
            maxAbsentPct,
            from,
            to,
            dayAttendances
        );
    }

    private LeaveDto.LeaveSummaryResponse toSummaryResponse(LeaveRequest r) {
        return new LeaveDto.LeaveSummaryResponse(
            r.getId(),
            r.getRequestNumber(),
            r.getEmployee().getId(),
            r.getEmployee().getFullName(),
            r.getEmployee().getEmployeeCode(),
            r.getEmployee().getTeam() != null ? r.getEmployee().getTeam().getName() : null,
            r.getLeaveType().getId(),
            r.getLeaveType().getName(),
            r.getLeaveType().getCode(),
            r.getStartDate(),
            r.getEndDate(),
            r.getWorkingDays(),
            r.getPaidDays(),
            r.getUnpaidDays(),
            r.getStatus(),
            r.getEscalationLevel(),
            r.getEscalationLevel() > 0,
            r.getCoverageStatus(),
            r.isConflictFlag(),
            r.getStageDeadlineAt(),
            r.getCreatedAt()
        );
    }
}
