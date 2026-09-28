package com.leaveflow.service;

import com.leaveflow.repository.LeaveRequestRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class DueRequestFinder {

    private final LeaveRequestRepository requestRepository;

    public DueRequestFinder(LeaveRequestRepository requestRepository) {
        this.requestRepository = requestRepository;
    }

    @Transactional(readOnly = true)
    public List<Long> findDueIds(Instant now) {
        return requestRepository.findDueRequestIds(now);
    }
}
