package com.example.user.controller;

import com.example.user.entity.UserInfo;
import com.example.user.entity.UserType;
import com.example.user.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final UserInfoRepository userInfoRepository;

    @GetMapping("/users/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        UserInfo user = userInfoRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return ResponseEntity.ok(successResponse("User details fetched successfully", toUserPayload(user)));
    }

    @GetMapping({"/users", "/users/existing"})
    public ResponseEntity<Map<String, Object>> getExistingUsers(Authentication authentication) {
        if (isAdmin(authentication)) {
            List<UserInfo> users = userInfoRepository.findAllByOrderByUserIdAsc();
            List<Map<String, Object>> payload = users.stream().map(this::toUserPayload).toList();
            return ResponseEntity.ok(successResponse("All existing users fetched successfully", payload));
        }

        UserInfo user = userInfoRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return ResponseEntity.ok(successResponse("User details fetched successfully", toUserPayload(user)));
    }

    @GetMapping("/users/export")
    public ResponseEntity<byte[]> exportUsers(Authentication authentication) {
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied".getBytes(StandardCharsets.UTF_8));
        }

        List<UserInfo> users = userInfoRepository.findAllByOrderByUserIdAsc();
        StringBuilder csv = new StringBuilder();
        csv.append("firstName,lastName,email,mobileNumber,userType\n");
        for (UserInfo user : users) {
            csv.append(user.getFirstName()).append(',')
                .append(user.getLastName()).append(',')
                .append(user.getEmail()).append(',')
                .append(user.getMobileNumber()).append(',')
                .append(user.getUserType()).append('\n');
        }

        byte[] content = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=existing-users.csv")
                .contentType(MediaType.TEXT_PLAIN)
                .body(content);
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_A"));
    }

    private Map<String, Object> toUserPayload(UserInfo user) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("firstName", user.getFirstName());
        payload.put("lastName", user.getLastName());
        payload.put("email", user.getEmail());
        payload.put("mobileNumber", user.getMobileNumber());
        payload.put("userType", user.getUserType().name());
        payload.put("role", user.getUserType() == UserType.A ? "ADMIN" : "USER");
        return payload;
    }

    private Map<String, Object> successResponse(String message, Object data) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put("data", data);
        response.put("code", null);
        return response;
    }
}
