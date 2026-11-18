package com.uasz.ms_notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationStatsDto {
    private long total;
    private long enAttente;
    private long envoyees;
    private long echecsTemporaires;
    private long echecsDefinitifs;
    private long nonLuesTotal;
    private Map<String, Long> parStatut;
    private Map<String, Long> parCanal;
    private Map<String, Long> parTypeEvenement;
}
