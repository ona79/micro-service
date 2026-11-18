package com.uasz.ms_circuit.security;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Component
public class InterserviceFeignSecurityInterceptor implements RequestInterceptor {

    private static final String SERVICE_NAME = "ms-circuit";
    private static final String HMAC_ALGO = "HmacSHA256";

    private final byte[] secretKey;

    public InterserviceFeignSecurityInterceptor(
            @Value("${security.interservice.secret:dev-interservice-secret-casamance-uasz-32bytes!}") String secret
    ) {
        this.secretKey = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public void apply(RequestTemplate template) {
        long timestamp = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String method = template.method();
        String path = template.path();

        String canonicalString = method + "|" + path + "|" + SERVICE_NAME + "|" + timestamp + "|" + nonce;
        String signature = sign(canonicalString);

        template.header("X-Service-Name", SERVICE_NAME);
        template.header("X-Service-Timestamp", String.valueOf(timestamp));
        template.header("X-Service-Nonce", nonce);
        template.header("X-Service-Signature", signature);
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secretKey, HMAC_ALGO));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Impossible de signer la requête interservice", ex);
        }
    }
}
