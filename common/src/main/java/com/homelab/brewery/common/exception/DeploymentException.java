package com.homelab.brewery.common.exception;

public class DeploymentException extends BreweryException {
    public DeploymentException(String message) {
        super(message);
    }

    public DeploymentException(String message, Throwable cause) {
        super(message, cause);
    }
}
