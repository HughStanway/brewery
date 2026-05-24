package com.homelab.foundry.common.exception;

public class FoundryException extends RuntimeException {
    public FoundryException(String message) {
        super(message);
    }
    
    public FoundryException(String message, Throwable cause) {
        super(message, cause);
    }
}
