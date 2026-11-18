package com.uasz.ms_utilisateur.security;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginRateLimiterService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_SECONDS = 300; // 5 minutes

    private record AttemptRecord(int count, long firstAttemptEpoch, long lockedUntilEpoch) {}

    private final Map<String, AttemptRecord> ipAttempts = new ConcurrentHashMap<>();
    private final Map<String, AttemptRecord> emailAttempts = new ConcurrentHashMap<>();

    public boolean isBlocked(String ip, String email) {
        long now = Instant.now().getEpochSecond();
        if (ip != null && isKeyBlocked(ipAttempts, ip, now)) {
            return true;
        }
        if (email != null && isKeyBlocked(emailAttempts, email.toLowerCase().trim(), now)) {
            return true;
        }
        return false;
    }

    public void recordFailedAttempt(String ip, String email) {
        long now = Instant.now().getEpochSecond();
        if (ip != null) {
            recordAttempt(ipAttempts, ip, now);
        }
        if (email != null) {
            recordAttempt(emailAttempts, email.toLowerCase().trim(), now);
        }
    }

    public void resetAttempts(String ip, String email) {
        if (ip != null) {
            ipAttempts.remove(ip);
        }
        if (email != null) {
            emailAttempts.remove(email.toLowerCase().trim());
        }
    }

    public long getRemainingLockoutSeconds(String ip, String email) {
        long now = Instant.now().getEpochSecond();
        long maxLockout = 0;
        if (ip != null) {
            AttemptRecord r = ipAttempts.get(ip);
            if (r != null && r.lockedUntilEpoch() > now) {
                maxLockout = Math.max(maxLockout, r.lockedUntilEpoch() - now);
            }
        }
        if (email != null) {
            AttemptRecord r = emailAttempts.get(email.toLowerCase().trim());
            if (r != null && r.lockedUntilEpoch() > now) {
                maxLockout = Math.max(maxLockout, r.lockedUntilEpoch() - now);
            }
        }
        return maxLockout;
    }

    private boolean isKeyBlocked(Map<String, AttemptRecord> map, String key, long now) {
        AttemptRecord record = map.get(key);
        if (record == null) return false;
        if (record.lockedUntilEpoch() > now) return true;
        // Si le verrouillage a expiré, on nettoie
        if (now - record.firstAttemptEpoch() > LOCKOUT_DURATION_SECONDS) {
            map.remove(key);
            return false;
        }
        return false;
    }

    private void recordAttempt(Map<String, AttemptRecord> map, String key, long now) {
        map.compute(key, (k, existing) -> {
            if (existing == null || (now - existing.firstAttemptEpoch() > LOCKOUT_DURATION_SECONDS && existing.lockedUntilEpoch() <= now)) {
                return new AttemptRecord(1, now, 0);
            }
            int newCount = existing.count() + 1;
            long lockedUntil = (newCount >= MAX_ATTEMPTS) ? now + LOCKOUT_DURATION_SECONDS : 0;
            return new AttemptRecord(newCount, existing.firstAttemptEpoch(), lockedUntil);
        });
    }
}
