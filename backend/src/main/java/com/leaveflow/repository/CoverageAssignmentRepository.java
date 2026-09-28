package com.leaveflow.repository;

import com.leaveflow.entity.CoverageAssignment;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CoverageAssignmentRepository extends JpaRepository<CoverageAssignment, Long> {

    List<CoverageAssignment> findByRequestIdOrderByCreatedAtAsc(Long requestId);

    List<CoverageAssignment> findByCoveringEmployeeIdOrderByCreatedAtDesc(Long coveringEmployeeId);

    List<CoverageAssignment> findByCoveringEmployeeIdAndStatusOrderByCreatedAtDesc(Long coveringEmployeeId, String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT c FROM CoverageAssignment c WHERE c.id = :id")
    Optional<CoverageAssignment> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT c FROM CoverageAssignment c WHERE c.request.id = :requestId AND c.status IN ('OFFERED', 'ACCEPTED')")
    List<CoverageAssignment> findActiveByRequestId(@Param("requestId") Long requestId);

    @Query("SELECT c FROM CoverageAssignment c WHERE c.coveringEmployee.id = :employeeId AND c.status = 'ACCEPTED' AND c.request.startDate <= :endDate AND c.request.endDate >= :startDate")
    List<CoverageAssignment> findAcceptedOverlapping(
        @Param("employeeId") Long employeeId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Query("SELECT c FROM CoverageAssignment c WHERE c.coveringEmployee.id = :employeeId AND c.status = 'OFFERED' AND c.request.startDate <= :endDate AND c.request.endDate >= :startDate")
    List<CoverageAssignment> findOfferedOverlapping(
        @Param("employeeId") Long employeeId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Query("SELECT c FROM CoverageAssignment c WHERE c.status = 'OFFERED' AND c.request.startDate <= :today")
    List<CoverageAssignment> findDueForExpiry(@Param("today") LocalDate today);

    @Query("SELECT c FROM CoverageAssignment c WHERE c.coveringEmployee.id = :employeeId AND c.status IN ('OFFERED', 'ACCEPTED')")
    List<CoverageAssignment> findActiveForEmployee(@Param("employeeId") Long employeeId);

    @Query("SELECT COUNT(c) FROM CoverageAssignment c WHERE c.coveringEmployee.id = :employeeId AND c.status = 'OFFERED'")
    long countPendingOffersForEmployee(@Param("employeeId") Long employeeId);

    @Query("SELECT c FROM CoverageAssignment c WHERE c.coveringEmployee.id = :employeeId AND c.status = 'ACCEPTED' AND c.createdAt >= :since")
    List<CoverageAssignment> findAcceptedSince(@Param("employeeId") Long employeeId, @Param("since") Instant since);
}
