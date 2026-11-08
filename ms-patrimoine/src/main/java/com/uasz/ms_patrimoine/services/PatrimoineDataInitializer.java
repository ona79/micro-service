package com.uasz.ms_patrimoine.services;

import com.uasz.ms_patrimoine.entities.Patrimoine;
import com.uasz.ms_patrimoine.repositories.PatrimoineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class PatrimoineDataInitializer implements CommandLineRunner {

    private final PatrimoineRepository repository;

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            repository.saveAll(List.of(
                    Patrimoine.builder()
                            .nomPatrimoine("Maison des Esclaves de Gorée")
                            .codePatrimoine("PAT-DKR-001")
                            .descriptionPatrimoine("Monument historique emblématique situé sur l'île de Gorée.")
                            .historiquePatrimoine("Édifiée vers 1776, inscrite au patrimoine mondial de l'UNESCO en 1978.")
                            .adressePatrimoine("Île de Gorée, Dakar")
                            .capacitePatrimoine(150)
                            .latitudePatrimoine(14.6672f)
                            .longitudePatrimoine(-17.3990f)
                            .build(),
                    Patrimoine.builder()
                            .nomPatrimoine("Monument de la Renaissance Africaine")
                            .codePatrimoine("PAT-DKR-002")
                            .descriptionPatrimoine("Statue monumentale en bronze de 52 mètres dominant Dakar.")
                            .historiquePatrimoine("Inauguré le 3 avril 2010 lors du cinquantenaire de l'indépendance.")
                            .adressePatrimoine("Collines des Mamelles, Ouakam, Dakar")
                            .capacitePatrimoine(500)
                            .latitudePatrimoine(14.7222f)
                            .longitudePatrimoine(-17.4950f)
                            .build(),
                    Patrimoine.builder()
                            .nomPatrimoine("Cathédrale Saint-Antoine de Padoue")
                            .codePatrimoine("PAT-ZIG-003")
                            .descriptionPatrimoine("Édifice religieux et patrimonial majeur de la Casamance.")
                            .historiquePatrimoine("Construite au coeur de Ziguinchor à l'époque coloniale.")
                            .adressePatrimoine("Centre-ville, Ziguinchor")
                            .capacitePatrimoine(300)
                            .latitudePatrimoine(12.5833f)
                            .longitudePatrimoine(-16.2719f)
                            .build()
            ));
        }
    }
}

