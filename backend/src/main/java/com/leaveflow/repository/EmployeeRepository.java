package com.leaveflow.repository;

import com.leaveflow.entity.Employee;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByEmail(String email);
    Optional<Employee> findByEmployeeCode(String employeeCode);
    List<Employee> findByTeamIdAndActiveTrue(Long teamId);
    List<Employee> findByRoleAndActiveTrue(String role);
    List<Employee> findByManagerIdAndActiveTrue(Long managerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT e FROM Employee e WHERE e.id = :id")
    Optional<Employee> findByIdForUpdate(@Param("id") Long id);
}
