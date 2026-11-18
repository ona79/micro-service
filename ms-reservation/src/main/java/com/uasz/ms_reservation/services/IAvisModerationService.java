package com.uasz.ms_reservation.services;

import com.uasz.ms_reservation.dto.AvisCreateRequest;
import com.uasz.ms_reservation.dto.AvisDto;
import com.uasz.ms_reservation.dto.AvisEligibiliteDto;
import com.uasz.ms_reservation.dto.AvisModerationHistoriqueDto;
import com.uasz.ms_reservation.dto.AvisResumeDto;
import com.uasz.ms_reservation.dto.AvisUpdateRequest;
import com.uasz.ms_reservation.dto.ModerationDecisionRequest;
import com.uasz.ms_reservation.dto.PageResponseDto;
import com.uasz.ms_reservation.dto.SignalementCreateRequest;
import com.uasz.ms_reservation.dto.SignalementDecisionRequest;
import com.uasz.ms_reservation.dto.SignalementDto;
import com.uasz.ms_reservation.entities.CibleAvis;
import com.uasz.ms_reservation.entities.StatutModerationAvis;
import com.uasz.ms_reservation.entities.StatutSignalement;

import java.util.List;

public interface IAvisModerationService {

    PageResponseDto<AvisDto> getAvisPublics(CibleAvis cibleType, Long cibleId, int page, int size);

    AvisResumeDto getResumeEvaluations(CibleAvis cibleType, Long cibleId);

    List<AvisResumeDto> getResumesBatch(CibleAvis cibleType, List<Long> cibleIds);

    AvisEligibiliteDto verifierEligibilite(CibleAvis cibleType, Long cibleId);

    List<AvisDto> getMesAvis();

    AvisDto creerAvis(AvisCreateRequest request);

    AvisDto modifierAvis(Long id, AvisUpdateRequest request);

    void supprimerAvis(Long id);

    SignalementDto signalerAvis(Long avisId, SignalementCreateRequest request);

    List<AvisDto> getAvisModeration(CibleAvis cibleType, StatutModerationAvis statut);

    List<SignalementDto> getSignalementsModeration(StatutSignalement statut);

    List<AvisModerationHistoriqueDto> getHistoriqueModeration(Long avisId);

    AvisDto deciderModerationAvis(Long avisId, ModerationDecisionRequest request);

    SignalementDto traiterSignalement(Long signalementId, SignalementDecisionRequest request);
}
