package com.leaveflow.common;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class EmployeePrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String role;
    private final String fullName;
    private final boolean active;

    public EmployeePrincipal(Long id, String email, String role, String fullName, boolean active) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.fullName = fullName;
        this.active = active;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getFullName() { return fullName; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getPassword() { return ""; }

    @Override
    public String getUsername() { return email; }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return active; }

    public static EmployeePrincipal getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof EmployeePrincipal principal) {
            return principal;
        }
        throw new DomainException(ErrorCode.UNAUTHORIZED);
    }
}
