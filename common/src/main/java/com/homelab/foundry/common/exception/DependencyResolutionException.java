package com.homelab.foundry.common.exception;

public class DependencyResolutionException extends FoundryException {
    public DependencyResolutionException(String message) {
        super(message);
    }
    
    public DependencyResolutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
