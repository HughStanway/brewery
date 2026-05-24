package com.homelab.brewery.common.exception;

public class DependencyResolutionException extends BreweryException {
    public DependencyResolutionException(String message) {
        super(message);
    }

    public DependencyResolutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
