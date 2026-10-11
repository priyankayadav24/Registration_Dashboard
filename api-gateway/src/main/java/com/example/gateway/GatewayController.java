package com.example.gateway;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

@RestController
@RequestMapping("/api")
@EnableConfigurationProperties(GatewayProperties.class)
public class GatewayController {

    private final RestClient restClient;
    private final GatewayProperties properties;

    public GatewayController(GatewayProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder().build();
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> body) {
        return forward(properties.authServiceUrl() + "/api/auth/login", HttpMethod.POST, body, null, false);
    }

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> body) {
        return forward(properties.authServiceUrl() + "/api/auth/register", HttpMethod.POST, body, null, false);
    }

    @GetMapping("/users/me")
    public ResponseEntity<?> me(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
        return forward(properties.userServiceUrl() + "/api/users/me", HttpMethod.GET, null, authHeader, false);
    }

    @GetMapping("/users")
    public ResponseEntity<?> allUsers(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
        return forward(properties.userServiceUrl() + "/api/users", HttpMethod.GET, null, authHeader, false);
    }

    @GetMapping("/users/existing")
    public ResponseEntity<?> existing(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
        return forward(properties.userServiceUrl() + "/api/users/existing", HttpMethod.GET, null, authHeader, false);
    }

    @GetMapping("/users/export")
    public ResponseEntity<?> export(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
        return forward(properties.userServiceUrl() + "/api/users/export", HttpMethod.GET, null, authHeader, true);
    }

    private ResponseEntity<?> forward(String targetUrl, HttpMethod method, Object body, String authHeader, boolean binary) {
        try {
            var request = restClient.method(method)
                    .uri(targetUrl);

            if (authHeader != null && !authHeader.isBlank()) {
                request.header(HttpHeaders.AUTHORIZATION, authHeader);
            }

            if (body != null) {
                request.contentType(MediaType.APPLICATION_JSON).body(body);
            }

            if (binary) {
                var response = request.retrieve().toEntity(byte[].class);
                HttpHeaders headers = new HttpHeaders();
                headers.add(HttpHeaders.CONTENT_DISPOSITION, response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
                headers.add(HttpHeaders.CONTENT_TYPE, response.getHeaders().getFirst(HttpHeaders.CONTENT_TYPE));
                return ResponseEntity.status(response.getStatusCode()).headers(headers).body(response.getBody());
            }

            return request.retrieve().toEntity(Map.class);
        } catch (RestClientException ex) {
            if (ex instanceof HttpStatusCodeException statusEx) {
                try {
                    String upstreamBody = statusEx.getResponseBodyAsString();
                    ObjectMapper objectMapper = new ObjectMapper();
                    Map<?, ?> parsedBody = objectMapper.readValue(upstreamBody, Map.class);
                    return ResponseEntity.status(statusEx.getStatusCode()).body(parsedBody);
                } catch (Exception ignored) {
                    return ResponseEntity.status(statusEx.getStatusCode()).body(Map.of(
                            "success", false,
                            "message", statusEx.getStatusText(),
                            "code", "UPSTREAM_ERROR"
                    ));
                }
            }

            return ResponseEntity.status(502).body(Map.of(
                    "success", false,
                    "message", "Gateway could not reach the backend service",
                    "code", "UPSTREAM_ERROR"
            ));
        }
    }
}
