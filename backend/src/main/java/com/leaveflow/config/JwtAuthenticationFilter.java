package com.leaveflow.config;

import com.leaveflow.common.EmployeePrincipal;
import com.leaveflow.entity.Employee;
import com.leaveflow.repository.EmployeeRepository;
import com.leaveflow.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final EmployeeRepository employeeRepository;

    public JwtAuthenticationFilter(JwtService jwtService, @Lazy EmployeeRepository employeeRepository) {
        this.jwtService = jwtService;
        this.employeeRepository = employeeRepository;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            Long employeeId = jwtService.validateAndGetEmployeeId(token);

            if (employeeId != null) {
                // Fetch fresh from database: role and active status come directly from DB
                Employee employee = employeeRepository.findById(employeeId).orElse(null);
                if (employee != null && employee.isActive()) {
                    EmployeePrincipal principal = new EmployeePrincipal(
                        employee.getId(),
                        employee.getEmail(),
                        employee.getRole(),
                        employee.getFullName(),
                        employee.isActive()
                    );
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        principal.getAuthorities()
                    );
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
