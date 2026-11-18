package com.uasz.ms_utilisateur.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Enveloppe de pagination normalisée pour les recherches d'administration et d'audit.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PageResponseDto<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;
}
