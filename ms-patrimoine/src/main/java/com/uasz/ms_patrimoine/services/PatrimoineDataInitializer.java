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
                            .descriptionPatrimoine("Monument historique emblématique situé sur l'île de Gorée, dédié à la mémoire de la traite atlantique et célèbre pour sa Porte du voyage sans retour.")
                            .historiquePatrimoine("Édifiée vers 1776 sur l'île de Gorée et sauvegardée sous l'impulsion du conservateur Boubacar Joseph Ndiaye, elle figure au patrimoine mondial de l'UNESCO depuis 1978.")
                            .adressePatrimoine("Île de Gorée, Dakar")
                            .capacitePatrimoine(150)
                            .latitudePatrimoine(14.6672f)
                            .longitudePatrimoine(-17.3990f)
                            .build(),
                    Patrimoine.builder()
                            .nomPatrimoine("Monument de la Renaissance Africaine")
                            .codePatrimoine("PAT-DKR-002")
                            .descriptionPatrimoine("Statue monumentale en bronze de 52 mètres dominant la presqu'île du Cap-Vert depuis les collines jumelles des Mamelles à Ouakam.")
                            .historiquePatrimoine("Inauguré le 3 avril 2010 lors du cinquantenaire de l'indépendance du Sénégal, il abrite un musée panoramique retraçant l'histoire des arts et civilisations d'Afrique.")
                            .adressePatrimoine("Collines des Mamelles, Ouakam, Dakar")
                            .capacitePatrimoine(500)
                            .latitudePatrimoine(14.7222f)
                            .longitudePatrimoine(-17.4950f)
                            .build(),
                    Patrimoine.builder()
                            .nomPatrimoine("Cathédrale Saint-Antoine de Padoue")
                            .codePatrimoine("PAT-ZIG-003")
                            .descriptionPatrimoine("Édifice religieux et patrimonial majeur de la Casamance, reconnaissable à ses arches ocres et son architecture soudano-coloniale.")
                            .historiquePatrimoine("Érigée au cœur historique de Ziguinchor à proximité des berges du fleuve Casamance, elle témoigne de l'histoire urbaine et culturelle du sud du Sénégal.")
                            .adressePatrimoine("Centre-ville, Ziguinchor")
                            .capacitePatrimoine(300)
                            .latitudePatrimoine(12.5833f)
                            .longitudePatrimoine(-16.2719f)
                            .build(),
                    Patrimoine.builder()
                            .nomPatrimoine("Pont Faidherbe et Île de Saint-Louis")
                            .codePatrimoine("PAT-SLN-004")
                            .descriptionPatrimoine("Ouvrage d'art métallique de 507 mètres franchissant le fleuve Sénégal pour relier l'île historique de Ndar au continent.")
                            .historiquePatrimoine("Inauguré en 1897 et restauré à l'identique en 2011, le pont Faidherbe est la porte d'entrée de l'île de Saint-Louis, classée au patrimoine mondial de l'UNESCO en l'an 2000.")
                            .adressePatrimoine("Île de Ndar, Saint-Louis")
                            .capacitePatrimoine(400)
                            .latitudePatrimoine(16.0278f)
                            .longitudePatrimoine(-16.5031f)
                            .build(),
                    Patrimoine.builder()
                            .nomPatrimoine("Cases à Impluvium et Fromager d'Enampore")
                            .codePatrimoine("PAT-CAS-005")
                            .descriptionPatrimoine("Architecture traditionnelle diola en banco et chaume dotée d'une toiture annulaire recueillant les eaux de pluie au centre de l'habitat.")
                            .historiquePatrimoine("Perpétuée depuis plusieurs siècles en Basse-Casamance autour des grands fromagers sacrés, cette ingénierie vernaculaire incarne l'harmonie bioclimatique et communautaire du pays diola.")
                            .adressePatrimoine("Enampore, Basse-Casamance, Ziguinchor")
                            .capacitePatrimoine(120)
                            .latitudePatrimoine(12.5014f)
                            .longitudePatrimoine(-16.4389f)
                            .build(),
                    Patrimoine.builder()
                            .nomPatrimoine("Musée Théodore-Monod d'Art Africain (IFAN)")
                            .codePatrimoine("PAT-DKR-006")
                            .descriptionPatrimoine("L'un des plus anciens musées d'art et d'ethnographie d'Afrique de l'Ouest, conservant plus de 9 000 pièces patrimoniales.")
                            .historiquePatrimoine("Fondé en 1936 au sein de l'Institut Fondamental d'Afrique Noire (UCAD) sur la place Soweto à Dakar, il est un lieu phare de la Biennale de l'Art Africain Contemporain (Dak'Art).")
                            .adressePatrimoine("Place Soweto, Plateau, Dakar")
                            .capacitePatrimoine(250)
                            .latitudePatrimoine(14.6653f)
                            .longitudePatrimoine(-17.4367f)
                            .build()
            ));
        }
    }
}
