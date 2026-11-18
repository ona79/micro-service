package com.uasz.ms_utilisateur.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UtilisateurStatsDto {
    private long total;
    private long actifs;
    private long inactifs;
    private Map<String, Long> parRole;
    private long auditLogsTotal;
    private long alertesSecurite24h;
    private long echecsConnexion24h;
}
