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

        for (SemanticVersion v : sortedVersions) {
            if (satisfies(v, range)) {
                return v.getOriginalString();
            }
        }

        // Fallback: highest version available
        return sortedVersions.get(0).getOriginalString();
    }

    public boolean satisfies(String version, String range) {
        if (version == null) return false;
        return satisfies(SemanticVersion.parse(version), range);
    }

    public boolean satisfies(SemanticVersion version, String range) {
        if (range == null || range.isBlank() || range.equals("*") || range.equalsIgnoreCase("latest") || range.equalsIgnoreCase("any")) {
            return true;
        }

        String cleanRange = range.trim();

        // Split by || for OR conditions
        String[] orSegments = cleanRange.split("\\|\\|");
        for (String segment : orSegments) {
            if (satisfiesOrSegment(version, segment.trim())) {
                return true;
            }
        }
        return false;
    }

    private boolean satisfiesOrSegment(SemanticVersion version, String segment) {
        segment = segment.trim();
        if (segment.isEmpty()) return false;

        // Normalize spaces after operators, e.g. ">= 1.2.3" -> ">=1.2.3"
        segment = segment.replaceAll("(>=|>|<=|<|\\^|~|=)\\s+", "$1");

        // Check for hyphen range first: e.g. "1.0.0 - 2.0.0"
        String[] hyphenParts = segment.split("\\s+-\\s+");
        if (hyphenParts.length == 2) {
            return satisfiesHyphenRange(version, hyphenParts[0].trim(), hyphenParts[1].trim());
        }

        // Otherwise split by whitespace (AND logic)
        String[] tokens = segment.split("\\s+");
        for (String token : tokens) {
            if (token.isBlank()) continue;
            if (!satisfiesToken(version, token)) {
                return false;
            }
        }
        return true;
    }

    private boolean satisfiesHyphenRange(SemanticVersion version, String minStr, String maxStr) {
        String lowerToken = hasOperator(minStr) ? minStr : ">=" + minStr;
        String upperToken = hasOperator(maxStr) ? maxStr : "<=" + maxStr;
        return satisfiesToken(version, lowerToken) && satisfiesToken(version, upperToken);
    }

    private boolean satisfiesToken(SemanticVersion version, String token) {
        token = token.trim();
        if (token.isEmpty()) return false;

        // If it's a pure wildcard with no operator
        if (!hasOperator(token) && hasWildcard(token)) {
            return satisfiesWildcard(version, token);
        }

        // Extract operator and version part
        String op = "";
        String versionStr = token;
        if (token.startsWith(">=")) {
            op = ">=";
            versionStr = token.substring(2);
        } else if (token.startsWith(">")) {
            op = ">";
            versionStr = token.substring(1);
        } else if (token.startsWith("<=")) {
            op = "<=";
            versionStr = token.substring(2);
        } else if (token.startsWith("<")) {
            op = "<";
            versionStr = token.substring(1);
        } else if (token.startsWith("^")) {
            op = "^";
            versionStr = token.substring(1);
        } else if (token.startsWith("~")) {
            op = "~";
            versionStr = token.substring(1);
        } else if (token.startsWith("=")) {
            op = "=";
            versionStr = token.substring(1);
        }

        // Handle wildcards inside versionStr under operator
        if (hasWildcard(versionStr)) {
            if (op.equals("<=") || op.equals("<")) {
                // E.g., <=1.x.x -> <2.0.0
                // E.g., <=1.2.x -> <1.3.0
                // E.g., <1.x.x -> <1.0.0
                // E.g., <1.2.x -> <1.2.0
                String[] parts = versionStr.toLowerCase().split("\\.");
                if (parts.length > 0) {
                    if (parts[0].equals("x") || parts[0].equals("*")) {
                        return false;
                    }
                    int major = parseSafe(parts[0]);
                    int minor = 0;
                    if (parts.length > 1 && !parts[1].equals("x") && !parts[1].equals("*")) {
                        minor = parseSafe(parts[1]);
                        if (op.equals("<=")) {
                            return version.compareTo(new SemanticVersion(major, minor + 1, 0, null, "")) < 0;
                        } else {
                            return version.compareTo(new SemanticVersion(major, minor, 0, null, "")) < 0;
                        }
                    } else {
                        if (op.equals("<=")) {
                            return version.compareTo(new SemanticVersion(major + 1, 0, 0, null, "")) < 0;
                        } else {
                            return version.compareTo(new SemanticVersion(major, 0, 0, null, "")) < 0;
                        }
                    }
                }
            } else if (op.equals(">=") || op.equals(">") || op.equals("^") || op.equals("~")) {
                // E.g., >=1.x -> >=1.0.0
                // E.g., ^1.2.x -> ^1.2.0
                versionStr = replaceWildcardsWithZero(versionStr);
            } else if (op.equals("=") || op.isEmpty()) {
                return satisfiesWildcard(version, versionStr);
            }
        }

        SemanticVersion target = SemanticVersion.parse(versionStr);
        return satisfiesConstraint(version, op, target);
    }

    private boolean satisfiesConstraint(SemanticVersion version, String op, SemanticVersion target) {
        switch (op) {
            case ">=":
                return version.compareTo(target) >= 0;
            case ">":
                return version.compareTo(target) > 0;
            case "<=":
                return version.compareTo(target) <= 0;
            case "<":
                return version.compareTo(target) < 0;
            case "^":
                if (version.getMajor() != target.getMajor()) {
                    return false;
                }
                if (target.getMajor() > 0) {
                    return version.compareTo(target) >= 0;
                } else if (target.getMinor() > 0) {
                    return version.compareTo(target) >= 0 && version.getMinor() == target.getMinor();
                } else {
                    return version.compareTo(target) >= 0 && version.getPatch() == target.getPatch();
                }
            case "~":
                return version.compareTo(target) >= 0 && version.getMajor() == target.getMajor() && version.getMinor() == target.getMinor();
            case "=":
            case "":
            default:
                return version.compareTo(target) == 0;
        }
    }

    private boolean hasOperator(String s) {
        return s.startsWith(">=") || s.startsWith(">") || s.startsWith("<=") || 
               s.startsWith("<") || s.startsWith("^") || s.startsWith("~") || s.startsWith("=");
    }

    private boolean hasWildcard(String s) {
        return s.contains("x") || s.contains("X") || s.contains("*");
    }

    private String replaceWildcardsWithZero(String s) {
        return s.replaceAll("(?i)x|\\*", "0");
    }

    private boolean satisfiesWildcard(SemanticVersion version, String wildcardPattern) {
        String clean = wildcardPattern.trim().toLowerCase();
        String[] parts = clean.split("\\.");
        
        if (parts.length == 0 || parts[0].equals("x") || parts[0].equals("*")) {
            return true;
        }
        
        int majorPart = parseSafe(parts[0]);
        if (version.getMajor() != majorPart) {
            return false;
        }
        
        if (parts.length < 2 || parts[1].equals("x") || parts[1].equals("*")) {
            return true;
        }
        int minorPart = parseSafe(parts[1]);
        if (version.getMinor() != minorPart) {
            return false;
        }
        
        if (parts.length < 3 || parts[2].equals("x") || parts[2].equals("*")) {
            return true;
        }
        int patchPart = parseSafe(parts[2]);
        return version.getPatch() == patchPart;
    }

    private int parseSafe(String s) {
        try {
            return Integer.parseInt(s.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
