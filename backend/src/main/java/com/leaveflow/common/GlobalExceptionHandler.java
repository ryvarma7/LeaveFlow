package com.leaveflow.common;

import com.leaveflow.domain.statemachine.IllegalTransitionException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ProblemDetail> handleDomainException(DomainException ex, HttpServletRequest request) {
        log.warn("Domain exception [{}]: {}", ex.getErrorCode(), ex.getMessage());
        
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getErrorCode().getHttpStatus(), ex.getMessage());
        problem.setTitle(ex.getErrorCode().name());
        problem.setType(URI.create("urn:problem-type:" + ex.getErrorCode().name().toLowerCase()));
        problem.setProperty("code", ex.getErrorCode().name());
        problem.setProperty("traceId", MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY));

        if (!ex.getDetails().isEmpty()) {
            ex.getDetails().forEach(problem::setProperty);
        }

        return ResponseEntity.status(ex.getErrorCode().getHttpStatus()).body(problem);
    }

    @ExceptionHandler(IllegalTransitionException.class)
    public ResponseEntity<ProblemDetail> handleIllegalTransition(IllegalTransitionException ex, HttpServletRequest request) {
        log.warn("Illegal transition from [{}] on [{}]", ex.getFromStatus(), ex.getEvent());
        
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle(ErrorCode.ILLEGAL_TRANSITION.name());
        problem.setType(URI.create("urn:problem-type:illegal_transition"));
        problem.setProperty("code", ErrorCode.ILLEGAL_TRANSITION.name());
        problem.setProperty("traceId", MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY));
        problem.setProperty("fromStatus", ex.getFromStatus());
        problem.setProperty("event", ex.getEvent());

        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
        problem.setTitle(ErrorCode.VALIDATION_FAILED.name());
        problem.setType(URI.create("urn:problem-type:validation_failed"));
        problem.setProperty("code", ErrorCode.VALIDATION_FAILED.name());
        problem.setProperty("traceId", MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY));
        problem.setProperty("fieldErrors", errors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Access denied: you do not have permission");
        problem.setTitle(ErrorCode.FORBIDDEN.name());
        problem.setType(URI.create("urn:problem-type:forbidden"));
        problem.setProperty("code", ErrorCode.FORBIDDEN.name());
        problem.setProperty("traceId", MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY));

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuth(AuthenticationException ex, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Authentication failed");
        problem.setTitle(ErrorCode.AUTHENTICATION_FAILED.name());
        problem.setType(URI.create("urn:problem-type:authentication_failed"));
        problem.setProperty("code", ErrorCode.AUTHENTICATION_FAILED.name());
        problem.setProperty("traceId", MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY));

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGeneric(Exception ex, HttpServletRequest request) {
        log.error("Unhandled server exception", ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An internal server error occurred");
        problem.setTitle(ErrorCode.INTERNAL_SERVER_ERROR.name());
        problem.setType(URI.create("urn:problem-type:internal_server_error"));
        problem.setProperty("code", ErrorCode.INTERNAL_SERVER_ERROR.name());
        problem.setProperty("traceId", MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY));

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }
}
