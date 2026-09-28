package com.leaveflow.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Component
public class EscalationScheduler {

    private static final Logger log = LoggerFactory.getLogger(EscalationScheduler.class);

    private final DueRequestFinder dueRequestFinder;
    private final LeaveWorkflowService workflowService;
    private final CoverageService coverageService;
    private final Clock clock;

    public EscalationScheduler(
        DueRequestFinder dueRequestFinder,
        LeaveWorkflowService workflowService,
        CoverageService coverageService,
        Clock clock
    ) {
        this.dueRequestFinder = dueRequestFinder;
        this.workflowService = workflowService;
        this.coverageService = coverageService;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${leave.escalation.poll-interval-seconds:60}000")
    public void runEscalationSweep() {
        runOnce();
    }

    public void runOnce() {
        Instant now = clock.instant();
        LocalDate today = LocalDate.now(clock);

        try {
            // Expire due coverage assignments
            coverageService.expireDue(today);
        } catch (Exception ex) {
            log.error("Error expiring due coverage assignments", ex);
        }

        List<Long> dueIds = dueRequestFinder.findDueIds(now);
        for (Long id : dueIds) {
            try {
                workflowService.systemEscalate(id, now);
            } catch (Exception ex) {
                log.error("Failed to escalate request id: {}", id, ex);
            }
        }
    }
}
