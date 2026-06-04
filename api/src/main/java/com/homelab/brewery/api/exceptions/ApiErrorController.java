package com.homelab.brewery.api.exceptions;

import com.homelab.brewery.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.boot.web.servlet.error.ErrorAttributes;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.ServletWebRequest;

import java.util.Map;

@RestController
public class ApiErrorController implements ErrorController {

    private final ErrorAttributes errorAttributes;

    public ApiErrorController(ErrorAttributes errorAttributes) {
        this.errorAttributes = errorAttributes;
    }

    @RequestMapping("/error")
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleError(HttpServletRequest request) {
        ServletWebRequest requestAttributes = new ServletWebRequest(request);
        ErrorAttributeOptions options = ErrorAttributeOptions.of(
            ErrorAttributeOptions.Include.MESSAGE,
            ErrorAttributeOptions.Include.EXCEPTION
        );

        Map<String, Object> errorDetails = errorAttributes.getErrorAttributes(requestAttributes, options);
        int statusCode = (int) errorDetails.getOrDefault("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        String message = String.valueOf(
            errorDetails.getOrDefault("message", errorDetails.getOrDefault("error", "Unexpected error"))
        );

        Map<String, Object> payload = Map.of(
            "statusCode", statusCode,
            "error", message,
            "exception", errorDetails.getOrDefault("exception", "Internal Exception")
        );

        return ResponseEntity.status(statusCode)
            .body(ApiResponse.error(payload));
    }
}
