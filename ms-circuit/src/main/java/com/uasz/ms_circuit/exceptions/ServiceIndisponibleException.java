package com.uasz.ms_circuit.exceptions;

/** Un microservice distant (ex. ms-patrimoine) est injoignable : HTTP 503 */
public class ServiceIndisponibleException extends RuntimeException {

    public ServiceIndisponibleException(String message) {
        super(message);
    }
}

