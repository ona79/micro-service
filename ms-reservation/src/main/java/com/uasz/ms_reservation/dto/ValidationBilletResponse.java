package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValidationBilletResponse {
    private boolean valide;
    private String message;
    private BilletDto billet;
}
