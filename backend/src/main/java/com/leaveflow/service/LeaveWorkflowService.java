package com.leaveflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leaveflow.common.DomainException;
import com.leaveflow.common.ErrorCode;
import com.leaveflow.config.LeaveProperties;
import com.leaveflow.domain.calculator.ConflictCalculator;
import com.leaveflow.domain.calculator.PayCalculator;
import com.leaveflow.domain.calculator.WorkingDayCalculator;
import com.leaveflow.domain.model.LeaveEvent;
import com.leaveflow.domain.model.LeaveStatus;
import com.leaveflow.domain.policy.ApprovalAuthorityResolver;
import com.leaveflow.domain.policy.EscalationPolicy;
import com.leaveflow.domain.statemachine.LeaveStateMachine;
import com.leaveflow.entity.*;
import com.leaveflow.repository.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
public class LeaveWorkflowService {

    private final LeaveRequestRepository requestRepository;
    private final LeaveRequestEventRepository eventRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository balanceRepository;
    private final HolidayRepository holidayRepository;
    private final EmployeeRepository employeeRepository;
    private final BalanceService balanceService;
    private final CoverageService coverageService;
    private final NotificationService notificationService;
    private final LeaveProperties properties;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public LeaveWorkflowService(
        LeaveRequestRepository requestRepository,
        LeaveRequestEventRepository eventRepository,
        LeaveTypeRepository leaveTypeRepository,
        LeaveBalanceRepository balanceRepository,
        HolidayRepository holidayRepository,
        EmployeeRepository employeeRepository,
        BalanceService balanceService,
        CoverageService coverageService,
        NotificationService notificationService,
        LeaveProperties properties,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.requestRepository = requestRepository;
        this.eventRepository = eventRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.balanceRepository = balanceRepository;
        this.holidayRepository = holidayRepository;
        this.employeeRepository = employeeRepository;
        this.balanceService = balanceService;
        this.coverageService = coverageService;
        this.notificationService = notificationService;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional
    public LeaveRequest submitLeaveRequest(
        Employee requester,
        Long leaveTypeId,
        LocalDate startDate,
        LocalDate endDate,
        String reason,
        String handoverNotes,
        boolean acknowledgeUnpaid
    ) {
        if (startDate == null || endDate == null) {
            throw new DomainException(ErrorCode.VALIDATION_FAILED, "Start and end date are required");
        }
        if (endDate.isBefore(startDate)) {
            throw new DomainException(ErrorCode.VALIDATION_FAILED, "End date cannot be before start date");
        }
        if (startDate.getYear() != endDate.getYear()) {
            throw new DomainException(ErrorCode.VALIDATION_FAILED, "Leave request cannot span across calendar years");
        }

        LocalDate today = LocalDate.now(clock);
        LeaveType leaveType = leaveTypeRepository.findById(leaveTypeId)
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Leave type not found"));

        // Backdate validation
        if (startDate.isBefore(today.minusDays(leaveType.getBackdateDays()))) {
            throw new DomainException(ErrorCode.VALIDATION_FAILED,
                String.format("Cannot backdate %s leave by more than %d days", leaveType.getName(), leaveType.getBackdateDays()));
        }


        // Calculate working days
        List<Holiday> holidays = holidayRepository.findBetweenDates(startDate, endDate);
        Map<LocalDate, String> holidayMap = new HashMap<>();
        holidays.forEach(h -> holidayMap.put(h.getDate(), h.getName()));

        WorkingDayCalculator.CalculationResult calcResult = WorkingDayCalculator.calculate(startDate, endDate, null, holidayMap);
        BigDecimal workingDays = calcResult.workingDays();
        if (workingDays.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.VALIDATION_FAILED, "Selected date range contains 0 working days");
        }

        // Auto-decline pending coverage offers for this employee
        coverageService.autoDeclineOverlappingOffers(requester.getId(), startDate, endDate);

        // Lock balance row FOR UPDATE first
        int year = startDate.getYear();
        BigDecimal availableBalance = BigDecimal.ZERO;
        Long balanceId = null;

        if (leaveType.isPaid()) {
            LeaveBalance balance = balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearForUpdate(requester.getId(), leaveTypeId, year)
                .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "No leave balance record found for year " + year));
            availableBalance = balance.getAvailable();
            balanceId = balance.getId();
        }

        // Calculate paid and unpaid days and financial deduction estimate
        Map<YearMonth, Integer> monthWorkingDays = buildMonthWorkingDaysMap(calcResult.workingDayList());
        PayCalculator.PayCalculationResult payResult = PayCalculator.calculateLeavePay(
            calcResult.workingDayList(),
            availableBalance,
            requester.getMonthlySalary(),
            monthWorkingDays
        );

        if (payResult.unpaidDays().compareTo(BigDecimal.ZERO) > 0 && !acknowledgeUnpaid) {
            Map<String, Object> details = new HashMap<>();
            details.put("unpaidDays", payResult.unpaidDays());
            details.put("paidDays", payResult.paidDays());
            details.put("estimatedDeduction", payResult.estimatedDeduction());
            details.put("deductionBreakdown", payResult.deductionBreakdown());
            throw new DomainException(ErrorCode.UNPAID_ACKNOWLEDGEMENT_REQUIRED, "Acknowledgement required for unpaid leave days", details);
        }

        // Resolve approver stage & deadlines
        boolean hasManager = requester.getManager() != null && requester.getManager().isActive();
        LeaveStatus initialStatus = hasManager ? LeaveStatus.PENDING_MANAGER : LeaveStatus.PENDING_HR;
        LeaveEvent initialEvent = hasManager ? LeaveEvent.SUBMIT : LeaveEvent.SUBMIT_TO_HR;

        Instant now = clock.instant();
        long timeoutSec = hasManager
            ? (properties.escalation() != null ? properties.escalation().managerTimeoutSeconds() : 172800L)
            : (properties.escalation() != null ? properties.escalation().hrTimeoutSeconds() : 86400L);
        Instant deadline = now.plusSeconds(timeoutSec);

        // Check team conflict
        boolean conflictFlag = calculateTeamConflict(requester, calcResult.workingDayList());

        String requestNumber = "LR-" + year + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String deductionJson = "";
        try {
            deductionJson = objectMapper.writeValueAsString(payResult.deductionBreakdown());
        } catch (Exception ignored) {}

        LeaveRequest request = new LeaveRequest(
            requestNumber,
            requester,
            leaveType,
            startDate,
            endDate,
            workingDays,
            payResult.paidDays(),
            payResult.unpaidDays(),
            payResult.estimatedDeduction(),
            deductionJson,
            handoverNotes,
            reason,
            initialStatus,
            now,
            deadline,
            conflictFlag
        );

        try {
            request = requestRepository.saveAndFlush(request);
        } catch (DataIntegrityViolationException ex) {
            throw new DomainException(ErrorCode.OVERLAPPING_REQUEST, "You already have an active leave request for overlapping dates");
        }

        // Reserve paid balance
        if (balanceId != null && payResult.paidDays().compareTo(BigDecimal.ZERO) > 0) {
            balanceService.reserve(balanceId, payResult.paidDays(), request, requester);
        }

        // Record event
        LeaveRequestEvent event = new LeaveRequestEvent(
            request,
            initialEvent.name(),
            null,
            initialStatus.name(),
            requester,
            reason,
            1,
            null
        );
        eventRepository.save(event);

        // Notify
        if (hasManager) {
            notificationService.notify(
                requester.getManager(),
                "New Leave Request Pending",
                String.format("%s submitted a leave request (%s to %s)", requester.getFullName(), startDate, endDate),
                "LEAVE_SUBMITTED",
                request.getId()
            );
        }

        return request;
    }

    @Transactional
    public LeaveRequest act(
        Long requestId,
        LeaveEvent event,
        Employee actor,
        LeaveStatus expectedStatus,
        String comments
    ) {
        // Step 1: Lock request row
        LeaveRequest request = requestRepository.findByIdForUpdate(requestId)
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Leave request not found: " + requestId));

        // Step 2: Authorization check
        authorizeAction(request, event, actor);

        // Step 3: Stale state check
        if (expectedStatus != null && request.getStatus() != expectedStatus) {
            throw new DomainException(ErrorCode.STALE_STATE, "This request was updated by another user. Please refresh.");
        }

        // Step 4: State machine transition check
        LeaveStatus fromStatus = request.getStatus();
        LeaveStatus targetStatus = LeaveStateMachine.next(fromStatus, event);

        // Step 5: Action guards
        if (event == LeaveEvent.MANAGER_REJECT || event == LeaveEvent.HR_REJECT) {
            if (comments == null || comments.trim().isEmpty()) {
                throw new DomainException(ErrorCode.COMMENT_REQUIRED, "A rejection comment is required");
            }
        }
        if (fromStatus == LeaveStatus.APPROVED && event == LeaveEvent.CANCEL) {
            LocalDate today = LocalDate.now(clock);
            if (!request.getStartDate().isAfter(today)) {
                throw new DomainException(ErrorCode.CANNOT_CANCEL_PAST_LEAVE, "Cannot cancel approved leave that has already started");
            }
        }

        // Step 6: Balance effects
        Long balanceId = resolveBalanceId(request);
        BigDecimal paidDays = request.getPaidDays();

        if (balanceId != null && paidDays.compareTo(BigDecimal.ZERO) > 0) {
            if (event == LeaveEvent.HR_APPROVE) {
                balanceService.consume(balanceId, paidDays, request, actor);
            } else if (event == LeaveEvent.MANAGER_REJECT || event == LeaveEvent.HR_REJECT) {
                balanceService.release(balanceId, paidDays, request, actor);
            } else if (event == LeaveEvent.CANCEL) {
                if (fromStatus == LeaveStatus.APPROVED) {
                    balanceService.restore(balanceId, paidDays, request, actor);
                } else {
                    balanceService.release(balanceId, paidDays, request, actor);
                }
            }
        }

        // Step 7: Coverage side effects on terminal state
        if (targetStatus == LeaveStatus.REJECTED || targetStatus == LeaveStatus.CANCELLED) {
            coverageService.withdrawAllFor(request);
        }

        // Step 8: Update request status and stage deadlines
        Instant now = clock.instant();
        Instant nextDeadline = null;
        if (targetStatus == LeaveStatus.PENDING_HR) {
            long hrTimeout = (properties.escalation() != null ? properties.escalation().hrTimeoutSeconds() : 86400L);
            nextDeadline = now.plusSeconds(hrTimeout);
        }

        request.moveTo(targetStatus, now, nextDeadline);

        // Step 9: Audit event
        int nextSeq = eventRepository.countByRequestId(request.getId()) + 1;
        LeaveRequestEvent requestEvent = new LeaveRequestEvent(
            request,
            event.name(),
            fromStatus.name(),
            targetStatus.name(),
            actor,
            comments,
            nextSeq,
            null
        );
        eventRepository.save(requestEvent);

        // Step 10: Notifications
        notifyOnTransition(request, event, actor);

        return request;
    }

    @Transactional
    public void systemEscalate(Long requestId, Instant now) {
        LeaveRequest request = requestRepository.findByIdForUpdate(requestId).orElse(null);
        if (request == null) return;

        // Re-check under lock
        if (!request.getStatus().isPending()) return;
        if (request.getStageDeadlineAt() == null || request.getStageDeadlineAt().isAfter(now)) return;

        Employee requester = request.getEmployee();
        Long managerId = (requester.getManager() != null) ? requester.getManager().getId() : null;
        Long skipLevelId = (requester.getManager() != null && requester.getManager().getManager() != null)
            ? requester.getManager().getManager().getId() : null;

        Optional<EscalationPolicy.EscalationStep> stepOpt = EscalationPolicy.next(
            request.getStatus(),
            request.getEscalationLevel(),
            managerId,
            skipLevelId
        );

        if (stepOpt.isEmpty()) {
            return;
        }

        EscalationPolicy.EscalationStep step = stepOpt.get();
        long nextTimeout = (request.getStatus() == LeaveStatus.PENDING_MANAGER)
            ? (properties.escalation() != null ? properties.escalation().skipLevelTimeoutSeconds() : 86400L)
            : (properties.escalation() != null ? properties.escalation().hrTimeoutSeconds() : 86400L);
        Instant nextDeadline = now.plusSeconds(nextTimeout);

        request.escalateTo(step.nextLevel(), nextDeadline, now);

        int seq = eventRepository.countByRequestId(request.getId()) + 1;
        LeaveRequestEvent escEvent = new LeaveRequestEvent(
            request,
            LeaveEvent.ESCALATE.name(),
            request.getStatus().name(),
            request.getStatus().name(),
            null,
            "Automatic escalation to Level " + step.nextLevel(),
            seq,
            "{\"targetRole\":\"" + step.targetRole() + "\"}"
        );
        eventRepository.save(escEvent);

        // Notify
        notificationService.notify(
            requester,
            "Leave Request Escalated",
            String.format("Your leave request %s has been escalated to Level %d for faster review.", request.getRequestNumber(), step.nextLevel()),
            "LEAVE_ESCALATED",
            request.getId()
        );
    }

    private void authorizeAction(LeaveRequest request, LeaveEvent event, Employee actor) {
        if (actor == null) {
            throw new DomainException(ErrorCode.UNAUTHORIZED);
        }

        Employee requester = request.getEmployee();
        Long managerId = (requester.getManager() != null) ? requester.getManager().getId() : null;
        Long skipLevelId = (requester.getManager() != null && requester.getManager().getManager() != null)
            ? requester.getManager().getManager().getId() : null;

        switch (event) {
            case MANAGER_APPROVE, MANAGER_REJECT -> {
                if (actor.getId().equals(requester.getId())) {
                    throw new DomainException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED, "Self-approval is strictly forbidden");
                }
                boolean canAct = ApprovalAuthorityResolver.canActAtManagerStage(
                    actor.getId(),
                    actor.getRole(),
                    actor.isActive(),
                    requester.getId(),
                    managerId,
                    skipLevelId,
                    request.getEscalationLevel()
                );
                if (!canAct) {
                    throw new DomainException(ErrorCode.FORBIDDEN, "You do not have authority to act at the manager stage for this request");
                }
            }
            case HR_APPROVE, HR_REJECT -> {
                if (actor.getId().equals(requester.getId())) {
                    throw new DomainException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED, "Self-approval is strictly forbidden");
                }
                boolean canAct = ApprovalAuthorityResolver.canActAtHrStage(
                    actor.getId(),
                    actor.getRole(),
                    actor.isActive(),
                    requester.getId()
                );
                if (!canAct) {
                    throw new DomainException(ErrorCode.FORBIDDEN, "Only HR members can act at the HR approval stage");
                }
            }
            case CANCEL -> {
                boolean canCancel = ApprovalAuthorityResolver.canCancel(actor.getId(), actor.getRole(), requester.getId());
                if (!canCancel) {
                    throw new DomainException(ErrorCode.FORBIDDEN, "Only the requester or HR can cancel this request");
                }
            }
            default -> throw new DomainException(ErrorCode.FORBIDDEN, "Unauthorized action");
        }
    }

    private Long resolveBalanceId(LeaveRequest request) {
        if (!request.getLeaveType().isPaid()) return null;
        int year = request.getStartDate().getYear();
        return balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(
            request.getEmployee().getId(),
            request.getLeaveType().getId(),
            year
        ).map(LeaveBalance::getId).orElse(null);
    }

    private boolean calculateTeamConflict(Employee requester, List<LocalDate> workingDays) {
        if (requester.getTeam() == null) return false;
        List<Employee> teamMembers = employeeRepository.findByTeamIdAndActiveTrue(requester.getTeam().getId());
        int teamSize = teamMembers.size();

        List<LeaveRequest> teamLeaves = requestRepository.findTeamActiveRequestsBetween(
            requester.getTeam().getId(),
            workingDays.get(0),
            workingDays.get(workingDays.size() - 1)
        );

        List<ConflictCalculator.TeammateAbsence> absences = new ArrayList<>();
        for (LeaveRequest lr : teamLeaves) {
            if (!lr.getEmployee().getId().equals(requester.getId())) {
                absences.add(new ConflictCalculator.TeammateAbsence(
                    lr.getEmployee().getId(),
                    lr.getEmployee().getFullName(),
                    lr.getStartDate(),
                    lr.getEndDate(),
                    lr.getStatus() == LeaveStatus.APPROVED
                ));
            }
        }

        ConflictCalculator.ConflictResult conflictResult = ConflictCalculator.calculate(
            workingDays,
            teamSize,
            requester.getTeam().getMaxAbsentPercent(),
            absences
        );

        return conflictResult.hasConflict();
    }

    private void notifyOnTransition(LeaveRequest request, LeaveEvent event, Employee actor) {
        Employee requester = request.getEmployee();
        String title = "Leave Request Update";
        String message = String.format("Leave request %s: %s by %s", request.getRequestNumber(), event.name(), actor.getFullName());

        notificationService.notify(requester, title, message, "LEAVE_STATUS_CHANGED", request.getId());
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
