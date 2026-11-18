package com.uasz.ms_paiement.services;

import com.uasz.ms_paiement.entities.DecisionSimulation;
import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Adaptateur de paiement exclusivement simulé pour Wave et Orange Money.
 * Aucun appel vers des API marchandes externes ni transfert financier réel.
 */
@Component
public class SimulatedMobileMoneyProvider {

    public record SimulationResult(StatutPaiement targetStatut, String eventType, String motif) {
    }

    public SimulationResult evaluer(Paiement paiement, DecisionSimulation decision, String customMotif, LocalDateTime now) {
        if (paiement.getModePaiement() != ModePaiement.WAVE && paiement.getModePaiement() != ModePaiement.ORANGE_MONEY) {
            return new SimulationResult(StatutPaiement.REFUSE, "PAIEMENT_REFUSE",
                    "Moyen de paiement non pris en charge en simulation P04.");
        }

        if (paiement.getDateExpiration() != null && paiement.getDateExpiration().isBefore(now)) {
            return new SimulationResult(StatutPaiement.EXPIRE, "PAIEMENT_EXPIRE",
                    "Transaction simulée " + paiement.getModePaiement() + " expirée côté serveur.");
        }

        String channelLabel = paiement.getModePaiement() == ModePaiement.WAVE ? "Wave (Simulé)" : "Orange Money (Simulé)";
        return switch (decision) {
            case ACCEPTER -> new SimulationResult(
                    StatutPaiement.ACCEPTE,
                    "PAIEMENT_ACCEPTE",
                    hasText(customMotif) ? customMotif.trim() : channelLabel + " : acceptation simulée validée.");
            case REFUSER -> new SimulationResult(
                    StatutPaiement.REFUSE,
                    "PAIEMENT_REFUSE",
                    hasText(customMotif) ? customMotif.trim() : channelLabel + " : refus simulé (solde insuffisant ou rejet opérateur simulé).");
            case EXPIRER -> new SimulationResult(
                    StatutPaiement.EXPIRE,
                    "PAIEMENT_EXPIRE",
                    hasText(customMotif) ? customMotif.trim() : channelLabel + " : expiration simulée du délai USSD/QR.");
            case ANNULER -> new SimulationResult(
                    StatutPaiement.ANNULE,
                    "PAIEMENT_ANNULE",
                    hasText(customMotif) ? customMotif.trim() : channelLabel + " : annulation simulée par l'utilisateur.");
        };
    }

    public static String masquerTelephone(String telephone) {
        if (telephone == null || telephone.isBlank()) {
            return null;
        }
        String clean = telephone.replaceAll("\\s+", "");
        if (clean.length() <= 4) {
            return "••••";
        }
        return clean.substring(0, Math.min(4, clean.length() - 4))
                + "••••"
                + clean.substring(clean.length() - 4);
    }

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }
}
