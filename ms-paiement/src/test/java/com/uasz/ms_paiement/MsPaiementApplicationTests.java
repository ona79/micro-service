package com.uasz.ms_paiement;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {"spring.cloud.discovery.enabled=false", "spring.cloud.config.enabled=false", "eureka.client.enabled=false"})
class MsPaiementApplicationTests {

    @Test
    void contextLoads() {
    }
}

