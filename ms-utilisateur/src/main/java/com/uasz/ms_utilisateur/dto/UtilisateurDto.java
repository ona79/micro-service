package com.uasz.ms_utilisateur.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UtilisateurDto {

    private Long id;

    @NotBlank(message = "Le nom est obligatoire")
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    private String prenom;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Format d'email invalide")
    private String email;

    /** Accepté en écriture (JSON d'entrée) mais jamais exposé en lecture */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String motDePasse;

    private String telephone;

    private RoleUtilisateur role;

    private boolean actif;

    private LocalDateTime dateInscription;
}

