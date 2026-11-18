package com.uasz.ms_utilisateur.services;

import com.uasz.ms_utilisateur.dto.GuideHistoriqueDto;
import com.uasz.ms_utilisateur.dto.GuideProfilDto;
import com.uasz.ms_utilisateur.dto.GuideSelfUpdateRequest;
import com.uasz.ms_utilisateur.dto.GuideStatsDto;
import com.uasz.ms_utilisateur.dto.GuideVerificationDto;
import com.uasz.ms_utilisateur.entities.StatutValidationGuide;

import java.util.List;

public interface IGuideService {

    List<GuideProfilDto> getPublicGuides(String zone, String langue, String q);

    GuideProfilDto getGuideById(Long id);

    GuideProfilDto getGuideByUtilisateurId(Long utilisateurId);

    GuideProfilDto getMonProfil();

    GuideProfilDto upsertMonProfil(GuideSelfUpdateRequest request);

    GuideProfilDto soumettreMonProfil();

    GuideProfilDto changerMaDisponibilite(boolean disponible, Boolean visibilitePublique);

    GuideProfilDto desactiverMonProfil(String motif);

    List<GuideProfilDto> getAllAdmin(StatutValidationGuide statut);

    GuideStatsDto getStatistiques();

    List<GuideHistoriqueDto> getHistorique(Long guideId);

    GuideProfilDto validerProfil(Long guideId, String motif);

    GuideProfilDto rejeterProfil(Long guideId, String motif);

    GuideProfilDto suspendreProfil(Long guideId, String motif);

    GuideProfilDto reactiverProfil(Long guideId, String motif);

    GuideProfilDto desactiverProfilParAdmin(Long guideId, String motif);

    GuideVerificationDto verifierGuidePourCircuit(Long utilisateurId);
}
