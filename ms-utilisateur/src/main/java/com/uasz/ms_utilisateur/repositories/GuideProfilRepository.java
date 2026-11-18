package com.uasz.ms_utilisateur.repositories;

import com.uasz.ms_utilisateur.entities.GuideProfil;
import com.uasz.ms_utilisateur.entities.StatutValidationGuide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Locale;
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

    /**
     * Recherche publique tolérante aux paramètres absents sans passer de paramètres null
     * à LOWER() côté PostgreSQL 16 (prévention de l'erreur function lower(bytea) does not exist).
     */
    default List<GuideProfil> searchPublicGuides(String zone, String langue, String q) {
        String z = zone != null ? zone.trim().toLowerCase(Locale.ROOT) : "";
        String l = langue != null ? langue.trim().toLowerCase(Locale.ROOT) : "";
        String query = q != null ? q.trim().toLowerCase(Locale.ROOT) : "";
        if (z.isEmpty() && l.isEmpty() && query.isEmpty()) {
            return findAllPublicActive();
        }
        return findAllPublicActive().stream()
                .filter(g -> z.isEmpty() || containsIgnoreCase(g.getZonesIntervention(), z))
                .filter(g -> l.isEmpty() || containsIgnoreCase(g.getLanguesParlees(), l))
                .filter(g -> query.isEmpty()
                        || (g.getUtilisateur() != null && (
                        containsIgnoreCase(g.getUtilisateur().getNom(), query)
                                || containsIgnoreCase(g.getUtilisateur().getPrenom(), query)))
                        || containsIgnoreCase(g.getSpecialites(), query)
                        || containsIgnoreCase(g.getPresentationCourte(), query)
                        || containsIgnoreCase(g.getZonesIntervention(), query))
                .toList();
    }

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

    default List<GuideProfil> findAllAdminFiltered(StatutValidationGuide statut) {
        return statut == null ? findAllAdminOrderByUpdatedDesc() : findByStatutAdminOrderByUpdatedDesc(statut);
    }

    long countByStatutValidation(StatutValidationGuide statutValidation);

    long countByStatutValidationAndDisponibleTrue(StatutValidationGuide statutValidation);

    long countByStatutValidationAndVisibilitePubliqueTrue(StatutValidationGuide statutValidation);

    private static boolean containsIgnoreCase(String value, String needleLower) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needleLower);
    }
}
