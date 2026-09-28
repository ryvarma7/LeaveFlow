package com.leaveflow.web.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leaveflow.common.DomainException;
import com.leaveflow.common.EmployeePrincipal;
import com.leaveflow.common.ErrorCode;
import com.leaveflow.config.LeaveProperties;
import com.leaveflow.entity.CoverageAssignment;
import com.leaveflow.entity.Employee;
import com.leaveflow.entity.LeaveRequest;
import com.leaveflow.repository.CoverageAssignmentRepository;
import com.leaveflow.repository.EmployeeRepository;
import com.leaveflow.repository.LeaveRequestRepository;
import com.leaveflow.service.CoverageService;
import com.leaveflow.web.dto.CoverageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Work Coverage", description = "Endpoints for coverage offers, acceptances, and fairness suggestions")
public class CoverageController {

    private final CoverageService coverageService;
    private final CoverageAssignmentRepository coverageRepository;
    private final LeaveRequestRepository requestRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveProperties properties;
    private final ObjectMapper objectMapper;

    public CoverageController(
        CoverageService coverageService,
        CoverageAssignmentRepository coverageRepository,
        LeaveRequestRepository requestRepository,
        EmployeeRepository employeeRepository,
        LeaveProperties properties,
        ObjectMapper objectMapper
    ) {
        this.coverageService = coverageService;
        this.coverageRepository = coverageRepository;
        this.requestRepository = requestRepository;
        this.employeeRepository = employeeRepository;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/leave-requests/{id}/coverage")
    @Operation(summary = "Get coverage assignments for a leave request")
    public List<CoverageDto.CoverageAssignmentResponse> getCoverageForRequest(@PathVariable Long id) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        List<CoverageAssignment> assignments = coverageRepository.findByRequestIdOrderByCreatedAtAsc(id);

        return assignments.stream().map(c -> toResponse(c, principal.getId(), principal.getRole())).collect(Collectors.toList());
    }

    @GetMapping("/leave-requests/{id}/coverage/suggestions")
    @Operation(summary = "Get ranked coverage suggestions for a leave request")
    public List<CoverageDto.CoverageSuggestionResponse> getSuggestions(@PathVariable Long id) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        List<CoverageService.CandidateSuggestion> suggestions = coverageService.getSuggestions(id, employee);
        return suggestions.stream().map(s -> new CoverageDto.CoverageSuggestionResponse(
            s.employeeId(),
            s.employeeCode(),
            s.fullName(),
            s.coveredDaysLast90Days(),
            s.leaveDaysThisYear(),
            s.eligible(),
            s.eligibilityReason()
        )).collect(Collectors.toList());
    }

    @PostMapping("/leave-requests/{id}/coverage/offers")
    @Operation(summary = "Offer coverage share to a teammate")
    public CoverageDto.CoverageAssignmentResponse offerCoverage(
        @PathVariable Long id,
        @RequestBody CoverageDto.CoverageOfferRequest offerReq
    ) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        CoverageAssignment assignment = coverageService.offerCoverage(
            id,
            offerReq.coveringEmployeeId(),
            offerReq.sharePercent(),
            offerReq.note(),
            employee
        );

        return toResponse(assignment, principal.getId(), principal.getRole());
    }

    @PostMapping("/coverage/{id}/accept")
    @Operation(summary = "Accept an offered coverage assignment")
    public void acceptCoverage(@PathVariable Long id) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        coverageService.acceptCoverage(id, employee);
    }

    @PostMapping("/coverage/{id}/decline")
    @Operation(summary = "Decline an offered coverage assignment")
    public void declineCoverage(
        @PathVariable Long id,
        @RequestBody(required = false) CoverageDto.CoverageDeclineRequest declineReq
    ) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        String reason = (declineReq != null) ? declineReq.reason() : null;
        coverageService.declineCoverage(id, reason, employee);
    }

    @PostMapping("/coverage/{id}/withdraw")
    @Operation(summary = "Withdraw an offered or accepted coverage assignment")
    public void withdrawCoverage(@PathVariable Long id) {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        Employee employee = employeeRepository.findById(principal.getId())
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Employee not found"));

        coverageService.withdrawCoverage(id, employee);
    }

    @GetMapping("/me/coverage")
    @Operation(summary = "Get current employee coverage inbox and load stats")
    public CoverageDto.CoverageInboxResponse getMyCoverageInbox() {
        EmployeePrincipal principal = EmployeePrincipal.getCurrentUser();
        List<CoverageAssignment> allAssignments = coverageRepository.findByCoveringEmployeeIdOrderByCreatedAtDesc(principal.getId());

        List<CoverageDto.CoverageAssignmentResponse> incomingOffers = new ArrayList<>();
        List<CoverageDto.CoverageAssignmentResponse> activeCommitments = new ArrayList<>();
        BigDecimal monthlyLoadDays = BigDecimal.ZERO;

        for (CoverageAssignment c : allAssignments) {
            CoverageDto.CoverageAssignmentResponse resp = toResponse(c, principal.getId(), principal.getRole());
            if ("OFFERED".equals(c.getStatus())) {
                incomingOffers.add(resp);
            } else if ("ACCEPTED".equals(c.getStatus())) {
                activeCommitments.add(resp);
                monthlyLoadDays = monthlyLoadDays.add(c.getCoveredDays());
            }
        }

        BigDecimal monthlyCap = (properties.coverage() != null && properties.coverage().monthlyCapDays() != null)
            ? properties.coverage().monthlyCapDays()
            : BigDecimal.valueOf(5);

        return new CoverageDto.CoverageInboxResponse(
            incomingOffers,
            activeCommitments,
            monthlyLoadDays,
            monthlyCap
        );
    }

    private CoverageDto.CoverageAssignmentResponse toResponse(CoverageAssignment c, Long currentUserId, String currentRole) {
        boolean canSeeAmount = c.getCoveringEmployee().getId().equals(currentUserId) || "HR".equalsIgnoreCase(currentRole);

        List<CoverageDto.AllowanceEntry> breakdown = new ArrayList<>();
        if (canSeeAmount && c.getAllowanceBreakdown() != null && !c.getAllowanceBreakdown().isBlank()) {
            try {
                breakdown = objectMapper.readValue(c.getAllowanceBreakdown(), new TypeReference<List<CoverageDto.AllowanceEntry>>() {});
            } catch (Exception ignored) {}
        }

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
            breakdown,
            c.getRespondedAt(),
            c.getCreatedAt()
        );
    }
}
