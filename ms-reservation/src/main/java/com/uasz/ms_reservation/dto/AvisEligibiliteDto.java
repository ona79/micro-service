package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.CibleAvis;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvisEligibiliteDto {
    private CibleAvis cibleType;
    private Long cibleId;
    private boolean eligible;
    private boolean dejaEvalue;
    private List<Long> reservationsEligiblesIds;
    private String motifIneligibilite;
}
