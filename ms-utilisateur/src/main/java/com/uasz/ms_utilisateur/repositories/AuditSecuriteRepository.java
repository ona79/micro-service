package com.uasz.ms_utilisateur.repositories;

import com.uasz.ms_utilisateur.entities.AuditSecurite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditSecuriteRepository extends JpaRepository<AuditSecurite, Long>, JpaSpecificationExecutor<AuditSecurite> {

    List<AuditSecurite> findByUtilisateurIdOrderByTimestampDesc(Long utilisateurId);

    List<AuditSecurite> findByTimestampAfterOrderByTimestampDesc(LocalDateTime since);

    List<AuditSecurite> findByEventTypeOrderByTimestampDesc(String eventType);

    long countByStatusAndTimestampAfter(String status, LocalDateTime since);

    long countByEventTypeAndTimestampAfter(String eventType, LocalDateTime since);
}
