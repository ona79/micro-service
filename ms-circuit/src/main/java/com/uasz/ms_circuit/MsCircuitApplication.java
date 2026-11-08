package com.uasz.ms_circuit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class MsCircuitApplication {

	public static void main(String[] args) {
		SpringApplication.run(MsCircuitApplication.class, args);
	}

}

