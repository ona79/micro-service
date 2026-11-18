package com.uasz.ms_notification.security;

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
        this(userId, role, email, serviceCall, serviceName, Set.copyOf(defaultPermissionsForRole(role)));
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
        return Set.copyOf(defaultPermissionsForRole(role));
    }

    public static List<String> defaultPermissionsForRole(String role) {
        if (role == null) return List.of();
        return switch (role) {
            case "TOURISTE" -> List.of(
                    "PATRIMOINE:LIRE", "CIRCUIT:LIRE", "EVENEMENT:LIRE",
                    "RESERVATION:CREER", "RESERVATION:LIRE_PROPRE", "RESERVATION:ANNULER_PROPRE",
                    "PAIEMENT:INITIER", "PAIEMENT:LIRE_PROPRE", "UTILISATEUR:LIRE_PROFIL",
                    "GUIDE:LIRE", "AVIS:LIRE", "AVIS:CREER", "AVIS:MODIFIER_PROPRE", "AVIS:SUPPRIMER_PROPRE", "AVIS:SIGNALER",
                    "NOTIFICATION:LIRE_PROPRE", "NOTIFICATION:GERER_PROPRE"
            );
            case "GUIDE" -> List.of(
                    "PATRIMOINE:LIRE", "CIRCUIT:LIRE", "CIRCUIT:MODIFIER",
                    "EVENEMENT:LIRE", "RESERVATION:LIRE_PROPRE", "UTILISATEUR:LIRE_PROFIL",
                    "GUIDE:LIRE", "GUIDE:GERER_PROPRE_PROFIL",
                    "AVIS:LIRE", "AVIS:SIGNALER",
                    "NOTIFICATION:LIRE_PROPRE", "NOTIFICATION:GERER_PROPRE"
            );
            case "CONSERVATEUR" -> List.of(
                    "PATRIMOINE:LIRE", "PATRIMOINE:CREER", "PATRIMOINE:MODIFIER", "PATRIMOINE:SUPPRIMER",
                    "PATRIMOINE:PUBLIER", "PATRIMOINE:ARCHIVER",
                    "CIRCUIT:LIRE", "EVENEMENT:LIRE", "UTILISATEUR:LIRE_PROFIL",
                    "GUIDE:LIRE", "AVIS:LIRE", "AVIS:SIGNALER",
                    "NOTIFICATION:LIRE_PROPRE", "NOTIFICATION:GERER_PROPRE"
            );
            case "GESTIONNAIRE_SITE" -> List.of(
                    "PATRIMOINE:LIRE",
                    "CIRCUIT:LIRE", "CIRCUIT:CREER", "CIRCUIT:MODIFIER", "CIRCUIT:SUPPRIMER",
                    "CIRCUIT:PUBLIER", "CIRCUIT:ARCHIVER",
                    "EVENEMENT:LIRE", "EVENEMENT:CREER", "EVENEMENT:MODIFIER", "EVENEMENT:SUPPRIMER",
                    "EVENEMENT:PUBLIER", "EVENEMENT:ANNULER", "EVENEMENT:ARCHIVER",
                    "RESERVATION:LIRE_TOUT", "RESERVATION:GERER", "UTILISATEUR:LIRE_PROFIL",
                    "GUIDE:LIRE", "GUIDE:VALIDER", "GUIDE:SUSPENDRE",
                    "AVIS:LIRE", "AVIS:SIGNALER", "AVIS:MODERER",
                    "NOTIFICATION:LIRE_PROPRE", "NOTIFICATION:GERER_PROPRE"
            );
            case "ADMINISTRATEUR" -> List.of(
                    "PATRIMOINE:LIRE", "PATRIMOINE:CREER", "PATRIMOINE:MODIFIER", "PATRIMOINE:SUPPRIMER",
                    "PATRIMOINE:PUBLIER", "PATRIMOINE:ARCHIVER",
                    "CIRCUIT:LIRE", "CIRCUIT:CREER", "CIRCUIT:MODIFIER", "CIRCUIT:SUPPRIMER",
                    "CIRCUIT:PUBLIER", "CIRCUIT:ARCHIVER",
                    "EVENEMENT:LIRE", "EVENEMENT:CREER", "EVENEMENT:MODIFIER", "EVENEMENT:SUPPRIMER",
                    "EVENEMENT:PUBLIER", "EVENEMENT:ANNULER", "EVENEMENT:ARCHIVER",
                    "RESERVATION:CREER", "RESERVATION:LIRE_PROPRE", "RESERVATION:LIRE_TOUT",
                    "RESERVATION:ANNULER_PROPRE", "RESERVATION:GERER",
                    "PAIEMENT:INITIER", "PAIEMENT:LIRE_PROPRE", "PAIEMENT:LIRE_TOUT", "PAIEMENT:REMBOURSER",
                    "UTILISATEUR:LIRE_PROFIL", "UTILISATEUR:LIRE_TOUT", "UTILISATEUR:CREER_STAFF",
                    "UTILISATEUR:GERER_ROLES", "UTILISATEUR:SUPPRIMER", "AUDIT:LIRE",
                    "GUIDE:LIRE", "GUIDE:VALIDER", "GUIDE:SUSPENDRE",
                    "AVIS:LIRE", "AVIS:CREER", "AVIS:MODIFIER_PROPRE", "AVIS:SUPPRIMER_PROPRE", "AVIS:SIGNALER", "AVIS:MODERER",
                    "NOTIFICATION:LIRE_PROPRE", "NOTIFICATION:GERER_PROPRE", "NOTIFICATION:LIRE_TOUT", "NOTIFICATION:RELANCER"
            );
            default -> List.of();
        };
    }
}
