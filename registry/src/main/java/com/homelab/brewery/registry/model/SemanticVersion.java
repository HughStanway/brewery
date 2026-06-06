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
            return this.prerelease.compareTo(o.prerelease);
        }
        return 0;
    }
}
