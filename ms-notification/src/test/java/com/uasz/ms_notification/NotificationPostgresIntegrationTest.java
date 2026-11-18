package com.uasz.ms_notification;

import com.uasz.ms_notification.repositories.NotificationRepository;
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
        "spring.datasource.url=jdbc:postgresql://${TEST_DB_HOST:localhost}:${TEST_DB_PORT:5432}/notification_db",
        "spring.datasource.username=${NOTIFICATION_DB_USER:notification_user}",
        "spring.datasource.password=${NOTIFICATION_DB_PASSWORD:${DB_PASSWORD:}}",
        "spring.cloud.discovery.enabled=false"
})
class NotificationPostgresIntegrationTest {

    @Autowired
    private NotificationRepository notificationRepository;

    @Test
    void testPostgresConnectionFlywayAndHibernateValidation() {
        assertThat(notificationRepository).isNotNull();
        long count = notificationRepository.count();
        System.out.println(">>> [POSTGRES 16 TEST] ms-notification connecté avec succès ! Nombre de notifications : " + count);
        assertThat(count).isGreaterThanOrEqualTo(2);
    }
}
