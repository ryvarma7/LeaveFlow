package com.leaveflow.domain;

import com.leaveflow.domain.model.LeaveStatus;
import com.leaveflow.domain.policy.EscalationPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class EscalationPolicyTest {

    @Test
    @DisplayName("Escalation at manager stage with skip-level manager")
    void testManagerStageWithSkipLevel() {
        // Level 0 -> Level 1 (skip-level)
        Optional<EscalationPolicy.EscalationStep> step1 = EscalationPolicy.next(LeaveStatus.PENDING_MANAGER, 0, 10L, 20L);
        assertThat(step1).isPresent();
        assertThat(step1.get().nextLevel()).isEqualTo(1);
        assertThat(step1.get().targetEmployeeId()).isEqualTo(20L);
        assertThat(step1.get().isHrTarget()).isFalse();

        // Level 1 -> Level 2 (HR)
        Optional<EscalationPolicy.EscalationStep> step2 = EscalationPolicy.next(LeaveStatus.PENDING_MANAGER, 1, 10L, 20L);
        assertThat(step2).isPresent();
        assertThat(step2.get().nextLevel()).isEqualTo(2);
        assertThat(step2.get().isHrTarget()).isTrue();

        // Level 2 -> none
        Optional<EscalationPolicy.EscalationStep> step3 = EscalationPolicy.next(LeaveStatus.PENDING_MANAGER, 2, 10L, 20L);
        assertThat(step3).isEmpty();
    }

    @Test
    @DisplayName("Escalation at manager stage without skip-level manager")
    void testManagerStageWithoutSkipLevel() {
        // Level 0 -> Level 1 (HR directly)
        Optional<EscalationPolicy.EscalationStep> step1 = EscalationPolicy.next(LeaveStatus.PENDING_MANAGER, 0, 10L, null);
        assertThat(step1).isPresent();
        assertThat(step1.get().nextLevel()).isEqualTo(1);
        assertThat(step1.get().isHrTarget()).isTrue();
    }
}
