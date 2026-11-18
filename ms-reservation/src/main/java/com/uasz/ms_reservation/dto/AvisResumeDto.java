package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.CibleAvis;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvisResumeDto {
    private CibleAvis cibleType;
    private Long cibleId;
    private double noteMoyenne;
    private long totalAvis;
    private Map<Integer, Long> repartition;
}
