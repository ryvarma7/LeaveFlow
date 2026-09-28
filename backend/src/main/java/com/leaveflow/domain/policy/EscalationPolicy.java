package com.leaveflow.domain.policy;

import com.leaveflow.domain.model.LeaveStatus;

import java.util.Optional;

public final class EscalationPolicy {

    public record EscalationStep(
        int nextLevel,
        String targetRole,
        Long targetEmployeeId,
        boolean isHrTarget
    ) {}

    private EscalationPolicy() {}

    public static Optional<EscalationStep> next(
        LeaveStatus currentStatus,
        int currentLevel,
        Long managerId,
        Long skipLevelManagerId
    ) {
        if (currentStatus == LeaveStatus.PENDING_MANAGER) {
            if (currentLevel == 0) {
                if (skipLevelManagerId != null) {
                    return Optional.of(new EscalationStep(1, "MANAGER", skipLevelManagerId, false));
                } else {
                    return Optional.of(new EscalationStep(1, "HR", null, true));
                }
            } else if (currentLevel == 1) {
                return Optional.of(new EscalationStep(2, "HR", null, true));
            } else {
                return Optional.empty();
            }
        } else if (currentStatus == LeaveStatus.PENDING_HR) {
            if (currentLevel == 0) {
                return Optional.of(new EscalationStep(1, "HR", null, true));
            } else {
                return Optional.empty();
            }
        }
        return Optional.empty();
    }
}
