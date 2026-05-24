package com.homelab.foundry.common.exception;

public class RegistryException extends FoundryException {
    public RegistryException(String message) {
        super(message);
    }
    
    public RegistryException(String message, Throwable cause) {
        super(message, cause);
    }
}
