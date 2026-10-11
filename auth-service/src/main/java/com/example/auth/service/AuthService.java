package com.example.auth.service;

import com.example.auth.dto.ApiResponse;
import com.example.auth.dto.LoginData;
import com.example.auth.dto.LoginRequest;
import com.example.auth.dto.RegisterRequest;
import com.example.auth.entity.UserCredential;
import com.example.auth.entity.UserInfo;
import com.example.auth.entity.UserType;
import com.example.auth.exception.AppException;
import com.example.auth.repository.UserCredentialRepository;
import com.example.auth.repository.UserInfoRepository;
import com.example.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserCredentialRepository credentialRepository;
    private final UserInfoRepository userInfoRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public ApiResponse<LoginData> login(LoginRequest request) {
        String email = normalize(request.email());

        UserCredential credential = credentialRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> AppException.notFound("User not exist Please register"));

        if (!passwordEncoder.matches(request.password(), credential.getPassword())) {
            throw AppException.unauthorized("Incorrect password.");
        }

        UserInfo profile = userInfoRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> AppException.notFound("User profile not found."));

        String userType = profile.getUserType().name();
        String role = "A".equals(userType) ? "ADMIN" : "USER";
        String token = jwtService.generateToken(email, userType);

        return ApiResponse.ok("Login successful", new LoginData(email, profile.getFirstName(), profile.getLastName(), userType, role, token));
    }

    @Transactional
    public ApiResponse<Void> register(RegisterRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw AppException.badRequest("Password and confirm password do not match.");
        }

        String email = normalize(request.email());
        if (credentialRepository.existsByEmailIgnoreCase(email)) {
            throw AppException.conflict("This email is already registered.");
        }

        String passwordHash = passwordEncoder.encode(request.password());
        UserCredential credential = UserCredential.builder()
                .email(email)
                .password(passwordHash)
                .build();
        credentialRepository.save(credential);

        UserInfo profile = UserInfo.builder()
                .firstName(trim(request.firstName()))
                .lastName(trim(request.lastName()))
                .mobileNumber(trim(request.mobileNumber()))
                .email(email)
                .userType(UserType.U)
                .build();

        userInfoRepository.save(profile);
        return ApiResponse.ok("Registration successful. Please log in.", null);
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}
