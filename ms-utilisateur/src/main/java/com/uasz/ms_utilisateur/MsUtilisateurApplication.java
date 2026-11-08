package com.uasz.ms_utilisateur;

import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.time.LocalDateTime;
import java.util.List;

@SpringBootApplication
public class MsUtilisateurApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsUtilisateurApplication.class, args);
    }

    @Bean
    CommandLineRunner initData(UtilisateurRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                repository.saveAll(List.of(
                        Utilisateur.builder()
                                .nom("Faty")
                                .prenom("Lamine")
                                .email("lamine.faty@univ-zig.sn")
                                .motDePasse("Admin2026!")
                                .telephone("+221770000001")
                                .role(RoleUtilisateur.ADMINISTRATEUR)
                                .actif(true)
                                .dateInscription(LocalDateTime.now())
                                .build(),
                        Utilisateur.builder()
                                .nom("Diop")
                                .prenom("Moussa")
                                .email("moussa.diop@zig.univ.sn")
                                .motDePasse("Passer123!")
                                .telephone("+221771234567")
                                .role(RoleUtilisateur.TOURISTE)
                                .actif(true)
                                .dateInscription(LocalDateTime.now())
                                .build()
                ));
            }
        };
    }
}
