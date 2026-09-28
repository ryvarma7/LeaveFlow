package com.leaveflow.domain;

import com.leaveflow.domain.model.LeaveEvent;
import com.leaveflow.domain.model.LeaveStatus;
import com.leaveflow.domain.statemachine.IllegalTransitionException;
import com.leaveflow.domain.statemachine.LeaveStateMachine;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LeaveStateMachineTest {

    @Test
    @DisplayName("Verify all valid transitions from NEW")
    void testNewTransitions() {
        assertThat(LeaveStateMachine.next(null, LeaveEvent.SUBMIT)).isEqualTo(LeaveStatus.PENDING_MANAGER);
        assertThat(LeaveStateMachine.next(null, LeaveEvent.SUBMIT_TO_HR)).isEqualTo(LeaveStatus.PENDING_HR);

        assertThatThrownBy(() -> LeaveStateMachine.next(null, LeaveEvent.MANAGER_APPROVE))
            .isInstanceOf(IllegalTransitionException.class);
    }

    @Test
    @DisplayName("Verify all valid transitions from PENDING_MANAGER")
    void testPendingManagerTransitions() {
        assertThat(LeaveStateMachine.next(LeaveStatus.PENDING_MANAGER, LeaveEvent.MANAGER_APPROVE)).isEqualTo(LeaveStatus.PENDING_HR);
        assertThat(LeaveStateMachine.next(LeaveStatus.PENDING_MANAGER, LeaveEvent.MANAGER_REJECT)).isEqualTo(LeaveStatus.REJECTED);
        assertThat(LeaveStateMachine.next(LeaveStatus.PENDING_MANAGER, LeaveEvent.CANCEL)).isEqualTo(LeaveStatus.CANCELLED);
        assertThat(LeaveStateMachine.next(LeaveStatus.PENDING_MANAGER, LeaveEvent.ESCALATE)).isEqualTo(LeaveStatus.PENDING_MANAGER);

        assertThatThrownBy(() -> LeaveStateMachine.next(LeaveStatus.PENDING_MANAGER, LeaveEvent.HR_APPROVE))
            .isInstanceOf(IllegalTransitionException.class);
    }

    @Test
    @DisplayName("Verify all valid transitions from PENDING_HR")
    void testPendingHrTransitions() {
        assertThat(LeaveStateMachine.next(LeaveStatus.PENDING_HR, LeaveEvent.HR_APPROVE)).isEqualTo(LeaveStatus.APPROVED);
        assertThat(LeaveStateMachine.next(LeaveStatus.PENDING_HR, LeaveEvent.HR_REJECT)).isEqualTo(LeaveStatus.REJECTED);
        assertThat(LeaveStateMachine.next(LeaveStatus.PENDING_HR, LeaveEvent.CANCEL)).isEqualTo(LeaveStatus.CANCELLED);
        assertThat(LeaveStateMachine.next(LeaveStatus.PENDING_HR, LeaveEvent.ESCALATE)).isEqualTo(LeaveStatus.PENDING_HR);

        assertThatThrownBy(() -> LeaveStateMachine.next(LeaveStatus.PENDING_HR, LeaveEvent.MANAGER_APPROVE))
            .isInstanceOf(IllegalTransitionException.class);
    }

    @Test
    @DisplayName("Verify all valid transitions from APPROVED")
    void testApprovedTransitions() {
        assertThat(LeaveStateMachine.next(LeaveStatus.APPROVED, LeaveEvent.CANCEL)).isEqualTo(LeaveStatus.CANCELLED);

        assertThatThrownBy(() -> LeaveStateMachine.next(LeaveStatus.APPROVED, LeaveEvent.HR_APPROVE))
            .isInstanceOf(IllegalTransitionException.class);
        assertThatThrownBy(() -> LeaveStateMachine.next(LeaveStatus.APPROVED, LeaveEvent.MANAGER_APPROVE))
            .isInstanceOf(IllegalTransitionException.class);
    }

    @Test
    @DisplayName("Verify terminal states REJECTED and CANCELLED have no valid transitions")
    void testTerminalStates() {
        for (LeaveEvent event : LeaveEvent.values()) {
            assertThatThrownBy(() -> LeaveStateMachine.next(LeaveStatus.REJECTED, event))
                .isInstanceOf(IllegalTransitionException.class);
            assertThatThrownBy(() -> LeaveStateMachine.next(LeaveStatus.CANCELLED, event))
                .isInstanceOf(IllegalTransitionException.class);
        }
    }
}
