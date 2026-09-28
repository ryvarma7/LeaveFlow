package com.leaveflow.web.controller;

import com.leaveflow.common.DomainException;
import com.leaveflow.common.ErrorCode;
import com.leaveflow.config.DemoDataSeeder;
import com.leaveflow.entity.LeaveRequest;
import com.leaveflow.repository.LeaveRequestRepository;
import com.leaveflow.service.EscalationScheduler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/demo")
@Profile({"demo", "default", "dev"})
@Tag(name = "Demo Tools", description = "Demo tools for live testing and time manipulation")
public class DemoController {

    private final EscalationScheduler escalationScheduler;
    private final LeaveRequestRepository requestRepository;
    private final Clock clock;

    public DemoController(
        EscalationScheduler escalationScheduler,
        LeaveRequestRepository requestRepository,
        Clock clock
    ) {
        this.escalationScheduler = escalationScheduler;
        this.requestRepository = requestRepository;
        this.clock = clock;
    }

    @PostMapping("/scheduler/run-now")
    @Operation(summary = "Trigger escalation scheduler sweep immediately")
    public Map<String, String> runSchedulerNow() {
        escalationScheduler.runOnce();
        return Map.of("status", "SUCCESS", "message", "Escalation sweep executed");
    }

    @PostMapping("/leave-requests/{id}/expire-stage")
    @Transactional
    @Operation(summary = "Force expire the stage deadline of a leave request for instant escalation")
    public Map<String, Object> expireStage(@PathVariable Long id) {
        LeaveRequest request = requestRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new DomainException(ErrorCode.NOT_FOUND, "Request not found"));

        Instant past = clock.instant().minusSeconds(10);
        request.moveTo(request.getStatus(), request.getStageEnteredAt(), past);
        requestRepository.save(request);

        // Run sweep immediately
        escalationScheduler.runOnce();

        return Map.of("status", "SUCCESS", "message", "Stage expired and escalation evaluated");
    }
}
