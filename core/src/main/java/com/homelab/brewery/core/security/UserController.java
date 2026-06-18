package com.homelab.brewery.core.security;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<List<UserDto>> listUsers() {
        List<UserDto> users = userRepository.findAll().stream()
                .map(UserDto::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Username cannot be empty"));
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Password cannot be empty"));
        }
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse("Username is already taken"));
        }

        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole() != null ? request.getRole().toUpperCase() : "USER");
        
        User saved = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(new UserDto(saved));
    }

    @PutMapping("/{id}/username")
    public ResponseEntity<?> updateUsername(@PathVariable("id") UUID id, @RequestBody UpdateUsernameRequest request) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse("User not found"));
        }
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Username cannot be empty"));
        }
        String newUsername = request.getUsername().trim();
        if (!newUsername.equalsIgnoreCase(user.getUsername())) {
            if (userRepository.findByUsername(newUsername).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse("Username is already taken"));
            }
        }
        user.setUsername(newUsername);
        User saved = userRepository.save(user);
        return ResponseEntity.ok(new UserDto(saved));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable("id") UUID id, @RequestBody UpdateRoleRequest request) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse("User not found"));
        }
        if (request.getRole() == null || request.getRole().isBlank()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Role cannot be empty"));
        }

        String targetRole = request.getRole().toUpperCase();
        if ("ADMIN".equalsIgnoreCase(user.getRole()) && !"ADMIN".equalsIgnoreCase(targetRole)) {
            // Count active admin users
            long adminCount = userRepository.findAll().stream()
                    .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()))
                    .count();
            if (adminCount <= 1) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Cannot change role. At least one admin account must always exist in the system."));
            }
        }

        user.setRole(targetRole);
        User saved = userRepository.save(user);
        return ResponseEntity.ok(new UserDto(saved));
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<?> resetPassword(@PathVariable("id") UUID id, @RequestBody ResetPasswordRequest request) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse("User not found"));
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Password cannot be empty"));
        }

        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable("id") UUID id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse("User not found"));
        }

        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            // Count active admin users
            long adminCount = userRepository.findAll().stream()
                    .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()))
                    .count();
            if (adminCount <= 1) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Cannot delete user. At least one admin account must always exist in the system."));
            }
        }
        
        userRepository.delete(user);
        return ResponseEntity.ok().build();
    }

    @Data
    public static class CreateUserRequest {
        private String username;
        private String password;
        private String role;
    }

    @Data
    public static class UpdateUsernameRequest {
        private String username;
    }

    @Data
    public static class UpdateRoleRequest {
        private String role;
    }

    @Data
    public static class ResetPasswordRequest {
        private String password;
    }

    @Data
    public static class UserDto {
        private UUID id;
        private String username;
        private String role;
        private String createdAt;

        public UserDto(User user) {
            this.id = user.getId();
            this.username = user.getUsername();
            this.role = user.getRole();
            this.createdAt = user.getCreatedAt() != null ? user.getCreatedAt().toString() : "";
        }
    }

    @Data
    public static class ErrorResponse {
        private String message;

        public ErrorResponse(String message) {
            this.message = message;
        }
    }
}
