package com.uasz.ms_utilisateur.repositories;

import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long>, JpaSpecificationExecutor<Utilisateur> {

    Optional<Utilisateur> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByActifTrue();

    long countByRole(RoleUtilisateur role);
}

