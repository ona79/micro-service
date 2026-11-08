package com.uasz.ms_paiement;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class MsPaiementApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsPaiementApplication.class, args);
    }
}

