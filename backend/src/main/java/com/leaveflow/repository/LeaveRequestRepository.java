package com.leaveflow.repository;

import com.leaveflow.domain.model.LeaveStatus;
import com.leaveflow.entity.LeaveRequest;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT r FROM LeaveRequest r WHERE r.id = :id")
    Optional<LeaveRequest> findByIdForUpdate(@Param("id") Long id);

    Optional<LeaveRequest> findByRequestNumber(String requestNumber);

    List<LeaveRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    Page<LeaveRequest> findByEmployeeId(Long employeeId, Pageable pageable);

    @Query("SELECT r FROM LeaveRequest r WHERE r.employee.manager.id = :managerId AND r.status = 'PENDING_MANAGER' ORDER BY r.createdAt ASC")
    List<LeaveRequest> findPendingForManager(@Param("managerId") Long managerId);

    @Query("SELECT r FROM LeaveRequest r WHERE (r.employee.manager.id = :managerId OR r.employee.manager.manager.id = :managerId) AND r.status = 'PENDING_MANAGER' AND r.escalationLevel > 0 ORDER BY r.escalatedAt ASC")
    List<LeaveRequest> findEscalatedForManager(@Param("managerId") Long managerId);

    @Query("SELECT r FROM LeaveRequest r WHERE r.employee.manager.id = :managerId AND r.status IN ('APPROVED', 'REJECTED', 'CANCELLED') ORDER BY r.updatedAt DESC")
    List<LeaveRequest> findHistoryForManager(@Param("managerId") Long managerId);

    @Query("SELECT r FROM LeaveRequest r WHERE r.status = 'PENDING_HR' AND r.escalationLevel = 0 ORDER BY r.createdAt ASC")
    List<LeaveRequest> findPendingForHr();

    @Query("SELECT r FROM LeaveRequest r WHERE r.status = 'PENDING_HR' AND r.escalationLevel > 0 ORDER BY r.escalatedAt ASC")
    List<LeaveRequest> findEscalatedForHr();

    @Query("SELECT r FROM LeaveRequest r WHERE r.status = 'PENDING_MANAGER' AND r.escalationLevel >= 1 ORDER BY r.escalatedAt ASC")
    List<LeaveRequest> findManagerStageEscalatedForHr();

    @Query("SELECT r FROM LeaveRequest r WHERE r.status IN ('APPROVED', 'REJECTED', 'CANCELLED') ORDER BY r.updatedAt DESC")
    List<LeaveRequest> findHistoryForHr();

    @Query("SELECT r FROM LeaveRequest r WHERE r.employee.team.id = :teamId AND r.status IN ('PENDING_MANAGER', 'PENDING_HR', 'APPROVED') AND r.startDate <= :endDate AND r.endDate >= :startDate")
    List<LeaveRequest> findTeamActiveRequestsBetween(
        @Param("teamId") Long teamId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Query("SELECT r FROM LeaveRequest r WHERE r.employee.id = :employeeId AND r.status IN ('PENDING_MANAGER', 'PENDING_HR', 'APPROVED') AND r.startDate <= :endDate AND r.endDate >= :startDate")
    List<LeaveRequest> findActiveOverlappingRequests(
        @Param("employeeId") Long employeeId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Query("SELECT r.id FROM LeaveRequest r WHERE r.status IN ('PENDING_MANAGER', 'PENDING_HR') AND r.stageDeadlineAt IS NOT NULL AND r.stageDeadlineAt <= :now")
    List<Long> findDueRequestIds(@Param("now") Instant now);

    @Query("SELECT r FROM LeaveRequest r WHERE r.status = 'APPROVED' AND :today BETWEEN r.startDate AND r.endDate")
    List<LeaveRequest> findEmployeesOnLeaveToday(@Param("today") LocalDate today);

    @Query("SELECT r FROM LeaveRequest r WHERE r.status = 'APPROVED' AND r.employee.team.id = :teamId AND :today BETWEEN r.startDate AND r.endDate")
    List<LeaveRequest> findTeamMembersOnLeaveToday(@Param("teamId") Long teamId, @Param("today") LocalDate today);

    @Query("SELECT COUNT(r) FROM LeaveRequest r WHERE r.employee.id = :employeeId AND r.status IN ('PENDING_MANAGER', 'PENDING_HR')")
    long countPendingByEmployeeId(@Param("employeeId") Long employeeId);

    @Query("SELECT COUNT(r) FROM LeaveRequest r WHERE r.employee.manager.id = :managerId AND r.status = 'PENDING_MANAGER'")
    long countAwaitingManagerDecision(@Param("managerId") Long managerId);

    @Query("SELECT COUNT(r) FROM LeaveRequest r WHERE r.status = 'PENDING_HR'")
    long countAwaitingHr();

    @Query("SELECT COUNT(r) FROM LeaveRequest r WHERE (r.status = 'PENDING_MANAGER' OR r.status = 'PENDING_HR') AND r.escalationLevel > 0")
    long countTotalEscalated();

    @Query("SELECT COUNT(r) FROM LeaveRequest r WHERE r.createdAt >= :startOfMonth")
    long countRequestsThisMonth(@Param("startOfMonth") Instant startOfMonth);
}
