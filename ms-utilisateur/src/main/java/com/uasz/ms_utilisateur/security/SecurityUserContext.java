package com.uasz.ms_utilisateur.security;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public record SecurityUserContext(
        Long userId,
        String role,
        String email,
        boolean serviceCall,
        String serviceName,
        Set<String> permissions
) {
    public SecurityUserContext(Long userId, String role, String email, boolean serviceCall, String serviceName) {
        this(userId, role, email, serviceCall, serviceName, Set.copyOf(AuthSessionManager.defaultPermissionsForRole(
                parseRole(role))));
    }

    public boolean isAdmin() {
        return "ADMINISTRATEUR".equals(role);
    }

    public boolean hasPermission(String permission) {
        if (permission == null || permission.isBlank()) {
            return false;
        }
        if (isAdmin()) {
            return true;
        }
        return permissions != null && permissions.contains(permission);
    }

    public static Set<String> parsePermissions(String header, String role) {
        if (header != null && !header.isBlank()) {
            return Arrays.stream(header.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toUnmodifiableSet());
        }
        return Set.copyOf(AuthSessionManager.defaultPermissionsForRole(parseRole(role)));
    }

    private static com.uasz.ms_utilisateur.entities.RoleUtilisateur parseRole(String role) {
        if (role == null || role.isBlank() || "PUBLIC".equals(role) || "SYSTEM".equals(role)) {
            return null;
        }
        try {
            return com.uasz.ms_utilisateur.entities.RoleUtilisateur.valueOf(role.trim());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
