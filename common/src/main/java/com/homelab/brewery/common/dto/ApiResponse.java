package com.homelab.brewery.common.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

public class ApiResponse<T> {
    private String status;
    private T payload;
    private String message;
    
    @JsonProperty("timestamp")
    private Instant timestamp;
    
    public ApiResponse() {
        this.timestamp = Instant.now();
    }
    
    public ApiResponse(String status, T payload, String message) {
        this.status = status;
        this.payload = payload;
        this.message = message;
        this.timestamp = Instant.now();
    }
    
    public static <T> ApiResponse<T> success(T payload) {
        return new ApiResponse<>("success", payload, null);
    }
    
    public static <T> ApiResponse<T> success(T payload, String message) {
        return new ApiResponse<>("success", payload, message);
    }

    public static <T> ApiResponse<T> error(T payload) {
        return new ApiResponse<>("error", payload, null);
    }
    
    public static <T> ApiResponse<T> error(T payload, String message) {
        return new ApiResponse<>("error", payload, message);
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public T getPayload() {
        return payload;
    }

    public void setPayload(T payload) {
        this.payload = payload;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
