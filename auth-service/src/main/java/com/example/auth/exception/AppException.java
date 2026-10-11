package com.example.auth.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AppException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public AppException(String message, HttpStatus status, String code) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static AppException badRequest(String message) { return new AppException(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST"); }
    public static AppException unauthorized(String message) { return new AppException(message, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED"); }
    public static AppException forbidden(String message) { return new AppException(message, HttpStatus.FORBIDDEN, "FORBIDDEN"); }
    public static AppException notFound(String message) { return new AppException(message, HttpStatus.NOT_FOUND, "USER_NOT_FOUND"); }
    public static AppException conflict(String message) { return new AppException(message, HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS"); }
    public static AppException internalError(String message) { return new AppException(message, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"); }
}
