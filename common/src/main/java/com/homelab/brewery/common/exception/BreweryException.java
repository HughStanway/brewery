package com.homelab.brewery.common.exception;

public class BreweryException extends RuntimeException {
    public BreweryException(String message) {
        super(message);
    }

    public BreweryException(String message, Throwable cause) {
        super(message, cause);
    }
}
