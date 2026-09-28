package com.leaveflow.config;

import com.leaveflow.entity.Employee;
import com.leaveflow.entity.Team;
import com.leaveflow.repository.EmployeeRepository;
import com.leaveflow.repository.TeamRepository;
import com.leaveflow.service.BalanceInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
@Profile({"demo", "default", "dev"})
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final EmployeeRepository employeeRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;
    private final BalanceInitializer balanceInitializer;

    public DemoDataSeeder(
        EmployeeRepository employeeRepository,
        TeamRepository teamRepository,
        PasswordEncoder passwordEncoder,
        BalanceInitializer balanceInitializer
    ) {
        this.employeeRepository = employeeRepository;
        this.teamRepository = teamRepository;
        this.passwordEncoder = passwordEncoder;
        this.balanceInitializer = balanceInitializer;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (employeeRepository.count() > 0) {
            log.info("Demo data already seeded, skipping.");
            return;
        }

        log.info("Seeding demo data for LeaveFlow...");

        String encodedPassword = passwordEncoder.encode("Password@123");

        // Team
        Team engTeam = new Team("Engineering", BigDecimal.valueOf(25.00));
        engTeam = teamRepository.save(engTeam);

        Team hrTeam = new Team("Human Resources", BigDecimal.valueOf(50.00));
        hrTeam = teamRepository.save(hrTeam);

        // HR users
        Employee hannah = new Employee(
            "EMP-HR-001",
            "Hannah",
            "Abbott",
            "hannah@leaveflow.internal",
            encodedPassword,
            "HR",
            hrTeam,
            null,
            BigDecimal.valueOf(120000.00),
            LocalDate.of(2024, 1, 1)
        );
        hannah = employeeRepository.save(hannah);

        Employee harish = new Employee(
            "EMP-HR-002",
            "Harish",
            "Patel",
            "harish@leaveflow.internal",
            encodedPassword,
            "HR",
            hrTeam,
            null,
            BigDecimal.valueOf(125000.00),
            LocalDate.of(2024, 1, 1)
        );
        harish = employeeRepository.save(harish);

        // Manager
        Employee meera = new Employee(
            "EMP-MGR-001",
            "Meera",
            "Sharma",
            "meera@leaveflow.internal",
            encodedPassword,
            "MANAGER",
            engTeam,
            null,
            BigDecimal.valueOf(150000.00),
            LocalDate.of(2024, 1, 1)
        );
        meera = employeeRepository.save(meera);

        // Employees
        Employee arun = new Employee(
            "EMP-ENG-001",
            "Arun",
            "Kumar",
            "arun@leaveflow.internal",
            encodedPassword,
            "EMPLOYEE",
            engTeam,
            meera,
            BigDecimal.valueOf(80000.00),
            LocalDate.of(2025, 1, 1)
        );
        arun = employeeRepository.save(arun);

        Employee bala = new Employee(
            "EMP-ENG-002",
            "Bala",
            "Vignesh",
            "bala@leaveflow.internal",
            encodedPassword,
            "EMPLOYEE",
            engTeam,
            meera,
            BigDecimal.valueOf(75000.00),
            LocalDate.of(2025, 1, 1)
        );
        bala = employeeRepository.save(bala);

        Employee chitra = new Employee(
            "EMP-ENG-003",
            "Chitra",
            "Devi",
            "chitra@leaveflow.internal",
            encodedPassword,
            "EMPLOYEE",
            engTeam,
            meera,
            BigDecimal.valueOf(70000.00),
            LocalDate.of(2025, 6, 1)
        );
        chitra = employeeRepository.save(chitra);

        Employee divya = new Employee(
            "EMP-ENG-004",
            "Divya",
            "Ramesh",
            "divya@leaveflow.internal",
            encodedPassword,
            "EMPLOYEE",
            engTeam,
            meera,
            BigDecimal.valueOf(65000.00),
            LocalDate.of(2026, 7, 1) // Mid-year joiner
        );
        divya = employeeRepository.save(divya);

        // Initialize balances for 2026 and 2027
        for (Employee emp : new Employee[]{hannah, harish, meera, arun, bala, chitra, divya}) {
            balanceInitializer.initializeBalancesForEmployee(emp, 2026);
            balanceInitializer.initializeBalancesForEmployee(emp, 2027);
        }

        log.info("Demo data seeding completed successfully.");
    }
}
