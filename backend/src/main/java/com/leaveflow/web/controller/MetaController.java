package com.leaveflow.web.controller;

import com.leaveflow.domain.model.LeaveEvent;
import com.leaveflow.domain.model.LeaveStatus;
import com.leaveflow.domain.statemachine.LeaveStateMachine;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/meta")
@Tag(name = "Metadata", description = "System metadata and workflow transition maps")
public class MetaController {

    public record TransitionEntry(
        String fromStatus,
        String event,
        String toStatus
    ) {}

    public record WorkflowMetaResponse(
        List<String> states,
        List<String> events,
        List<TransitionEntry> allowedTransitions
    ) {}

    @GetMapping("/workflow")
    @Operation(summary = "Get the state machine definition and allowed transitions table")
    public WorkflowMetaResponse getWorkflowMeta() {
        List<String> states = List.of(
            LeaveStatus.PENDING_MANAGER.name(),
            LeaveStatus.PENDING_HR.name(),
            LeaveStatus.APPROVED.name(),
            LeaveStatus.REJECTED.name(),
            LeaveStatus.CANCELLED.name()
        );

        List<String> events = List.of(
            LeaveEvent.SUBMIT.name(),
            LeaveEvent.SUBMIT_TO_HR.name(),
            LeaveEvent.MANAGER_APPROVE.name(),
            LeaveEvent.MANAGER_REJECT.name(),
            LeaveEvent.HR_APPROVE.name(),
            LeaveEvent.HR_REJECT.name(),
            LeaveEvent.CANCEL.name(),
            LeaveEvent.ESCALATE.name()
        );

        List<TransitionEntry> transitions = List.of(
            new TransitionEntry(null, LeaveEvent.SUBMIT.name(), LeaveStatus.PENDING_MANAGER.name()),
            new TransitionEntry(null, LeaveEvent.SUBMIT_TO_HR.name(), LeaveStatus.PENDING_HR.name()),
            new TransitionEntry(LeaveStatus.PENDING_MANAGER.name(), LeaveEvent.MANAGER_APPROVE.name(), LeaveStatus.PENDING_HR.name()),
            new TransitionEntry(LeaveStatus.PENDING_MANAGER.name(), LeaveEvent.MANAGER_REJECT.name(), LeaveStatus.REJECTED.name()),
            new TransitionEntry(LeaveStatus.PENDING_MANAGER.name(), LeaveEvent.CANCEL.name(), LeaveStatus.CANCELLED.name()),
            new TransitionEntry(LeaveStatus.PENDING_MANAGER.name(), LeaveEvent.ESCALATE.name(), LeaveStatus.PENDING_MANAGER.name()),
            new TransitionEntry(LeaveStatus.PENDING_HR.name(), LeaveEvent.HR_APPROVE.name(), LeaveStatus.APPROVED.name()),
            new TransitionEntry(LeaveStatus.PENDING_HR.name(), LeaveEvent.HR_REJECT.name(), LeaveStatus.REJECTED.name()),
            new TransitionEntry(LeaveStatus.PENDING_HR.name(), LeaveEvent.CANCEL.name(), LeaveStatus.CANCELLED.name()),
            new TransitionEntry(LeaveStatus.PENDING_HR.name(), LeaveEvent.ESCALATE.name(), LeaveStatus.PENDING_HR.name()),
            new TransitionEntry(LeaveStatus.APPROVED.name(), LeaveEvent.CANCEL.name(), LeaveStatus.CANCELLED.name())
        );

        return new WorkflowMetaResponse(states, events, transitions);
    }
}
