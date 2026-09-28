package com.leaveflow.web.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leaveflow.common.DomainException;
import com.leaveflow.common.EmployeePrincipal;
import com.leaveflow.common.ErrorCode;
import com.leaveflow.domain.calculator.ConflictCalculator;
import com.leaveflow.domain.calculator.PayCalculator;
import com.leaveflow.domain.calculator.WorkingDayCalculator;
import com.leaveflow.domain.model.LeaveEvent;
import com.leaveflow.domain.model.LeaveStatus;
import com.leaveflow.entity.*;
import com.leaveflow.repository.*;
import com.leaveflow.service.BalanceService;
import com.leaveflow.service.LeaveWorkflowService;
import com.leaveflow.service.NotificationService;
import com.leaveflow.web.dto.CoverageDto;
import com.leaveflow.web.dto.LeaveDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Leave Requests", description = "Endpoints for managing leave requests, approvals, and balances")
public class LeaveRequestController {

    private final LeaveWorkflowService workflowService;
    private final LeaveRequestRepository requestRepository;
    private final LeaveRequestEventRepository eventRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository balanceRepository;
    private final HolidayRepository holidayRepository;
    private final EmployeeRepository employeeRepository;
    private final CoverageAssignmentRepository coverageRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public LeaveRequestController(
        LeaveWorkflowService workflowService,
        LeaveRequestRepository requestRepository,
        LeaveRequestEventRepository eventRepository,
        LeaveTypeRepository leaveTypeRepository,
        LeaveBalanceRepository balanceRepository,
        HolidayRepository holidayRepository,
        EmployeeRepository employeeRepository,
        CoverageAssignmentRepository coverageRepository,
        NotificationService notificationService,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.workflowService = workflowService;
        this.requestRepository = requestRepository;
        this.eventRepository = eventRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.balanceRepository = balanceRepository;
        this.holidayRepository = holidayRepository;
        this.employeeRepository = employeeRepository;
        this.coverageRepository = coverageRepository;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @PostMapping("/leave-requests/preview")
    @Operation(summary = "Preview working days, balance change, and financial impact with no side effects")
    public LeaveDto.LeavePreviewResponse previewLeaveRequest(@RequestBody LeaveDto.LeavePreviewRequest previewReq) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        LeaveType leaveType = leaveTypeRepository.findById(previewReq.leaveTypeId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Leave type not found"));

        LocalDate startDate = previewReq.startDate();
        LocalDate endDate = previewReq.endDate();
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            throw new DomainException(ErrorCode.VALIDATION_FAILED, "Valid start and end dates are required");
        }

        List<Holiday> holidays = holidayRepository.findBetweenDates(startDate, endDate);
        Map<LocalDate, String> holidayMap = new HashMap<>();
        holidays.forEach(h -> holidayMap.put(h.getDate(), h.getName()));

        WorkingDayCalculator.CalculationResult calcResult = WorkingDayCalculator.calculate(startDate, endDate, null, holidayMap);
        int year = startDate.getYear();

        BigDecimal balanceBefore = BigDecimal.ZERO;
        if (leaveType.isPaid()) {
            balanceBefore = balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(employee.getId(), leaveType.getId(), year)
                .map(LeaveBalance::getAvailable)
                .orElse(BigDecimal.ZERO);
        }

        Map<YearMonth, Integer> monthWorkingDays = buildMonthWorkingDaysMap(calcResult.workingDayList());
        PayCalculator.PayCalculationResult payResult = PayCalculator.calculateLeavePay(
            calcResult.workingDayList(),
            balanceBefore,
            employee.getMonthlySalary(),
            monthWorkingDays
        );

        BigDecimal balanceAfter = balanceBefore.subtract(payResult.paidDays()).max(BigDecimal.ZERO);

        List<LeaveDto.DeductionEntry> deductionEntries = new ArrayList<>();
        for (PayCalculator.MonthDeduction md : payResult.deductionBreakdown()) {
            deductionEntries.add(new LeaveDto.DeductionEntry(md.month(), md.unpaidDays(), md.dailyRate(), md.amount()));
        }

        List<String> warnings = new ArrayList<>();
        if (payResult.unpaidDays().compareTo(BigDecimal.ZERO) > 0) {
            warnings.add(String.format("%s of %s days exceed your paid leave. Estimated deduction: %s",
                payResult.unpaidDays(), calcResult.workingDays(), payResult.estimatedDeduction()));
        }

        // Team absence warning count
        int absenceCount = 0;
        boolean conflictWarning = false;
        if (employee.getTeam() != null && !calcResult.workingDayList().isEmpty()) {
            List<LeaveRequest> teamLeaves = requestRepository.findTeamActiveRequestsBetween(
                employee.getTeam().getId(),
                startDate,
                endDate
            );
            absenceCount = (int) teamLeaves.stream()
                .filter(l -> !l.getEmployee().getId().equals(employee.getId()))
                .count();
            if (absenceCount > 0) {
                warnings.add(absenceCount + " teammate(s) already have scheduled absence in this date range");
                conflictWarning = true;
            }
        }

        return new LeaveDto.LeavePreviewResponse(
            calcResult.workingDays(),
            calcResult.workingDayList(),
            calcResult.excludedDates(),
            payResult.paidDays(),
            payResult.unpaidDays(),
            payResult.estimatedDeduction(),
            deductionEntries,
            payResult.salarySet(),
            balanceBefore,
            balanceAfter,
            conflictWarning,
            absenceCount,
            warnings
        );
    }

