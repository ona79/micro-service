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
            WHERE g.statutValidation = 'VALIDE'
              AND g.visibilitePublique = true
              AND u.actif = true
              AND (:zone IS NULL OR LOWER(g.zonesIntervention) LIKE LOWER(CONCAT('%', :zone, '%')))
              AND (:langue IS NULL OR LOWER(g.languesParlees) LIKE LOWER(CONCAT('%', :langue, '%')))
              AND (:q IS NULL
                   OR LOWER(u.nom) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(u.prenom) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(g.specialites) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(g.presentationCourte) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(g.zonesIntervention) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY g.anneesExperience DESC, g.id ASC
            """)
    List<GuideProfil> searchPublicGuides(
            @Param("zone") String zone,
            @Param("langue") String langue,
            @Param("q") String q
    );

    @Query("""
            SELECT g FROM GuideProfil g
            JOIN FETCH g.utilisateur u
            WHERE (:statut IS NULL OR g.statutValidation = :statut)
            ORDER BY g.updatedAt DESC, g.id DESC
            """)
    List<GuideProfil> findAllAdminFiltered(@Param("statut") StatutValidationGuide statut);
}
