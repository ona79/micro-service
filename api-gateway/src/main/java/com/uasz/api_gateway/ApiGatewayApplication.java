package com.uasz.api_gateway;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.net.CookieHandler;

@SpringBootApplication
public class ApiGatewayApplication {

    @PostConstruct
    public void disableGlobalCookieSharing() {
        CookieHandler.setDefault(null);
    }

    public static void main(String[] args) {
        CookieHandler.setDefault(null);
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}

