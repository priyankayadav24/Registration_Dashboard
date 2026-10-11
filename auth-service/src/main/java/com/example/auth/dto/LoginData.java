package com.example.auth.dto;

public record LoginData(
        String email,
        String firstName,
        String lastName,
        String userType,
        String role,
        String accessToken
) {}
