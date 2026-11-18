package com.uasz.api_gateway.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class SanitizedGatewayRequestWrapper extends HttpServletRequestWrapper {

    private static final Set<String> UNTRUSTED_HEADER_PREFIXES = Set.of(
            "x-user-",
            "x-internal-",
            "x-service-"
    );

    private final Map<String, String> injectedHeaders = new HashMap<>();

    public SanitizedGatewayRequestWrapper(HttpServletRequest request) {
        super(request);
    }

    public void setHeader(String name, String value) {
        injectedHeaders.put(name.toLowerCase(), value);
    }

    @Override
    public String getHeader(String name) {
        if (name == null) return null;
        String lower = name.toLowerCase();
        if (injectedHeaders.containsKey(lower)) {
            return injectedHeaders.get(lower);
        }
        if (isUntrustedClientHeader(lower)) {
            return null; // Stripped untrusted header
        }
        return super.getHeader(name);
    }

    @Override
    public Enumeration<String> getHeaders(String name) {
        if (name == null) return Collections.emptyEnumeration();
        String lower = name.toLowerCase();
        if (injectedHeaders.containsKey(lower)) {
            return Collections.enumeration(Collections.singletonList(injectedHeaders.get(lower)));
        }
        if (isUntrustedClientHeader(lower)) {
            return Collections.emptyEnumeration();
        }
        return super.getHeaders(name);
    }

    @Override
    public Enumeration<String> getHeaderNames() {
        Set<String> names = new HashSet<>();
        Enumeration<String> parentNames = super.getHeaderNames();
        if (parentNames != null) {
            while (parentNames.hasMoreElements()) {
                String name = parentNames.nextElement();
                String lower = name.toLowerCase();
                if (!isUntrustedClientHeader(lower)) {
                    names.add(name);
                }
            }
        }
        names.addAll(injectedHeaders.keySet());
        return Collections.enumeration(names);
    }

    private boolean isUntrustedClientHeader(String lowerName) {
        for (String prefix : UNTRUSTED_HEADER_PREFIXES) {
            if (lowerName.startsWith(prefix) && !injectedHeaders.containsKey(lowerName)) {
                return true;
            }
        }
        return false;
    }
}
