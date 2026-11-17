package com.uasz.ms_utilisateur.services;

import com.uasz.ms_utilisateur.dto.ConnexionRequest;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;

import java.util.List;

public interface IUtilisateurService {

    UtilisateurDto inscrireUtilisateur(UtilisateurDto utilisateurDto);

    UtilisateurDto creerUtilisateurParAdmin(UtilisateurDto utilisateurDto);

    UtilisateurDto connecterUtilisateur(ConnexionRequest request);

    List<UtilisateurDto> getAllUtilisateurs();

    UtilisateurDto getByIdUtilisateur(Long id);

    UtilisateurDto updateUtilisateur(Long id, UtilisateurDto utilisateurDto, boolean isAdminCaller);

    default UtilisateurDto updateUtilisateur(Long id, UtilisateurDto utilisateurDto) {
        return updateUtilisateur(id, utilisateurDto, true);
    }

    void deleteUtilisateur(Long id);
}