    @PostMapping("/leave-requests")
    @Operation(summary = "Submit a new leave request")
    public LeaveDto.LeaveSummaryResponse submitLeave(@RequestBody LeaveDto.LeaveSubmitRequest req) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        LeaveRequest saved = workflowService.submitLeaveRequest(
            employee,
            req.leaveTypeId(),
            req.startDate(),
            req.endDate(),
            req.reason(),
            req.handoverNotes(),
            req.acknowledgeUnpaid()
        );

        return toSummaryResponse(saved);
    }

    @GetMapping("/leave-requests/mine")
    @Operation(summary = "Get current user's submitted leave requests")
    public List<LeaveDto.LeaveSummaryResponse> getMyRequests() {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        List<LeaveRequest> requests = requestRepository.findByEmployeeIdOrderByCreatedAtDesc(principal.getId());
        return requests.stream().map(this::toSummaryResponse).collect(Collectors.toList());
    }

    @GetMapping("/leave-requests/{id}")
    @Operation(summary = "Get detailed leave request info by ID")
    public LeaveDto.LeaveDetailResponse getRequestDetail(@PathVariable Long id) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        LeaveRequest req = requestRepository.findById(id)
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Leave request not found"));

        // Privacy check
        boolean isOwner = req.getEmployee().getId().equals(principal.getId());
        boolean isManager = "MANAGER".equalsIgnoreCase(principal.getRole()) || "HR".equalsIgnoreCase(principal.getRole());
        if (!isOwner && !isManager) {
            throw new DomainException(ErrorCode.NOT_FOUND, "Leave request not found");
        }

        List<LeaveRequestEvent> events = eventRepository.findByRequestIdOrderBySeqAsc(id);
        List<LeaveDto.LeaveEventDto> timeline = events.stream().map(e -> new LeaveDto.LeaveEventDto(
            e.getId(),
            e.getEventType(),
            e.getFromStatus(),
            e.getToStatus(),
            e.getActor() != null ? e.getActor().getFullName() : "System",
            e.getComments(),
            e.getSeq(),
            e.getCreatedAt()
        )).collect(Collectors.toList());

        List<CoverageAssignment> coverageList = coverageRepository.findByRequestIdOrderByCreatedAtAsc(id);
        List<CoverageDto.CoverageAssignmentResponse> coverageDtoList = coverageList.stream().map(c -> {
            boolean canSeeAmount = isOwner || "HR".equalsIgnoreCase(principal.getRole()) || c.getCoveringEmployee().getId().equals(principal.getId());
            return new CoverageDto.CoverageAssignmentResponse(
                c.getId(),
                c.getRequest().getId(),
                c.getRequest().getRequestNumber(),
                c.getRequest().getEmployee().getFullName(),
                c.getRequest().getStartDate(),
                c.getRequest().getEndDate(),
                c.getCoveringEmployee().getId(),
                c.getCoveringEmployee().getFullName(),
                c.getOfferedBy().getId(),
                c.getOfferedBy().getFullName(),
                c.getSharePercent(),
                c.getCoveredDays(),
                c.getStatus(),
                c.getNote(),
                c.getDeclineReason(),
                canSeeAmount ? c.getAllowanceAmount() : BigDecimal.ZERO,
                Collections.emptyList(),
                c.getRespondedAt(),
                c.getCreatedAt()
            );
        }).collect(Collectors.toList());

        List<LeaveDto.DeductionEntry> deductionEntries = new ArrayList<>();
        if (req.getDeductionBreakdown() != null && !req.getDeductionBreakdown().isBlank()) {
            try {
                deductionEntries = objectMapper.readValue(req.getDeductionBreakdown(), new TypeReference<List<LeaveDto.DeductionEntry>>() {});
            } catch (Exception ignored) {}
        }

        List<String> allowedActions = computeAllowedActions(req, principal.getId(), principal.getRole());

        return new LeaveDto.LeaveDetailResponse(
            req.getId(),
            req.getRequestNumber(),
            req.getEmployee().getId(),
            req.getEmployee().getFullName(),
            req.getEmployee().getEmployeeCode(),
            req.getEmployee().getTeam() != null ? req.getEmployee().getTeam().getName() : null,
            req.getLeaveType().getId(),
            req.getLeaveType().getName(),
            req.getLeaveType().getCode(),
            req.getStartDate(),
            req.getEndDate(),
            req.getWorkingDays(),
            req.getPaidDays(),
            req.getUnpaidDays(),
            req.getEstimatedDeduction(),
            deductionEntries,
            req.getHandoverNotes(),
            req.getReason(),
            req.getStatus(),
            req.getStageEnteredAt(),
            req.getStageDeadlineAt(),
            req.getEscalatedAt(),
            req.getEscalationLevel(),
            req.getEscalationLevel() > 0,
            req.getCoverageStatus(),
            req.isConflictFlag(),
            allowedActions,
            timeline,
            coverageDtoList,
            req.getCreatedAt(),
            req.getUpdatedAt()
        );
    }

    @PostMapping("/leave-requests/{id}/cancel")
    @Operation(summary = "Cancel a leave request")
    public LeaveDto.LeaveSummaryResponse cancelRequest(
        @PathVariable Long id,
        @RequestBody(required = false) LeaveDto.LeaveActionRequest actionReq
    ) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        LeaveStatus expected = (actionReq != null) ? actionReq.expectedStatus() : null;
        String comment = (actionReq != null) ? actionReq.comment() : "Cancelled by user";

        LeaveRequest updated = workflowService.act(id, LeaveEvent.CANCEL, employee, expected, comment);
        return toSummaryResponse(updated);
    }

    @PostMapping("/leave-requests/{id}/manager/approve")
    @Operation(summary = "Manager approves a leave request")
    public LeaveDto.LeaveSummaryResponse managerApprove(
        @PathVariable Long id,
        @RequestBody(required = false) LeaveDto.LeaveActionRequest actionReq
    ) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        LeaveStatus expected = (actionReq != null) ? actionReq.expectedStatus() : null;
        String comment = (actionReq != null) ? actionReq.comment() : null;

        LeaveRequest updated = workflowService.act(id, LeaveEvent.MANAGER_APPROVE, employee, expected, comment);
        return toSummaryResponse(updated);
    }

    @PostMapping("/leave-requests/{id}/manager/reject")
    @Operation(summary = "Manager rejects a leave request")
    public LeaveDto.LeaveSummaryResponse managerReject(
        @PathVariable Long id,
        @RequestBody LeaveDto.LeaveActionRequest actionReq
    ) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        LeaveStatus expected = (actionReq != null) ? actionReq.expectedStatus() : null;
        String comment = (actionReq != null) ? actionReq.comment() : null;

        LeaveRequest updated = workflowService.act(id, LeaveEvent.MANAGER_REJECT, employee, expected, comment);
        return toSummaryResponse(updated);
    }

    @PostMapping("/leave-requests/{id}/hr/approve")
    @Operation(summary = "HR approves a leave request")
    public LeaveDto.LeaveSummaryResponse hrApprove(
        @PathVariable Long id,
        @RequestBody(required = false) LeaveDto.LeaveActionRequest actionReq
    ) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        LeaveStatus expected = (actionReq != null) ? actionReq.expectedStatus() : null;
        String comment = (actionReq != null) ? actionReq.comment() : null;

        LeaveRequest updated = workflowService.act(id, LeaveEvent.HR_APPROVE, employee, expected, comment);
        return toSummaryResponse(updated);
    }

    @PostMapping("/leave-requests/{id}/hr/reject")
    @Operation(summary = "HR rejects a leave request")
    public LeaveDto.LeaveSummaryResponse hrReject(
        @PathVariable Long id,
        @RequestBody LeaveDto.LeaveActionRequest actionReq
    ) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        LeaveStatus expected = (actionReq != null) ? actionReq.expectedStatus() : null;
        String comment = (actionReq != null) ? actionReq.comment() : null;

        LeaveRequest updated = workflowService.act(id, LeaveEvent.HR_REJECT, employee, expected, comment);
        return toSummaryResponse(updated);
    }

    @GetMapping("/leave-types")
    @Operation(summary = "Get all configured leave types")
    public List<LeaveType> getLeaveTypes() {
        return leaveTypeRepository.findAll();
    }

    @GetMapping("/me/balances")
    @Operation(summary = "Get current user leave balances")
    public List<LeaveDto.BalanceResponse> getMyBalances(@RequestParam(required = false) Integer year) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        int targetYear = (year != null) ? year : LocalDate.now(clock).getYear();

        List<LeaveBalance> balances = balanceRepository.findByEmployeeIdAndYear(principal.getId(), targetYear);
        return balances.stream().map(b -> new LeaveDto.BalanceResponse(
            b.getId(),
            b.getLeaveType().getId(),
            b.getLeaveType().getCode(),
            b.getLeaveType().getName(),
            b.getYear(),
            b.getEntitled(),
            b.getCarried(),
            b.getAdjustment(),
            b.getPending(),
            b.getUsed(),
            b.getAvailable()
        )).collect(Collectors.toList());
    }

    @GetMapping("/me/notifications")
    @Operation(summary = "Get notifications for current employee")
    public List<LeaveDto.NotificationResponse> getMyNotifications() {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        return notificationService.getNotificationsForEmployee(principal.getId()).stream()
            .map(n -> new LeaveDto.NotificationResponse(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getType(),
                n.getReferenceId(),
                n.isRead(),
                n.getCreatedAt()
            ))
            .collect(Collectors.toList());
    }

    @PostMapping("/me/notifications/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public void markNotificationRead(@PathVariable Long id) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        notificationService.markAsRead(id, principal.getId());
    }

    @PostMapping("/me/notifications/read-all")
    @Operation(summary = "Mark all notifications as read")
    public void markAllNotificationsRead() {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        notificationService.markAllAsRead(principal.getId());
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

    private List<String> computeAllowedActions(LeaveRequest req, Long actorId, String actorRole) {
        List<String> actions = new ArrayList<>();
        boolean isOwner = req.getEmployee().getId().equals(actorId);

        if (req.getStatus() == LeaveStatus.PENDING_MANAGER) {
            if (isOwner) actions.add("CANCEL");
            if (!isOwner && ("MANAGER".equalsIgnoreCase(actorRole) || "HR".equalsIgnoreCase(actorRole))) {
                actions.add("MANAGER_APPROVE");
                actions.add("MANAGER_REJECT");
            }
        } else if (req.getStatus() == LeaveStatus.PENDING_HR) {
            if (isOwner) actions.add("CANCEL");
            if (!isOwner && "HR".equalsIgnoreCase(actorRole)) {
                actions.add("HR_APPROVE");
                actions.add("HR_REJECT");
            }
        } else if (req.getStatus() == LeaveStatus.APPROVED) {
            LocalDate today = LocalDate.now(clock);
            if (req.getStartDate().isAfter(today) && (isOwner || "HR".equalsIgnoreCase(actorRole))) {
                actions.add("CANCEL");
            }
        }
        return actions;
    }

    private Map<YearMonth, Integer> buildMonthWorkingDaysMap(List<LocalDate> days) {
        Map<YearMonth, Integer> map = new HashMap<>();
        for (LocalDate day : days) {
            YearMonth ym = YearMonth.from(day);
            map.putIfAbsent(ym, 22);
        }
        return map;
    }
}
