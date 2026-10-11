package com.example.auth.dto;

public record ApiResponse<T>(boolean success, String message, T data, String code) {
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, null);
    }

    public static <T> ApiResponse<T> fail(String message, String code) {
        return new ApiResponse<>(false, message, null, code);
    }
}
