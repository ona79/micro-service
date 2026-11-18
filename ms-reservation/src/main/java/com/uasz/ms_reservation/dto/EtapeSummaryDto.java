package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EtapeSummaryDto {
    private int ordre;
    private int dureeVisite;
    private Long patrimoineId;
}
