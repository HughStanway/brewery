package com.homelab.brewery.common.exception;

public class RegistryException extends BreweryException {
    public RegistryException(String message) {
        super(message);
    }

    public RegistryException(String message, Throwable cause) {
        super(message, cause);
    }
}
