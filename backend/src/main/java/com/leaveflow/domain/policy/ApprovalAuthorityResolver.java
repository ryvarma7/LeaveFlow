package com.leaveflow.domain.policy;

import com.leaveflow.domain.model.LeaveStatus;

public final class ApprovalAuthorityResolver {

    private ApprovalAuthorityResolver() {}

    public static boolean canActAtManagerStage(
        Long actorId,
        String actorRole,
        boolean actorActive,
        Long requesterId,
        Long directManagerId,
        Long skipLevelManagerId,
        int escalationLevel
    ) {
        if (!actorActive || actorId == null || requesterId == null) return false;
        if (actorId.equals(requesterId)) return false; // Self-approval strictly forbidden

        // Direct manager can always act at manager stage
        if (actorId.equals(directManagerId)) return true;

        // If escalated to level 1 and actor is skip-level
        if (escalationLevel >= 1 && actorId.equals(skipLevelManagerId)) return true;

        // If escalated to HR (level 1 without skip-level, or level 2)
        if ("HR".equalsIgnoreCase(actorRole)) {
            if (escalationLevel >= 2 || (escalationLevel >= 1 && skipLevelManagerId == null)) {
                return true;
            }
        }

        return false;
    }

    public static boolean canActAtHrStage(
        Long actorId,
        String actorRole,
        boolean actorActive,
        Long requesterId
    ) {
        if (!actorActive || actorId == null || requesterId == null) return false;
        if (actorId.equals(requesterId)) return false; // Self-approval strictly forbidden
        return "HR".equalsIgnoreCase(actorRole);
    }

    public static boolean canCancel(
        Long actorId,
        String actorRole,
        Long requesterId
    ) {
        if (actorId == null || requesterId == null) return false;
        return actorId.equals(requesterId) || "HR".equalsIgnoreCase(actorRole);
    }
}
