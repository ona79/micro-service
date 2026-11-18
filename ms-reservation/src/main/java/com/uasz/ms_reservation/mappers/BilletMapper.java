package com.uasz.ms_reservation.mappers;

import com.uasz.ms_reservation.dto.BilletDto;
import com.uasz.ms_reservation.entities.Billet;
import com.uasz.ms_reservation.entities.Reservation;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
public class BilletMapper {

    public BilletDto toDto(Billet billet) {
        if (billet == null) {
            return null;
        }
        Reservation res = billet.getReservation();
        return BilletDto.builder()
                .id(billet.getId())
                .reservationId(res != null ? res.getId() : null)
                .referenceReservation(res != null ? res.getReferenceReservation() : null)
                .numeroBillet(billet.getNumeroBillet())
                .tokenQr(billet.getTokenQr())
                .nomBeneficiaire(billet.getNomBeneficiaire())
                .statut(billet.getStatut())
                .dateUtilisation(billet.getDateUtilisation())
                .validePar(billet.getValidePar())
                .createdAt(billet.getCreatedAt())
                .typeReservation(res != null ? res.getTypeReservation() : null)
                .prestationId(res != null ? res.resolvePrestationId() : null)
                .nomPrestation(res != null ? (res.getCommentaire() != null ? res.getCommentaire() : res.getTypeReservation() + " #" + res.resolvePrestationId()) : null)
                .datePrestation(res != null ? res.getDatePrestation() : null)
                .creneauPrestation(res != null ? res.getCreneauPrestation() : null)
                .prixUnitaire(res != null ? res.getPrixUnitaire() : null)
                .devise(res != null ? res.getDevise() : "XOF")
                .nomClient(res != null ? res.getNomClient() : null)
                .emailClient(res != null ? res.getEmailClient() : null)
                .telephoneClient(res != null ? res.getTelephoneClient() : null)
                .build();
    }

    public List<BilletDto> toDtoList(List<Billet> billets) {
        if (billets == null || billets.isEmpty()) {
            return Collections.emptyList();
        }
        return billets.stream().map(this::toDto).toList();
    }
}
