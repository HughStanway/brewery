package com.homelab.brewery.registry.model;

import lombok.Value;

@Value
public class SemanticVersion implements Comparable<SemanticVersion> {
    int major;
    int minor;
    int patch;
    String prerelease;
    String originalString;

    public static SemanticVersion parse(String versionStr) {
        if (versionStr == null) {
            return new SemanticVersion(0, 0, 0, null, "");
        }
        String clean = versionStr.trim();
        // Remove build metadata
        int plusIdx = clean.indexOf('+');
        if (plusIdx >= 0) {
            clean = clean.substring(0, plusIdx);
        }
        
        String prerelease = null;
        int dashIdx = clean.indexOf('-');
        if (dashIdx >= 0) {
            prerelease = clean.substring(dashIdx + 1);
            clean = clean.substring(0, dashIdx);
        }
        
        String[] parts = clean.split("\\.");
        int major = parts.length > 0 ? parseSafe(parts[0]) : 0;
        int minor = parts.length > 1 ? parseSafe(parts[1]) : 0;
        int patch = parts.length > 2 ? parseSafe(parts[2]) : 0;
        
        return new SemanticVersion(major, minor, patch, prerelease, versionStr);
    }
    
    private static int parseSafe(String s) {
        try {
            return Integer.parseInt(s.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    @Override
    public int compareTo(SemanticVersion o) {
        if (this.major != o.major) return Integer.compare(this.major, o.major);
        if (this.minor != o.minor) return Integer.compare(this.minor, o.minor);
        if (this.patch != o.patch) return Integer.compare(this.patch, o.patch);
        if (this.prerelease == null && o.prerelease != null) return 1;
        if (this.prerelease != null && o.prerelease == null) return -1;
        if (this.prerelease != null && o.prerelease != null) {
            return comparePrereleases(this.prerelease, o.prerelease);
        }
        return 0;
    }

    private static int comparePrereleases(String p1, String p2) {
        if (p1.equals(p2)) return 0;
        String[] parts1 = p1.split("\\.");
        String[] parts2 = p2.split("\\.");
        int minLen = Math.min(parts1.length, parts2.length);

        for (int i = 0; i < minLen; i++) {
            String token1 = parts1[i];
            String token2 = parts2[i];
            if (token1.equals(token2)) continue;

            boolean isNum1 = isNumeric(token1);
            boolean isNum2 = isNumeric(token2);

            if (isNum1 && isNum2) {
                try {
                    long n1 = Long.parseLong(token1);
                    long n2 = Long.parseLong(token2);
                    return Long.compare(n1, n2);
                } catch (NumberFormatException e) {
                    return token1.compareTo(token2);
                }
            } else if (isNum1 && !isNum2) {
                // Numeric identifiers have lower precedence than non-numeric identifiers per SemVer 2.0.0
                return -1;
            } else if (!isNum1 && isNum2) {
                return 1;
            } else {
                int c = token1.compareTo(token2);
                if (c != 0) return c;
            }
        }
        return Integer.compare(parts1.length, parts2.length);
    }

    private static boolean isNumeric(String str) {
        if (str == null || str.isEmpty()) return false;
        for (int i = 0; i < str.length(); i++) {
            if (!Character.isDigit(str.charAt(i))) {
                return false;
            }
        }
        return true;
    }
}
