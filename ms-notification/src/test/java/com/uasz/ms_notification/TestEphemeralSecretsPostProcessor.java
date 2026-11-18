package com.uasz.ms_notification;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

public class TestEphemeralSecretsPostProcessor implements EnvironmentPostProcessor {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String SESSION_SECRET = generateRandomSecret();
    private static final String INTERSERVICE_SECRET = generateRandomSecret();

    public static String generateRandomSecret() {
        byte[] bytes = new byte[36];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> props = new HashMap<>();
        if (!environment.containsProperty("SECURITY_SESSION_SECRET")) {
            props.put("SECURITY_SESSION_SECRET", SESSION_SECRET);
        }
        if (!environment.containsProperty("SECURITY_INTERSERVICE_SECRET")) {
            props.put("SECURITY_INTERSERVICE_SECRET", INTERSERVICE_SECRET);
        }
        if (!props.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource("ephemeralTestSecrets", props));
        }
    }
}
