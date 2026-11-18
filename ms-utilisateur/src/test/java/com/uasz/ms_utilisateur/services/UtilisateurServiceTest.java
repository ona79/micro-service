package com.uasz.ms_utilisateur.services;

import com.uasz.ms_utilisateur.dto.ConnexionRequest;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import com.uasz.ms_utilisateur.exceptions.BadRequestException;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.mappers.UtilisateurMapper;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UtilisateurServiceTest {

    @Mock
    private UtilisateurRepository utilisateurRepository;

    private final UtilisateurMapper utilisateurMapper = Mappers.getMapper(UtilisateurMapper.class);
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private UtilisateurService utilisateurService;

    @BeforeEach
    void setUp() {
        utilisateurService = new UtilisateurService(utilisateurRepository, utilisateurMapper, passwordEncoder);
    }

    @Test
    void inscrireUtilisateur_forceRoleTouristeMemeSiAdminTransmisEtHacheMotDePasse() {
        when(utilisateurRepository.existsByEmail("aminata@uasz.sn")).thenReturn(false);
        when(utilisateurRepository.save(any(Utilisateur.class))).thenAnswer(inv -> {
            Utilisateur u = inv.getArgument(0);
            assertThat(u.getMotDePasse()).isNotEqualTo("Secret123!");
            assertThat(passwordEncoder.matches("Secret123!", u.getMotDePasse())).isTrue();
            u.setId(5L);
            return u;
        });

        // Tente d'envoyer ADMINISTRATEUR lors d'une inscription publique
        UtilisateurDto input = new UtilisateurDto(null, "Diallo", "Aminata", "aminata@uasz.sn",
                "Secret123!", "+221770000000", RoleUtilisateur.ADMINISTRATEUR, false, null);

        UtilisateurDto saved = utilisateurService.inscrireUtilisateur(input);

        assertThat(saved.getId()).isEqualTo(5L);
        assertThat(saved.getRole()).isEqualTo(RoleUtilisateur.TOURISTE);
        assertThat(saved.isActif()).isTrue();
        assertThat(saved.getMotDePasse()).isNull();
    }

    @Test
    void inscrireUtilisateur_emailDoublon_leveBadRequest() {
        when(utilisateurRepository.existsByEmail("aminata@uasz.sn")).thenReturn(true);

        UtilisateurDto input = new UtilisateurDto(null, "Diallo", "Aminata", "aminata@uasz.sn",
                "Secret123!", null, null, true, null);

        assertThatThrownBy(() -> utilisateurService.inscrireUtilisateur(input))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("aminata@uasz.sn");
    }

    @Test
    void connecterUtilisateur_identifiantsValides_retourneDtoSansMotDePasse() {
        Utilisateur entity = Utilisateur.builder()
                .id(1L).nom("Diop").prenom("Moussa").email("moussa@uasz.sn")
                .motDePasse(passwordEncoder.encode("Passer123!")).role(RoleUtilisateur.TOURISTE).actif(true)
                .build();
        when(utilisateurRepository.findByEmail("moussa@uasz.sn")).thenReturn(Optional.of(entity));

        UtilisateurDto connected = utilisateurService.connecterUtilisateur(
                new ConnexionRequest("moussa@uasz.sn", "Passer123!")
        );

        assertThat(connected.getEmail()).isEqualTo("moussa@uasz.sn");
        assertThat(connected.getMotDePasse()).isNull();
    }

    @Test
    void connecterUtilisateur_mauvaisMotDePasse_leveUnauthorized() {
        Utilisateur entity = Utilisateur.builder()
                .id(1L).email("moussa@uasz.sn").motDePasse(passwordEncoder.encode("Passer123!")).actif(true).build();
        when(utilisateurRepository.findByEmail("moussa@uasz.sn")).thenReturn(Optional.of(entity));

        assertThatThrownBy(() -> utilisateurService.connecterUtilisateur(
                new ConnexionRequest("moussa@uasz.sn", "FauxMotDePasse")
        )).isInstanceOf(UnauthorizedException.class)
                .hasMessage("Identifiants invalides");
    }
}
