package com.homelab.brewery.api.exceptions;

import com.homelab.brewery.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleNoHandlerFound(
        NoHandlerFoundException exception,
        HttpServletRequest request
    ) {
        return notFoundResponse(request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleNoResourceFound(
        NoResourceFoundException exception,
        HttpServletRequest request
    ) {
        return notFoundResponse(request);
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> notFoundResponse(HttpServletRequest request) {
        Map<String, Object> data = Map.of(
            "path", request.getRequestURI(),
            "statusCode", HttpStatus.NOT_FOUND.value()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ApiResponse<>(
                "error",
                data,
                "No API endpoint matches " + request.getMethod() + " " + request.getRequestURI()
            ));
    }
}
