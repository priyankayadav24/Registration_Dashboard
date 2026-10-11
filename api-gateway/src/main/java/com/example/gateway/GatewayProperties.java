package com.example.gateway;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record GatewayProperties(String authServiceUrl, String userServiceUrl) {
}
