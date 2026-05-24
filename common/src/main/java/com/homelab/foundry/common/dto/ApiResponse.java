package com.homelab.foundry.common.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

public class ApiResponse<T> {
    private String status;
    private T data;
    private String message;
    
    @JsonProperty("timestamp")
    private Instant timestamp;
    
    public ApiResponse() {
        this.timestamp = Instant.now();
    }
    
    public ApiResponse(String status, T data, String message, Instant timestamp) {
        this.status = status;
        this.data = data;
        this.message = message;
        this.timestamp = timestamp;
    }
    
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>("success", data, null, Instant.now());
    }
    
    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>("success", data, message, Instant.now());
    }
    
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>("error", null, message, Instant.now());
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
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
