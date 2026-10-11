package com.example.auth.exception;

import java.util.Map;

public record ErrorResponse(boolean success, String message, String code, Map<String, String> fieldErrors) {
}
