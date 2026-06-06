package com.homelab.brewery.registry;

import com.homelab.brewery.registry.model.SemanticVersion;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SemanticVersionResolver {

    public String resolveVersionRange(String range, List<String> availableVersions) {
        if (availableVersions == null || availableVersions.isEmpty()) {
            return null;
        }

        // Sort available versions descending (highest first)
        List<SemanticVersion> sortedVersions = availableVersions.stream()
                .map(SemanticVersion::parse)
                .sorted((v1, v2) -> v2.compareTo(v1)) // Descending
                .toList();

        if (range == null || range.isBlank() || range.equals("*") || range.equalsIgnoreCase("latest") || range.equalsIgnoreCase("any")) {
            return sortedVersions.get(0).getOriginalString();
        }

        String cleanRange = range.trim();

        // 1. Caret ^ (e.g. ^1.2.3)
        if (cleanRange.startsWith("^")) {
            SemanticVersion target = SemanticVersion.parse(cleanRange.substring(1));
            for (SemanticVersion v : sortedVersions) {
                if (v.getMajor() == target.getMajor() && v.compareTo(target) >= 0) {
                    return v.getOriginalString();
                }
            }
        }
        // 2. Tilde ~ (e.g. ~1.2.3)
        else if (cleanRange.startsWith("~")) {
            SemanticVersion target = SemanticVersion.parse(cleanRange.substring(1));
            for (SemanticVersion v : sortedVersions) {
                if (v.getMajor() == target.getMajor() && v.getMinor() == target.getMinor() && v.compareTo(target) >= 0) {
                    return v.getOriginalString();
                }
            }
        }
        // 3. Simple Relational bounds
        else if (cleanRange.startsWith(">=")) {
            SemanticVersion target = SemanticVersion.parse(cleanRange.substring(2));
            for (SemanticVersion v : sortedVersions) {
                if (v.compareTo(target) >= 0) {
                    return v.getOriginalString();
                }
            }
        }
        else if (cleanRange.startsWith(">")) {
            SemanticVersion target = SemanticVersion.parse(cleanRange.substring(1));
            for (SemanticVersion v : sortedVersions) {
                if (v.compareTo(target) > 0) {
                    return v.getOriginalString();
                }
            }
        }
        else if (cleanRange.startsWith("<=")) {
            SemanticVersion target = SemanticVersion.parse(cleanRange.substring(2));
            for (SemanticVersion v : sortedVersions) {
                if (v.compareTo(target) <= 0) {
                    return v.getOriginalString();
                }
            }
        }
        else if (cleanRange.startsWith("<")) {
            SemanticVersion target = SemanticVersion.parse(cleanRange.substring(1));
            for (SemanticVersion v : sortedVersions) {
                if (v.compareTo(target) < 0) {
                    return v.getOriginalString();
                }
            }
        }
        // 4. Exact match
        else {
            SemanticVersion target = SemanticVersion.parse(cleanRange);
            for (SemanticVersion v : sortedVersions) {
                if (v.compareTo(target) == 0) {
                    return v.getOriginalString();
                }
            }
        }

        // Fallback: highest version available
        return sortedVersions.get(0).getOriginalString();
    }
}
