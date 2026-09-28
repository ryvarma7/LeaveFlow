package com.leaveflow.service;

import com.leaveflow.domain.calculator.ProRatingCalculator;
import com.leaveflow.entity.Employee;
import com.leaveflow.entity.LeaveBalance;
import com.leaveflow.entity.LeaveBalanceLedger;
import com.leaveflow.entity.LeaveType;
import com.leaveflow.repository.LeaveBalanceLedgerRepository;
import com.leaveflow.repository.LeaveBalanceRepository;
import com.leaveflow.repository.LeaveTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class BalanceInitializer {

    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository balanceRepository;
    private final LeaveBalanceLedgerRepository ledgerRepository;

    public BalanceInitializer(
        LeaveTypeRepository leaveTypeRepository,
        LeaveBalanceRepository balanceRepository,
        LeaveBalanceLedgerRepository ledgerRepository
    ) {
        this.leaveTypeRepository = leaveTypeRepository;
        this.balanceRepository = balanceRepository;
        this.ledgerRepository = ledgerRepository;
    }

    @Transactional
    public void initializeBalancesForEmployee(Employee employee, int year) {
        List<LeaveType> leaveTypes = leaveTypeRepository.findAll();

        for (LeaveType leaveType : leaveTypes) {
            if (!leaveType.isPaid()) {
                continue;
            }

            if (balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(employee.getId(), leaveType.getId(), year).isPresent()) {
                continue;
            }

            BigDecimal prorated = ProRatingCalculator.calculate(
                leaveType.getAnnualEntitlement(),
                employee.getJoinedDate(),
                year
            );

            LeaveBalance balance = new LeaveBalance(
                employee,
                leaveType,
                year,
                prorated,
                BigDecimal.ZERO,
                BigDecimal.ZERO
            );
            balance = balanceRepository.save(balance);

            LeaveBalanceLedger ledger = new LeaveBalanceLedger(
                balance,
                null,
                "ENTITLEMENT_GRANT",
                prorated,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                String.format("Initial pro-rated grant of %s days for join date %s in year %d", prorated, employee.getJoinedDate(), year),
                null
            );
            ledgerRepository.save(ledger);
        }
    }
}
