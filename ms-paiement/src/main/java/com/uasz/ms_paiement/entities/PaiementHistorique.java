package com.uasz.ms_paiement.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Table(name = "paiement_historique")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaiementHistorique {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "paiement_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Paiement paiement;

    @Enumerated(EnumType.STRING)
    @Column(name = "ancien_statut", length = 40)
    private StatutPaiement ancienStatut;

    @Enumerated(EnumType.STRING)
    @Column(name = "nouveau_statut", nullable = false, length = 40)
    private StatutPaiement nouveauStatut;

    @Column(name = "acteur_id")
    private Long acteurId;

    @Column(name = "acteur_role", length = 50)
    private String acteurRole;

    @Column(name = "acteur_type", nullable = false, length = 30)
    private String acteurType;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "motif", length = 500)
    private String motif;

    @Column(name = "date_transition", nullable = false)
    private LocalDateTime dateTransition;

    @PrePersist
    public void onPrePersist() {
        if (this.dateTransition == null) {
            this.dateTransition = LocalDateTime.now(Paiement.CASAMANCE_ZONE);
        }
    }
}
