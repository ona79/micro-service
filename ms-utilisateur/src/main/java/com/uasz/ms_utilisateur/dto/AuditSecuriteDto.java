package com.uasz.ms_utilisateur.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditSecuriteDto {
    private Long id;
    private LocalDateTime timestamp;
    private String eventType;
    private Long utilisateurId;
    private String email;
    private String ipAddress;
    private String details;
    private String status;
}
