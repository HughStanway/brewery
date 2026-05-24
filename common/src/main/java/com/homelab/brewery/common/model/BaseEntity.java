package com.homelab.brewery.common.model;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
public class BaseEntity {
    private UUID id;
    private Instant createdAt;
    private Instant updatedAt;
}
