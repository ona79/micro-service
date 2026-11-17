package com.uasz.ms_reservation;

import com.uasz.ms_reservation.repositories.ReservationRepository;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("prod")
@Tag("postgres")
@EnabledIfEnvironmentVariable(named = "POSTGRES_INTEGRATION_TEST", matches = "true")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://172.20.0.2:5432/reservation_db",
        "spring.datasource.username=reservation_user",
        "spring.datasource.password=reservation_pass_2026!",
        "spring.cloud.discovery.enabled=false"
})
class ReservationPostgresIntegrationTest {

    @Autowired
    private ReservationRepository reservationRepository;

    @Test
    void testPostgresConnectionFlywayAndHibernateValidation() {
        assertThat(reservationRepository).isNotNull();
        long count = reservationRepository.count();
        System.out.println(">>> [POSTGRES 16 TEST] ms-reservation connecté avec succès ! Nombre de réservations : " + count);
        assertThat(count).isGreaterThanOrEqualTo(2);
    }
}
