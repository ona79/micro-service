package com.uasz.ms_paiement.security;

public record SecurityUserContext(
        Long userId,
        String role,
        String email,
        boolean isServiceCall,
        String serviceName
) {
    public boolean isStaffOrAdmin() {
        return "ADMINISTRATEUR".equals(role) || "GESTIONNAIRE_SITE".equals(role);
    }
}
