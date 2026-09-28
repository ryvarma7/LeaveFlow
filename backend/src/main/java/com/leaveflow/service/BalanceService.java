package com.leaveflow.service;

import com.leaveflow.entity.Employee;
import com.leaveflow.entity.LeaveBalance;
import com.leaveflow.entity.LeaveBalanceLedger;
import com.leaveflow.entity.LeaveRequest;
import com.leaveflow.repository.LeaveBalanceLedgerRepository;
import com.leaveflow.repository.LeaveBalanceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class BalanceService {

    private final LeaveBalanceRepository balanceRepository;
    private final LeaveBalanceLedgerRepository ledgerRepository;

    public BalanceService(
        LeaveBalanceRepository balanceRepository,
        LeaveBalanceLedgerRepository ledgerRepository
    ) {
        this.balanceRepository = balanceRepository;
        this.ledgerRepository = ledgerRepository;
    }

    @Transactional
    public Optional<LeaveBalance> lockBalanceForUpdate(Long employeeId, Long leaveTypeId, int year) {
        return balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYearForUpdate(employeeId, leaveTypeId, year);
    }

    @Transactional
    public void reserve(Long balanceId, BigDecimal paidDays, LeaveRequest request, Employee actor) {
        if (paidDays == null || paidDays.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        int updated = balanceRepository.reserveDays(balanceId, paidDays);
        if (updated == 0) {
            throw new IllegalStateException("Balance reservation guard failed for balance ID: " + balanceId);
        }
        LeaveBalance balance = balanceRepository.findById(balanceId)
            .orElseThrow(() -> new IllegalStateException("Balance not found: " + balanceId));

        LeaveBalanceLedger ledger = new LeaveBalanceLedger(
            balance,
            request,
            "RESERVE",
            BigDecimal.ZERO,
            paidDays,
            BigDecimal.ZERO,
            "Reserved " + paidDays + " days for request " + request.getRequestNumber(),
            actor
        );
        ledgerRepository.save(ledger);
    }

    @Transactional
    public void consume(Long balanceId, BigDecimal paidDays, LeaveRequest request, Employee actor) {
        if (paidDays == null || paidDays.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        int updated = balanceRepository.consumeDays(balanceId, paidDays);
        if (updated == 0) {
            throw new IllegalStateException("Balance consumption guard failed for balance ID: " + balanceId);
        }
        LeaveBalance balance = balanceRepository.findById(balanceId)
            .orElseThrow(() -> new IllegalStateException("Balance not found: " + balanceId));

        LeaveBalanceLedger ledger = new LeaveBalanceLedger(
            balance,
            request,
            "CONSUME",
            BigDecimal.ZERO,
            paidDays.negate(),
            paidDays,
            "Consumed " + paidDays + " days upon approval of " + request.getRequestNumber(),
            actor
        );
        ledgerRepository.save(ledger);
    }

    @Transactional
    public void release(Long balanceId, BigDecimal paidDays, LeaveRequest request, Employee actor) {
        if (paidDays == null || paidDays.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        int updated = balanceRepository.releaseDays(balanceId, paidDays);
        if (updated == 0) {
            throw new IllegalStateException("Balance release guard failed for balance ID: " + balanceId);
        }
        LeaveBalance balance = balanceRepository.findById(balanceId)
            .orElseThrow(() -> new IllegalStateException("Balance not found: " + balanceId));

        LeaveBalanceLedger ledger = new LeaveBalanceLedger(
            balance,
            request,
            "RELEASE",
            BigDecimal.ZERO,
            paidDays.negate(),
            BigDecimal.ZERO,
            "Released " + paidDays + " reserved days for request " + request.getRequestNumber(),
            actor
        );
        ledgerRepository.save(ledger);
    }

    @Transactional
    public void restore(Long balanceId, BigDecimal paidDays, LeaveRequest request, Employee actor) {
        if (paidDays == null || paidDays.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        int updated = balanceRepository.restoreDays(balanceId, paidDays);
        if (updated == 0) {
            throw new IllegalStateException("Balance restore guard failed for balance ID: " + balanceId);
        }
        LeaveBalance balance = balanceRepository.findById(balanceId)
            .orElseThrow(() -> new IllegalStateException("Balance not found: " + balanceId));

        LeaveBalanceLedger ledger = new LeaveBalanceLedger(
            balance,
            request,
            "RESTORE",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            paidDays.negate(),
            "Restored " + paidDays + " used days upon cancellation of " + request.getRequestNumber(),
            actor
        );
        ledgerRepository.save(ledger);
    }
}
