package com.leaveflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leaveflow.common.DomainException;
import com.leaveflow.common.ErrorCode;
import com.leaveflow.config.LeaveProperties;
import com.leaveflow.domain.calculator.CoverageRules;
import com.leaveflow.domain.calculator.PayCalculator;
import com.leaveflow.domain.calculator.WorkingDayCalculator;
import com.leaveflow.entity.*;
import com.leaveflow.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;

@Service
public class CoverageService {

    public record CandidateSuggestion(
        Long employeeId,
        String employeeCode,
        String fullName,
        BigDecimal coveredDaysLast90Days,
        BigDecimal leaveDaysThisYear,
        boolean eligible,
        String eligibilityReason
    ) {}

    private final CoverageAssignmentRepository coverageRepository;
    private final LeaveRequestRepository requestRepository;
    private final EmployeeRepository employeeRepository;
    private final HolidayRepository holidayRepository;
    private final NotificationService notificationService;
    private final LeaveProperties properties;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public CoverageService(
        CoverageAssignmentRepository coverageRepository,
        LeaveRequestRepository requestRepository,
        EmployeeRepository employeeRepository,
        HolidayRepository holidayRepository,
        NotificationService notificationService,
        LeaveProperties properties,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.coverageRepository = coverageRepository;
        this.requestRepository = requestRepository;
        this.employeeRepository = employeeRepository;
        this.holidayRepository = holidayRepository;
        this.notificationService = notificationService;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<CandidateSuggestion> getSuggestions(Long requestId, Employee actor) {
        LeaveRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Request not found"));

        Employee requester = request.getEmployee();
        if (requester.getTeam() == null) {
            return Collections.emptyList();
        }

        List<Employee> teammates = employeeRepository.findByTeamIdAndActiveTrue(requester.getTeam().getId());
        List<CandidateSuggestion> suggestions = new ArrayList<>();
        Instant ninetyDaysAgo = clock.instant().minus(Duration.ofDays(90));
        LocalDate today = LocalDate.now(clock);

        List<LocalDate> requestWorkingDays = getWorkingDaysForRequest(request);

        for (Employee teammate : teammates) {
            if (teammate.getId().equals(requester.getId())) {
                continue;
            }

            // Check covered days last 90 days
            List<CoverageAssignment> recentAccepted = coverageRepository.findAcceptedSince(teammate.getId(), ninetyDaysAgo);
            BigDecimal coveredDaysLast90 = recentAccepted.stream()
                .map(CoverageAssignment::getCoveredDays)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Check leave overlap
            List<LeaveRequest> overlappingLeaves = requestRepository.findActiveOverlappingRequests(
                teammate.getId(),
                request.getStartDate(),
                request.getEndDate()
            );

            boolean hasOverlap = !overlappingLeaves.isEmpty();
            boolean joinedAfter = teammate.getJoinedDate().isAfter(request.getStartDate());

            boolean eligible = true;
            String reason = "Available";

            if (joinedAfter) {
                eligible = false;
                reason = "Joined after request start date";
            } else if (hasOverlap) {
                eligible = false;
                reason = "Has scheduled leave during this period";
            }

            suggestions.add(new CandidateSuggestion(
                teammate.getId(),
                teammate.getEmployeeCode(),
                teammate.getFullName(),
                coveredDaysLast90,
                BigDecimal.ZERO, // load proxy
                eligible,
                reason
            ));
        }

        // Rank: eligible first, then fewest covered days in 90 days
        suggestions.sort((a, b) -> {
            if (a.eligible() != b.eligible()) {
                return a.eligible() ? -1 : 1;
            }
            return a.coveredDaysLast90Days().compareTo(b.coveredDaysLast90Days());
        });

        return suggestions;
    }

    @Transactional
    public CoverageAssignment offerCoverage(
        Long requestId,
        Long coveringEmployeeId,
        BigDecimal sharePercent,
        String note,
        Employee actor
    ) {
        // Lock request row first (Lock order: leave_requests -> coverage_assignments)
        LeaveRequest request = requestRepository.findByIdForUpdate(requestId)
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Request not found"));

        LocalDate today = LocalDate.now(clock);
        if (request.getStatus().isTerminal() && request.getStatus() != com.leaveflow.domain.model.LeaveStatus.APPROVED) {
            throw new DomainException(ErrorCode.COVERAGE_NOT_ALLOWED_STATE, "Coverage offers are not allowed for this request status");
        }
        if (request.getEndDate().isBefore(today)) {
            throw new DomainException(ErrorCode.COVERAGE_NOT_ALLOWED_STATE, "Cannot offer coverage for past leave requests");
        }

        Employee coveringEmployee = employeeRepository.findById(coveringEmployeeId)
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Covering employee not found"));

        if (!coveringEmployee.isActive()) {
            throw new DomainException(ErrorCode.COVERAGE_CANDIDATE_UNAVAILABLE, "Candidate is inactive");
        }
        if (coveringEmployee.getId().equals(request.getEmployee().getId())) {
            throw new DomainException(ErrorCode.COVERAGE_CANDIDATE_UNAVAILABLE, "Cannot offer coverage to requester");
        }

        // Check existing active shares
        List<CoverageAssignment> activeAssignments = coverageRepository.findActiveByRequestId(requestId);
        BigDecimal currentShareSum = activeAssignments.stream()
            .map(CoverageAssignment::getSharePercent)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (!CoverageRules.validateShareSum(currentShareSum, sharePercent)) {
            throw new DomainException(ErrorCode.COVERAGE_OVERSHARE, "Total coverage share exceeds 100%");
        }

        BigDecimal coveredDays = CoverageRules.calculateCoveredDays(request.getWorkingDays(), sharePercent);

        // Check monthly cap
        BigDecimal monthlyCap = (properties.coverage() != null && properties.coverage().monthlyCapDays() != null)
            ? properties.coverage().monthlyCapDays()
            : BigDecimal.valueOf(5);

        List<CoverageAssignment> employeeActiveAssignments = coverageRepository.findActiveForEmployee(coveringEmployeeId);
        BigDecimal currentMonthHeldDays = employeeActiveAssignments.stream()
            .map(CoverageAssignment::getCoveredDays)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (!CoverageRules.validateMonthlyCap(currentMonthHeldDays, coveredDays, monthlyCap)) {
            throw new DomainException(ErrorCode.COVERAGE_CAP_EXCEEDED, "Candidate monthly coverage cap would be exceeded");
        }

        // Calculate allowance snapshot
        List<LocalDate> workingDays = getWorkingDaysForRequest(request);
        Map<YearMonth, Integer> monthWorkingDaysMap = buildMonthWorkingDaysMap(workingDays);
        BigDecimal allowancePct = (properties.coverage() != null && properties.coverage().allowancePercentOfDailyRate() != null)
            ? properties.coverage().allowancePercentOfDailyRate()
            : BigDecimal.valueOf(20);

        List<PayCalculator.MonthAllowance> allowances = PayCalculator.calculateCoverageAllowance(
            workingDays,
            sharePercent,
            coveringEmployee.getMonthlySalary(),
            monthWorkingDaysMap,
            allowancePct
        );

        BigDecimal totalAllowance = allowances.stream()
            .map(PayCalculator.MonthAllowance::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        String allowanceJson = "";
        try {
            allowanceJson = objectMapper.writeValueAsString(allowances);
        } catch (Exception ignored) {}

        CoverageAssignment assignment = new CoverageAssignment(
            request,
            coveringEmployee,
            actor,
            sharePercent,
            coveredDays,
            totalAllowance,
            allowanceJson,
            note
        );

        assignment = coverageRepository.save(assignment);

        notificationService.notify(
            coveringEmployee,
            "Coverage Request Offered",
            String.format("You have been offered %s%% coverage for %s's leave (%s to %s)",
                sharePercent, request.getEmployee().getFullName(), request.getStartDate(), request.getEndDate()),
            "COVERAGE_OFFER",
            assignment.getId()
        );

        return assignment;
    }

    @Transactional
    public void acceptCoverage(Long assignmentId, Employee actor) {
        CoverageAssignment assignment = coverageRepository.findByIdForUpdate(assignmentId)
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Assignment not found"));

        if (!assignment.getCoveringEmployee().getId().equals(actor.getId())) {
            throw new DomainException(ErrorCode.FORBIDDEN, "Only the covering employee can accept this offer");
        }
        if (!"OFFERED".equals(assignment.getStatus())) {
            throw new DomainException(ErrorCode.COVERAGE_NOT_ALLOWED_STATE, "Assignment is not in OFFERED state");
        }

        LeaveRequest request = requestRepository.findByIdForUpdate(assignment.getRequest().getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Request not found"));

        // Re-validate overlap
        List<LeaveRequest> overlapping = requestRepository.findActiveOverlappingRequests(
            actor.getId(),
            request.getStartDate(),
            request.getEndDate()
        );
        if (!overlapping.isEmpty()) {
            throw new DomainException(ErrorCode.COVERAGE_COMMITMENT_CONFLICT, "You have active leave during this coverage window");
        }

        assignment.accept(clock.instant());
        recomputeRequestCoverageStatus(request);

        notificationService.notify(
            request.getEmployee(),
            "Coverage Accepted",
            String.format("%s accepted %s%% coverage for your leave", actor.getFullName(), assignment.getSharePercent()),
            "COVERAGE_ACCEPTED",
            request.getId()
        );
    }

    @Transactional
    public void declineCoverage(Long assignmentId, String reason, Employee actor) {
        CoverageAssignment assignment = coverageRepository.findByIdForUpdate(assignmentId)
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Assignment not found"));

        if (!assignment.getCoveringEmployee().getId().equals(actor.getId())) {
            throw new DomainException(ErrorCode.FORBIDDEN, "Only the covering employee can decline this offer");
        }

        assignment.decline(reason, clock.instant());
        LeaveRequest request = requestRepository.findByIdForUpdate(assignment.getRequest().getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Request not found"));

        recomputeRequestCoverageStatus(request);
    }

    @Transactional
    public void withdrawCoverage(Long assignmentId, Employee actor) {
        CoverageAssignment assignment = coverageRepository.findByIdForUpdate(assignmentId)
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Assignment not found"));

        LeaveRequest request = requestRepository.findByIdForUpdate(assignment.getRequest().getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Request not found"));

        assignment.withdraw(clock.instant());
        recomputeRequestCoverageStatus(request);

        notificationService.notify(
            assignment.getCoveringEmployee(),
            "Coverage Withdrawn",
            String.format("Coverage offer for %s's leave was withdrawn", request.getEmployee().getFullName()),
            "COVERAGE_WITHDRAWN",
            request.getId()
        );
    }

    @Transactional
    public void withdrawAllFor(LeaveRequest request) {
        List<CoverageAssignment> active = coverageRepository.findActiveByRequestId(request.getId());
        Instant now = clock.instant();
        for (CoverageAssignment assignment : active) {
            assignment.withdraw(now);
            notificationService.notify(
                assignment.getCoveringEmployee(),
                "Coverage Withdrawn",
                String.format("Coverage for %s's leave was cancelled", request.getEmployee().getFullName()),
                "COVERAGE_WITHDRAWN",
                request.getId()
            );
        }
        request.setCoverageStatus("NONE");
    }

    @Transactional
    public void expireDue(LocalDate today) {
        List<CoverageAssignment> due = coverageRepository.findDueForExpiry(today);
        Instant now = clock.instant();
        for (CoverageAssignment assignment : due) {
            assignment.expire(now);
        }
    }

    @Transactional
    public void autoDeclineOverlappingOffers(Long employeeId, LocalDate startDate, LocalDate endDate) {
        List<CoverageAssignment> offered = coverageRepository.findOfferedOverlapping(employeeId, startDate, endDate);
        Instant now = clock.instant();
        for (CoverageAssignment assignment : offered) {
            assignment.decline("Auto-declined due to overlapping leave submission", now);
        }
    }

    private void recomputeRequestCoverageStatus(LeaveRequest request) {
        List<CoverageAssignment> active = coverageRepository.findActiveByRequestId(request.getId());
        BigDecimal acceptedSum = active.stream()
            .filter(a -> "ACCEPTED".equals(a.getStatus()))
            .map(CoverageAssignment::getSharePercent)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (acceptedSum.compareTo(BigDecimal.valueOf(100)) >= 0) {
            request.setCoverageStatus("FULL");
        } else if (acceptedSum.compareTo(BigDecimal.ZERO) > 0) {
            request.setCoverageStatus("PARTIAL");
        } else {
            request.setCoverageStatus("NONE");
        }
    }

    private List<LocalDate> getWorkingDaysForRequest(LeaveRequest request) {
        List<Holiday> holidays = holidayRepository.findBetweenDates(request.getStartDate(), request.getEndDate());
        Map<LocalDate, String> holidayMap = new HashMap<>();
        holidays.forEach(h -> holidayMap.put(h.getDate(), h.getName()));

        WorkingDayCalculator.CalculationResult result = WorkingDayCalculator.calculate(
            request.getStartDate(),
            request.getEndDate(),
            null,
            holidayMap
        );
        return result.workingDayList();
    }

    private Map<YearMonth, Integer> buildMonthWorkingDaysMap(List<LocalDate> days) {
        Map<YearMonth, Integer> map = new HashMap<>();
        for (LocalDate day : days) {
            YearMonth ym = YearMonth.from(day);
            map.putIfAbsent(ym, 22); // standard default
        }
        return map;
    }
}
