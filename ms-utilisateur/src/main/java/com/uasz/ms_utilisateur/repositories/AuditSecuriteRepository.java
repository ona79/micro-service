package com.uasz.ms_utilisateur.repositories;

import com.uasz.ms_utilisateur.entities.AuditSecurite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditSecuriteRepository extends JpaRepository<AuditSecurite, Long> {

    List<AuditSecurite> findByUtilisateurIdOrderByTimestampDesc(Long utilisateurId);

    List<AuditSecurite> findByTimestampAfterOrderByTimestampDesc(LocalDateTime since);

    List<AuditSecurite> findByEventTypeOrderByTimestampDesc(String eventType);
}
