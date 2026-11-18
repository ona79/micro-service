package com.uasz.ms_reservation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParticipantDto {

    private Long id;

    @NotBlank(message = "Le nom complet du participant est obligatoire")
    @Size(max = 150, message = "Le nom du participant ne doit pas dépasser 150 caractères")
    private String nomComplet;

    @Email(message = "Format d'email participant invalide")
    @Size(max = 255)
    private String email;

    @Size(max = 50)
    private String telephone;

    @Size(max = 30)
    @Builder.Default
    private String categorie = "ADULTE";
}
