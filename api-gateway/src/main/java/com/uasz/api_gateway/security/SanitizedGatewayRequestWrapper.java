package com.uasz.api_gateway.security;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.springframework.util.StreamUtils;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Enveloppe de requête Gateway qui :
 * 1) Supprime tous les en-têtes internes non fiables fournis par le client externe (X-User-*, X-Internal-*, X-Service-*, X-Content-SHA256).
 * 2) Met en cache le corps HTTP (cachedBody) pour permettre le calcul de l'empreinte SHA-256 sans consommer le flux Servlet.
 */
public class SanitizedGatewayRequestWrapper extends HttpServletRequestWrapper {

    private static final Set<String> UNTRUSTED_HEADER_PREFIXES = Set.of(
            "x-user-",
            "x-internal-",
            "x-service-",
            "x-content-sha256"
    );

    private final Map<String, String> injectedHeaders = new HashMap<>();
    private final Map<String, String> canonicalHeaderNames = new HashMap<>();
    private final byte[] cachedBody;

    public SanitizedGatewayRequestWrapper(HttpServletRequest request) throws IOException {
        super(request);
        byte[] body = new byte[0];
        if (request.getInputStream() != null) {
            body = StreamUtils.copyToByteArray(request.getInputStream());
        }
        this.cachedBody = body;
    }

    public byte[] getCachedBody() {
        return cachedBody;
    }

    public void setHeader(String name, String value) {
        String lower = name.toLowerCase(Locale.ROOT);
        injectedHeaders.put(lower, value);
        canonicalHeaderNames.put(lower, name);
    }

    @Override
    public String getHeader(String name) {
        if (name == null) return null;
        String lower = name.toLowerCase(Locale.ROOT);
        if (injectedHeaders.containsKey(lower)) {
            return injectedHeaders.get(lower);
        }
        if (isUntrustedClientHeader(lower)) {
            return null;
        }
        return super.getHeader(name);
    }

    @Override
    public Enumeration<String> getHeaders(String name) {
        if (name == null) return Collections.emptyEnumeration();
        String lower = name.toLowerCase(Locale.ROOT);
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
                String lower = name.toLowerCase(Locale.ROOT);
                if (!isUntrustedClientHeader(lower)) {
                    names.add(name);
                }
            }
        }
        names.addAll(canonicalHeaderNames.values());
        return Collections.enumeration(names);
    }

    @Override
    public ServletInputStream getInputStream() {
        final ByteArrayInputStream bais = new ByteArrayInputStream(this.cachedBody);
        return new ServletInputStream() {
            @Override
            public boolean isFinished() {
                return bais.available() == 0;
            }

            @Override
            public boolean isReady() {
                return true;
            }

            @Override
            public void setReadListener(ReadListener readListener) {
                // Non-blocking listener non requis en mode Servlet synchrone
            }

            @Override
            public int read() {
                return bais.read();
            }

            @Override
            public int read(byte[] b, int off, int len) {
                return bais.read(b, off, len);
            }
        };
    }

    @Override
    public BufferedReader getReader() {
        return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
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
