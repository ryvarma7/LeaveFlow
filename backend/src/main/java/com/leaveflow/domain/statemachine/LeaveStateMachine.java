package com.leaveflow.domain.statemachine;

import com.leaveflow.domain.model.LeaveEvent;
import com.leaveflow.domain.model.LeaveStatus;

import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;

public final class LeaveStateMachine {

    private static final Map<LeaveStatus, Map<LeaveEvent, LeaveStatus>> TRANSITIONS;
    private static final Map<LeaveEvent, LeaveStatus> NEW_TRANSITIONS;

    static {
        Map<LeaveStatus, Map<LeaveEvent, LeaveStatus>> map = new EnumMap<>(LeaveStatus.class);

        // PENDING_MANAGER
        Map<LeaveEvent, LeaveStatus> pm = new EnumMap<>(LeaveEvent.class);
        pm.put(LeaveEvent.MANAGER_APPROVE, LeaveStatus.PENDING_HR);
        pm.put(LeaveEvent.MANAGER_REJECT, LeaveStatus.REJECTED);
        pm.put(LeaveEvent.CANCEL, LeaveStatus.CANCELLED);
        pm.put(LeaveEvent.ESCALATE, LeaveStatus.PENDING_MANAGER);
        map.put(LeaveStatus.PENDING_MANAGER, Collections.unmodifiableMap(pm));

        // PENDING_HR
        Map<LeaveEvent, LeaveStatus> phr = new EnumMap<>(LeaveEvent.class);
        phr.put(LeaveEvent.HR_APPROVE, LeaveStatus.APPROVED);
        phr.put(LeaveEvent.HR_REJECT, LeaveStatus.REJECTED);
        phr.put(LeaveEvent.CANCEL, LeaveStatus.CANCELLED);
        phr.put(LeaveEvent.ESCALATE, LeaveStatus.PENDING_HR);
        map.put(LeaveStatus.PENDING_HR, Collections.unmodifiableMap(phr));

        // APPROVED
        Map<LeaveEvent, LeaveStatus> app = new EnumMap<>(LeaveEvent.class);
        app.put(LeaveEvent.CANCEL, LeaveStatus.CANCELLED);
        map.put(LeaveStatus.APPROVED, Collections.unmodifiableMap(app));

        // REJECTED (terminal)
        map.put(LeaveStatus.REJECTED, Collections.emptyMap());

        // CANCELLED (terminal)
        map.put(LeaveStatus.CANCELLED, Collections.emptyMap());

        TRANSITIONS = Collections.unmodifiableMap(map);

        Map<LeaveEvent, LeaveStatus> fromNew = new EnumMap<>(LeaveEvent.class);
        fromNew.put(LeaveEvent.SUBMIT, LeaveStatus.PENDING_MANAGER);
        fromNew.put(LeaveEvent.SUBMIT_TO_HR, LeaveStatus.PENDING_HR);
        NEW_TRANSITIONS = Collections.unmodifiableMap(fromNew);
    }

    private LeaveStateMachine() {}

    public static LeaveStatus next(LeaveStatus current, LeaveEvent event) {
        if (current == null) {
            LeaveStatus target = NEW_TRANSITIONS.get(event);
            if (target == null) {
                throw new IllegalTransitionException(null, event);
            }
            return target;
        }

        Map<LeaveEvent, LeaveStatus> stateTransitions = TRANSITIONS.get(current);
        if (stateTransitions == null || !stateTransitions.containsKey(event)) {
            throw new IllegalTransitionException(current, event);
        }
        return stateTransitions.get(event);
    }

    public static boolean isAllowed(LeaveStatus current, LeaveEvent event) {
        if (current == null) {
            return NEW_TRANSITIONS.containsKey(event);
        }
        Map<LeaveEvent, LeaveStatus> stateTransitions = TRANSITIONS.get(current);
        return stateTransitions != null && stateTransitions.containsKey(event);
    }

    public static Set<LeaveEvent> getAllowedEvents(LeaveStatus current) {
        if (current == null) {
            return NEW_TRANSITIONS.keySet();
        }
        Map<LeaveEvent, LeaveStatus> stateTransitions = TRANSITIONS.get(current);
        return stateTransitions != null ? stateTransitions.keySet() : Collections.emptySet();
    }

    public static Map<LeaveStatus, Map<LeaveEvent, LeaveStatus>> getAllTransitions() {
        return TRANSITIONS;
    }
}
