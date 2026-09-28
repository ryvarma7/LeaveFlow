package com.leaveflow.repository;

import com.leaveflow.entity.LeaveRequestEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveRequestEventRepository extends JpaRepository<LeaveRequestEvent, Long> {
    List<LeaveRequestEvent> findByRequestIdOrderBySeqAsc(Long requestId);
    int countByRequestId(Long requestId);
}
