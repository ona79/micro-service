package com.uasz.ms_utilisateur.services;

import com.uasz.ms_utilisateur.entities.Permission;
import com.uasz.ms_utilisateur.entities.RolePermission;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import com.uasz.ms_utilisateur.repositories.PermissionRepository;
import com.uasz.ms_utilisateur.repositories.RolePermissionRepository;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import com.uasz.ms_utilisateur.security.AuthSessionManager;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class UtilisateurDataInitializer implements CommandLineRunner {

    private final UtilisateurRepository repository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (permissionRepository.count() == 0) {
            List<Permission> perms = List.of(
                    Permission.builder().code("PATRIMOINE:LIRE").module("PATRIMOINE").description("Consultation des fiches de patrimoine").build(),
                    Permission.builder().code("PATRIMOINE:CREER").module("PATRIMOINE").description("Création d'une nouvelle fiche patrimoniale").build(),
                    Permission.builder().code("PATRIMOINE:MODIFIER").module("PATRIMOINE").description("Modification d'une fiche patrimoniale existante").build(),
                    Permission.builder().code("PATRIMOINE:SUPPRIMER").module("PATRIMOINE").description("Suppression d'une fiche patrimoniale").build(),
                    Permission.builder().code("PATRIMOINE:PUBLIER").module("PATRIMOINE").description("Validation et publication d'une fiche patrimoniale").build(),
                    Permission.builder().code("PATRIMOINE:ARCHIVER").module("PATRIMOINE").description("Archivage d'une fiche patrimoniale").build(),
                    Permission.builder().code("CIRCUIT:LIRE").module("CIRCUIT").description("Consultation des circuits écotouristiques").build(),
                    Permission.builder().code("CIRCUIT:CREER").module("CIRCUIT").description("Création d'un nouveau circuit touristique").build(),
                    Permission.builder().code("CIRCUIT:MODIFIER").module("CIRCUIT").description("Modification d'un circuit touristique existant").build(),
                    Permission.builder().code("CIRCUIT:SUPPRIMER").module("CIRCUIT").description("Suppression d'un circuit touristique").build(),
                    Permission.builder().code("CIRCUIT:PUBLIER").module("CIRCUIT").description("Validation et publication d'un circuit touristique").build(),
                    Permission.builder().code("CIRCUIT:ARCHIVER").module("CIRCUIT").description("Archivage d'un circuit touristique").build(),
                    Permission.builder().code("EVENEMENT:LIRE").module("EVENEMENT").description("Consultation des événements culturels").build(),
                    Permission.builder().code("EVENEMENT:CREER").module("EVENEMENT").description("Création d'un événement culturel").build(),
                    Permission.builder().code("EVENEMENT:MODIFIER").module("EVENEMENT").description("Modification d'un événement culturel").build(),
                    Permission.builder().code("EVENEMENT:SUPPRIMER").module("EVENEMENT").description("Suppression d'un événement culturel").build(),
                    Permission.builder().code("EVENEMENT:PUBLIER").module("EVENEMENT").description("Validation et publication d'un événement culturel").build(),
                    Permission.builder().code("EVENEMENT:ANNULER").module("EVENEMENT").description("Annulation d'un événement culturel").build(),
                    Permission.builder().code("EVENEMENT:ARCHIVER").module("EVENEMENT").description("Archivage d'un événement culturel").build(),
                    Permission.builder().code("RESERVATION:CREER").module("RESERVATION").description("Création d'une réservation touristique").build(),
                    Permission.builder().code("RESERVATION:LIRE_PROPRE").module("RESERVATION").description("Consultation de ses propres réservations").build(),
                    Permission.builder().code("RESERVATION:LIRE_TOUT").module("RESERVATION").description("Consultation globale de toutes les réservations").build(),
                    Permission.builder().code("RESERVATION:ANNULER_PROPRE").module("RESERVATION").description("Annulation de ses propres réservations").build(),
                    Permission.builder().code("RESERVATION:GERER").module("RESERVATION").description("Gestion ou forçage d'une réservation").build(),
                    Permission.builder().code("PAIEMENT:INITIER").module("PAIEMENT").description("Initiation d'un paiement de réservation").build(),
                    Permission.builder().code("PAIEMENT:LIRE_PROPRE").module("PAIEMENT").description("Consultation de ses propres reçus de paiement").build(),
                    Permission.builder().code("PAIEMENT:LIRE_TOUT").module("PAIEMENT").description("Consultation globale des transactions financières").build(),
                    Permission.builder().code("UTILISATEUR:LIRE_PROFIL").module("UTILISATEUR").description("Consultation et modification de son propre profil").build(),
                    Permission.builder().code("UTILISATEUR:LIRE_TOUT").module("UTILISATEUR").description("Consultation de l'annuaire des utilisateurs").build(),
                    Permission.builder().code("UTILISATEUR:CREER_STAFF").module("UTILISATEUR").description("Création de comptes personnel et administrateur").build(),
                    Permission.builder().code("UTILISATEUR:GERER_ROLES").module("UTILISATEUR").description("Attribution et révocation des rôles et statuts").build(),
                    Permission.builder().code("UTILISATEUR:SUPPRIMER").module("UTILISATEUR").description("Suppression d'un compte utilisateur").build(),
                    Permission.builder().code("AUDIT:LIRE").module("AUDIT").description("Consultation des pistes d'audit de sécurité").build()
            );
            permissionRepository.saveAll(perms);
        }

        if (rolePermissionRepository.count() == 0) {
            List<RolePermission> mappings = new ArrayList<>();
            for (RoleUtilisateur role : RoleUtilisateur.values()) {
                for (String code : AuthSessionManager.defaultPermissionsForRole(role)) {
                    mappings.add(RolePermission.builder()
                            .role(role)
                            .permissionCode(code)
                            .build());
                }
            }
            rolePermissionRepository.saveAll(mappings);
        }

        if (repository.count() == 0) {
            repository.saveAll(List.of(
                    Utilisateur.builder()
                            .nom("Faty")
                            .prenom("Lamine")
                            .email("lamine.faty@univ-zig.sn")
                            .motDePasse(passwordEncoder.encode("Admin2026!"))
                            .telephone("+221770000001")
                            .role(RoleUtilisateur.ADMINISTRATEUR)
                            .actif(true)
                            .dateInscription(LocalDateTime.now().minusDays(30))
                            .build(),
                    Utilisateur.builder()
                            .nom("Diop")
                            .prenom("Moussa")
                            .email("moussa.diop@zig.univ.sn")
                            .motDePasse(passwordEncoder.encode("Passer123!"))
                            .telephone("+221771234567")
                            .role(RoleUtilisateur.TOURISTE)
                            .actif(true)
                            .dateInscription(LocalDateTime.now().minusDays(15))
                            .build(),
                    Utilisateur.builder()
                            .nom("Sagna")
                            .prenom("Awa")
                            .email("awa.sagna@zig.univ.sn")
                            .motDePasse(passwordEncoder.encode("Gestion2026!"))
                            .telephone("+221778889900")
                            .role(RoleUtilisateur.GESTIONNAIRE_SITE)
                            .actif(true)
                            .dateInscription(LocalDateTime.now().minusDays(20))
                            .build(),
                    Utilisateur.builder()
                            .nom("Kaboré")
                            .prenom("Fatou")
                            .email("fatou.kabore@zig.univ.sn")
                            .motDePasse(passwordEncoder.encode("Gestion2026!"))
                            .telephone("+221774445566")
                            .role(RoleUtilisateur.CONSERVATEUR)
                            .actif(true)
                            .dateInscription(LocalDateTime.now().minusDays(10))
                            .build(),
                    Utilisateur.builder()
                            .nom("Badji")
                            .prenom("Alassane")
                            .email("alassane.badji@zig.univ.sn")
                            .motDePasse(passwordEncoder.encode("Gestion2026!"))
                            .telephone("+221773332211")
                            .role(RoleUtilisateur.GUIDE)
                            .actif(true)
                            .dateInscription(LocalDateTime.now().minusDays(8))
                            .build()
            ));
        }
    }
}
