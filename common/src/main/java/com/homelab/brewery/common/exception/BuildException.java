package com.homelab.brewery.common.exception;

public class BuildException extends BreweryException {
    public BuildException(String message) {
        super(message);
    }

    public BuildException(String message, Throwable cause) {
        super(message, cause);
    }
}
