package com.homelab.foundry.common.exception;

public class DeploymentException extends FoundryException {
    public DeploymentException(String message) {
        super(message);
    }
    
    public DeploymentException(String message, Throwable cause) {
        super(message, cause);
    }
}
