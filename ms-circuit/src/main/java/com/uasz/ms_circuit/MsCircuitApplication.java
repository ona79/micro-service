package com.uasz.ms_circuit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableFeignClients
@EnableScheduling
public class MsCircuitApplication {

    public static void main(String[] args) {
        SpringApplication.run(MsCircuitApplication.class, args);
    }

}
