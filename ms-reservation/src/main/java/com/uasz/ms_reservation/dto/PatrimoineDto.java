package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatrimoineDto {
    private Long id;
    private String nomPatrimoine;
    private String codePatrimoine;
    private String statutPublication;
}
