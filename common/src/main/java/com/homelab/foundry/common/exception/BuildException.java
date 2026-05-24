package com.homelab.foundry.common.exception;

public class BuildException extends FoundryException {
    public BuildException(String message) {
        super(message);
    }
    
    public BuildException(String message, Throwable cause) {
        super(message, cause);
    }
}
