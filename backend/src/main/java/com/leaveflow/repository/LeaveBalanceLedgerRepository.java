package com.leaveflow.repository;

import com.leaveflow.entity.LeaveBalanceLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LeaveBalanceLedgerRepository extends JpaRepository<LeaveBalanceLedger, Long> {
    List<LeaveBalanceLedger> findByBalanceIdOrderByCreatedAtAsc(Long balanceId);

    @Query("SELECT l FROM LeaveBalanceLedger l WHERE l.balance.employee.id = :employeeId ORDER BY l.createdAt DESC")
    List<LeaveBalanceLedger> findByEmployeeId(@Param("employeeId") Long employeeId);
}
