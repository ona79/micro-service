package com.uasz.ms_circuit.exceptions;

/** Requête incohérente (ex. étape pointant vers un patrimoine inexistant) : HTTP 400 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}

