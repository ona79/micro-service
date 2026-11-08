package com.uasz.ms_evenement;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class MsEvenementApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsEvenementApplication.class, args);
    }
}

