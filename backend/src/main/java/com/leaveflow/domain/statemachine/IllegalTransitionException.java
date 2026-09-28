package com.leaveflow.domain.statemachine;

import com.leaveflow.domain.model.LeaveEvent;
import com.leaveflow.domain.model.LeaveStatus;

public class IllegalTransitionException extends RuntimeException {
    private final LeaveStatus fromStatus;
    private final LeaveEvent event;

    public IllegalTransitionException(LeaveStatus fromStatus, LeaveEvent event) {
        super(String.format("Transition not allowed from state [%s] on event [%s]", fromStatus, event));
        this.fromStatus = fromStatus;
        this.event = event;
    }

    public LeaveStatus getFromStatus() {
        return fromStatus;
    }

    public LeaveEvent getEvent() {
        return event;
    }
}
