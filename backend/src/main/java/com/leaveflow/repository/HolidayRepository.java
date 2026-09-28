package com.leaveflow.repository;

import com.leaveflow.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {
    Optional<Holiday> findByDate(LocalDate date);

    @Query("SELECT h FROM Holiday h WHERE h.date >= :startDate AND h.date <= :endDate ORDER BY h.date ASC")
    List<Holiday> findBetweenDates(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
