package com.uasz.ms_utilisateur.repositories;

import com.uasz.ms_utilisateur.entities.GuideProfil;
import com.uasz.ms_utilisateur.entities.StatutValidationGuide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GuideProfilRepository extends JpaRepository<GuideProfil, Long> {

    Optional<GuideProfil> findByUtilisateurId(Long utilisateurId);

    boolean existsByUtilisateurId(Long utilisateurId);

    @Query("""
            SELECT g FROM GuideProfil g
            JOIN FETCH g.utilisateur u
            WHERE g.statutValidation = com.uasz.ms_utilisateur.entities.StatutValidationGuide.VALIDE
              AND g.visibilitePublique = true
              AND u.actif = true
            ORDER BY g.anneesExperience DESC, g.id ASC
            """)
    List<GuideProfil> findAllPublicActive();

    @Query("""
            SELECT g FROM GuideProfil g
            JOIN FETCH g.utilisateur u
            ORDER BY g.updatedAt DESC, g.id DESC
            """)
    List<GuideProfil> findAllAdminOrderByUpdatedDesc();

    @Query("""
            SELECT g FROM GuideProfil g
            JOIN FETCH g.utilisateur u
            WHERE g.statutValidation = :statut
            ORDER BY g.updatedAt DESC, g.id DESC
            """)
    List<GuideProfil> findByStatutAdminOrderByUpdatedDesc(@Param("statut") StatutValidationGuide statut);

    long countByStatutValidation(StatutValidationGuide statutValidation);

    long countByStatutValidationAndDisponibleTrue(StatutValidationGuide statutValidation);

    long countByStatutValidationAndVisibilitePubliqueTrue(StatutValidationGuide statutValidation);

    /**
     * Recherche publique tolérante aux paramètres absents sans passer de paramètres null
     * à LOWER() côté PostgreSQL 16 (prévention de l'erreur function lower(bytea) does not exist).
     */
    default List<GuideProfil> searchPublicGuides(String zone, String langue, String q) {
        String zoneNorm = zone != null && !zone.isBlank() ? zone.trim().toLowerCase() : null;
        String langueNorm = langue != null && !langue.isBlank() ? langue.trim().toLowerCase() : null;
        String qNorm = q != null && !q.isBlank() ? q.trim().toLowerCase() : null;
        return findAllPublicActive().stream()
                .filter(g -> zoneNorm == null || containsIgnoreCase(g.getZonesIntervention(), zoneNorm))
                .filter(g -> langueNorm == null || containsIgnoreCase(g.getLanguesParlees(), langueNorm))
                .filter(g -> qNorm == null
                        || containsIgnoreCase(g.getUtilisateur() != null ? g.getUtilisateur().getNom() : null, qNorm)
                        || containsIgnoreCase(g.getUtilisateur() != null ? g.getUtilisateur().getPrenom() : null, qNorm)
                        || containsIgnoreCase(g.getSpecialites(), qNorm)
                        || containsIgnoreCase(g.getPresentationCourte(), qNorm)
                        || containsIgnoreCase(g.getZonesIntervention(), qNorm))
                .toList();
    }

    default List<GuideProfil> findAllAdminFiltered(StatutValidationGuide statut) {
        return statut == null ? findAllAdminOrderByUpdatedDesc() : findByStatutAdminOrderByUpdatedDesc(statut);
    }

    private static boolean containsIgnoreCase(String value, String needleLower) {
        return value != null && value.toLowerCase().contains(needleLower);
    }
}
