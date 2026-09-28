package com.leaveflow.web.controller;

import com.leaveflow.common.DomainException;
import com.leaveflow.common.ErrorCode;
import com.leaveflow.config.LeaveProperties;
import com.leaveflow.service.EscalationScheduler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/internal")
@Tag(name = "Internal APIs", description = "Endpoints called by external cron or heartbeat pingers")
public class InternalController {

    private final EscalationScheduler escalationScheduler;
    private final LeaveProperties properties;

    public InternalController(EscalationScheduler escalationScheduler, LeaveProperties properties) {
        this.escalationScheduler = escalationScheduler;
        this.properties = properties;
    }

    @PostMapping("/escalation/run")
    @Operation(summary = "Run escalation sweep with secret header")
    public Map<String, String> runEscalation(@RequestHeader(value = "X-Cron-Secret", required = false) String cronSecret) {
        String configuredSecret = (properties.internal() != null && properties.internal().cronSecret() != null)
            ? properties.internal().cronSecret()
            : "demo-cron-secret-12345";

        if (cronSecret == null || !MessageDigest.isEqual(cronSecret.getBytes(), configuredSecret.getBytes())) {
            throw new DomainException(ErrorCode.FORBIDDEN, "Invalid cron secret");
        }

        escalationScheduler.runOnce();
        return Map.of("status", "SUCCESS", "message", "Internal escalation sweep completed");
    }
}
