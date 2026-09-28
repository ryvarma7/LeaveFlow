package com.leaveflow.repository;

import com.leaveflow.entity.LeaveBalance;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, Long> {

    List<LeaveBalance> findByEmployeeIdAndYear(Long employeeId, int year);

    Optional<LeaveBalance> findByEmployeeIdAndLeaveTypeIdAndYear(Long employeeId, Long leaveTypeId, int year);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT b FROM LeaveBalance b WHERE b.employee.id = :employeeId AND b.leaveType.id = :leaveTypeId AND b.year = :year")
    Optional<LeaveBalance> findByEmployeeIdAndLeaveTypeIdAndYearForUpdate(
        @Param("employeeId") Long employeeId,
        @Param("leaveTypeId") Long leaveTypeId,
        @Param("year") int year
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT b FROM LeaveBalance b WHERE b.id = :id")
    Optional<LeaveBalance> findByIdForUpdate(@Param("id") Long id);

    @Modifying
    @Query("UPDATE LeaveBalance b SET b.pending = b.pending + :days, b.updatedAt = CURRENT_TIMESTAMP, b.version = b.version + 1 " +
           "WHERE b.id = :id AND (b.entitled + b.carried + b.adjustment - b.used - b.pending) >= :days")
    int reserveDays(@Param("id") Long id, @Param("days") BigDecimal days);

    @Modifying
    @Query("UPDATE LeaveBalance b SET b.pending = b.pending - :days, b.used = b.used + :days, b.updatedAt = CURRENT_TIMESTAMP, b.version = b.version + 1 " +
           "WHERE b.id = :id AND b.pending >= :days")
    int consumeDays(@Param("id") Long id, @Param("days") BigDecimal days);

    @Modifying
    @Query("UPDATE LeaveBalance b SET b.pending = b.pending - :days, b.updatedAt = CURRENT_TIMESTAMP, b.version = b.version + 1 " +
           "WHERE b.id = :id AND b.pending >= :days")
    int releaseDays(@Param("id") Long id, @Param("days") BigDecimal days);

    @Modifying
    @Query("UPDATE LeaveBalance b SET b.used = b.used - :days, b.updatedAt = CURRENT_TIMESTAMP, b.version = b.version + 1 " +
           "WHERE b.id = :id AND b.used >= :days")
    int restoreDays(@Param("id") Long id, @Param("days") BigDecimal days);
}
