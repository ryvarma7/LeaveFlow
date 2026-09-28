package com.leaveflow.domain.model;

public enum LeaveStatus {
    PENDING_MANAGER,
    PENDING_HR,
    APPROVED,
    REJECTED,
    CANCELLED;

    public boolean isTerminal() {
        return this == APPROVED || this == REJECTED || this == CANCELLED;
    }

    public boolean isPending() {
        return this == PENDING_MANAGER || this == PENDING_HR;
    }
}
