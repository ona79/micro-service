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
                            .nomPatrimoine("Mémorial de la Tragédie du Joola")
                            .codePatrimoine("PAT-ZIG-001")
                            .descriptionPatrimoine("Monument national et sanctuaire de mémoire érigé sur les berges du fleuve Casamance à Ziguinchor, dédié aux disparus du 26 septembre 2002.")
                            .historiquePatrimoine("Inauguré en janvier 2024 à Ziguinchor, ce haut lieu de mémoire rassemble les archives, objets mémoriels et récits de la plus grande tragédie maritime sénégalaise reliant la Casamance au reste du pays.")
                            .adressePatrimoine("Esplanade du Fleuve Casamance, Boucotte, Ziguinchor")
                            .capacitePatrimoine(250)
                            .latitudePatrimoine(12.5833f)
                            .longitudePatrimoine(-16.2719f)
                            .build(),
                    Patrimoine.builder()
                            .nomPatrimoine("Île et Ancien Comptoir de Carabane")
                            .codePatrimoine("PAT-CRB-002")
                            .descriptionPatrimoine("Île historique piétonne à l'embouchure du fleuve Casamance, abritant l'ancienne église de mission de 1885 et le cimetière du Capitaine Protet.")
                            .historiquePatrimoine("Premier comptoir commercial français en Casamance fondé en 1836, Carabane fut la première capitale administrative de la région avant d'être supplantée par Ziguinchor en 1904.")
                            .adressePatrimoine("Île de Carabane, Embouchure du Fleuve Casamance, Oussouye")
                            .capacitePatrimoine(200)
                            .latitudePatrimoine(12.5358f)
                            .longitudePatrimoine(-16.6978f)
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
                            .nomPatrimoine("Sanctuaire Royal et Bois Sacré d'Oussouye")
                            .codePatrimoine("PAT-OSS-004")
                            .descriptionPatrimoine("Résidence du Roi traditionnel d'Oussouye (Maan Sibilumbaye) et haut lieu des traditions animistes, de la royauté sacrée diola et des fêtes agraires (Humabeul).")
                            .historiquePatrimoine("Centre spirituel et régulateur de paix de la royauté du Kasa en Basse-Casamance, garant des rites agraires, du culte des ancêtres et de l'harmonie sociale entre les villages.")
                            .adressePatrimoine("Quartier Royal, Oussouye, Basse-Casamance")
                            .capacitePatrimoine(350)
                            .latitudePatrimoine(12.4850f)
                            .longitudePatrimoine(-16.5460f)
                            .build(),
                    Patrimoine.builder()
                            .nomPatrimoine("Cases à Impluvium et Fromagers Sacrés d'Enampore")
                            .codePatrimoine("PAT-CAS-005")
                            .descriptionPatrimoine("Architecture traditionnelle diola en banco et chaume dotée d'une toiture annulaire recueillant les eaux de pluie au centre de l'habitat communautaire.")
                            .historiquePatrimoine("Perpétuée depuis plusieurs siècles en Basse-Casamance autour des grands fromagers sacrés, cette ingénierie vernaculaire incarne l'harmonie bioclimatique et communautaire du pays Bandial.")
                            .adressePatrimoine("Enampore, Royaume Bandial, Basse-Casamance")
                            .capacitePatrimoine(120)
                            .latitudePatrimoine(12.5014f)
                            .longitudePatrimoine(-16.4389f)
                            .build(),
                    Patrimoine.builder()
                            .nomPatrimoine("Fort Pinet-Laprade et Tata Historique de Sédhiou")
                            .codePatrimoine("PAT-SED-006")
                            .descriptionPatrimoine("Fortification historique de Moyenne-Casamance dominant le fleuve, vestige des résistances mandingues et des batailles de Fodé Kaba Doumbouya.")
                            .historiquePatrimoine("Construit sur les berges du fleuve Casamance au XIXe siècle, Sédhiou fut un carrefour commercial et stratégique majeur du royaume mandingue du Pakao et de la Moyenne-Casamance.")
                            .adressePatrimoine("Quartier Escale, Berges du Fleuve, Sédhiou, Moyenne-Casamance")
                            .capacitePatrimoine(180)
                            .latitudePatrimoine(12.7081f)
                            .longitudePatrimoine(-15.5569f)
                            .build()
            ));
        }
    }
}
