package com.leaveflow.service;

import com.leaveflow.config.LeaveProperties;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private final byte[] secretBytes;
    private final int expirationMinutes;
    private final Clock clock;

    public JwtService(LeaveProperties properties, Clock clock) {
        String secret = properties.jwt() != null && properties.jwt().secret() != null
            ? properties.jwt().secret()
            : "super-secret-key-that-is-at-least-32-bytes-long-for-hs256-signing";
        this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.expirationMinutes = (properties.jwt() != null && properties.jwt().expirationMinutes() > 0)
            ? properties.jwt().expirationMinutes()
            : 60;
        this.clock = clock;
    }

    public String generateToken(Long employeeId, String email, String role, String name) {
        try {
            JWSSigner signer = new MACSigner(secretBytes);
            Instant now = clock.instant();
            Instant expiry = now.plusSeconds(expirationMinutes * 60L);

            JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .subject(String.valueOf(employeeId))
                .claim("email", email)
                .claim("role", role)
                .claim("name", name)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(expiry))
                .build();

            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claimsSet);
            signedJWT.sign(signer);
            return signedJWT.serialize();
        } catch (JOSEException e) {
            throw new RuntimeException("Failed to generate JWT token", e);
        }
    }

    public Long validateAndGetEmployeeId(String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            JWSVerifier verifier = new MACVerifier(secretBytes);
            if (!signedJWT.verify(verifier)) {
                return null;
            }

            Date expirationTime = signedJWT.getJWTClaimsSet().getExpirationTime();
            if (expirationTime != null && expirationTime.before(Date.from(clock.instant()))) {
                return null;
            }

            String subject = signedJWT.getJWTClaimsSet().getSubject();
            return (subject != null) ? Long.valueOf(subject) : null;
        } catch (Exception e) {
            return null;
        }
    }
}
