package com.leaveflow.common;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    AUTHENTICATION_FAILED(HttpStatus.UNAUTHORIZED, "Invalid username or password"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Full authentication is required to access this resource"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "You do not have permission to perform this action"),
    SELF_APPROVAL_NOT_ALLOWED(HttpStatus.FORBIDDEN, "Self-approval is not allowed"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "The requested resource was not found"),
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Validation failed for request parameters"),
    COMMENT_REQUIRED(HttpStatus.BAD_REQUEST, "A comment is required for this action"),
    CANNOT_CANCEL_PAST_LEAVE(HttpStatus.BAD_REQUEST, "Cannot cancel leave that has already started or passed"),
    STALE_STATE(HttpStatus.CONFLICT, "This request was updated by another process. Please refresh."),
    ILLEGAL_TRANSITION(HttpStatus.CONFLICT, "The requested action is not valid for the current state"),
    OVERLAPPING_REQUEST(HttpStatus.CONFLICT, "You already have an active leave request covering these dates"),
    COVERAGE_NOT_ALLOWED_STATE(HttpStatus.CONFLICT, "Coverage operations are not permitted for this request state"),
    UNPAID_ACKNOWLEDGEMENT_REQUIRED(HttpStatus.UNPROCESSABLE_ENTITY, "Acknowledgement required for unpaid leave days"),
    COVERAGE_CAP_EXCEEDED(HttpStatus.UNPROCESSABLE_ENTITY, "Monthly coverage allowance cap exceeded"),
    COVERAGE_OVERSHARE(HttpStatus.UNPROCESSABLE_ENTITY, "Total coverage share cannot exceed 100%"),
    COVERAGE_CANDIDATE_UNAVAILABLE(HttpStatus.UNPROCESSABLE_ENTITY, "Selected candidate is not eligible for coverage"),
    COVERAGE_COMMITMENT_CONFLICT(HttpStatus.UNPROCESSABLE_ENTITY, "You accepted coverage on these dates. Ask your manager to reassign first."),
    NO_ELIGIBLE_APPROVER(HttpStatus.UNPROCESSABLE_ENTITY, "No eligible approver found for this request"),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "An internal server error occurred");

    private final HttpStatus httpStatus;
    private final String defaultMessage;

    ErrorCode(HttpStatus httpStatus, String defaultMessage) {
        this.httpStatus = httpStatus;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }
}
