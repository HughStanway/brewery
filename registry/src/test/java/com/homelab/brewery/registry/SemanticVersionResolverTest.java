package com.homelab.brewery.registry;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

public class SemanticVersionResolverTest {

    private final SemanticVersionResolver resolver = new SemanticVersionResolver();

    @Test
    public void testBasicOperators() {
        // Exact matches
        assertTrue(resolver.satisfies("1.2.3", "1.2.3"));
        assertFalse(resolver.satisfies("1.2.4", "1.2.3"));

        // Greater than / equals
        assertTrue(resolver.satisfies("1.2.3", ">=1.2.3"));
        assertTrue(resolver.satisfies("1.2.4", ">=1.2.3"));
        assertFalse(resolver.satisfies("1.2.2", ">=1.2.3"));

        // Greater than
        assertTrue(resolver.satisfies("1.2.4", ">1.2.3"));
        assertFalse(resolver.satisfies("1.2.3", ">1.2.3"));

        // Less than / equals
        assertTrue(resolver.satisfies("1.2.3", "<=1.2.3"));
        assertTrue(resolver.satisfies("1.2.2", "<=1.2.3"));
        assertFalse(resolver.satisfies("1.2.4", "<=1.2.3"));

        // Less than
        assertTrue(resolver.satisfies("1.2.2", "<1.2.3"));
        assertFalse(resolver.satisfies("1.2.3", "<1.2.3"));
    }

    @Test
    public void testSpacesInOperators() {
        assertTrue(resolver.satisfies("1.2.3", ">= 1.2.3"));
        assertTrue(resolver.satisfies("1.2.4", "> 1.2.3"));
        assertTrue(resolver.satisfies("1.2.2", "<= 1.2.3"));
    }

    @Test
    public void testCaret() {
        // ^1.2.3 => >=1.2.3 <2.0.0
        assertTrue(resolver.satisfies("1.2.3", "^1.2.3"));
        assertTrue(resolver.satisfies("1.9.9", "^1.2.3"));
        assertFalse(resolver.satisfies("2.0.0", "^1.2.3"));
        assertFalse(resolver.satisfies("1.2.2", "^1.2.3"));

        // ^0.2.3 => >=0.2.3 <0.3.0
        assertTrue(resolver.satisfies("0.2.3", "^0.2.3"));
        assertTrue(resolver.satisfies("0.2.9", "^0.2.3"));
        assertFalse(resolver.satisfies("0.3.0", "^0.2.3"));

        // ^0.0.3 => >=0.0.3 <0.0.4
        assertTrue(resolver.satisfies("0.0.3", "^0.0.3"));
        assertFalse(resolver.satisfies("0.0.4", "^0.0.3"));
    }

    @Test
    public void testTilde() {
        // ~1.2.3 => >=1.2.3 <1.3.0
        assertTrue(resolver.satisfies("1.2.3", "~1.2.3"));
        assertTrue(resolver.satisfies("1.2.9", "~1.2.3"));
        assertFalse(resolver.satisfies("1.3.0", "~1.2.3"));
        assertFalse(resolver.satisfies("1.2.2", "~1.2.3"));
    }

    @Test
    public void testWildcards() {
        // 1.x
        assertTrue(resolver.satisfies("1.0.0", "1.x"));
        assertTrue(resolver.satisfies("1.5.0", "1.x"));
        assertFalse(resolver.satisfies("2.0.0", "1.x"));

        // 1.2.x
        assertTrue(resolver.satisfies("1.2.0", "1.2.x"));
        assertTrue(resolver.satisfies("1.2.5", "1.2.x"));
        assertFalse(resolver.satisfies("1.3.0", "1.2.x"));

        // *
        assertTrue(resolver.satisfies("0.0.1", "*"));
        assertTrue(resolver.satisfies("2.5.0", "*"));
    }

    @Test
    public void testHyphenRanges() {
        // 1.0.0 - 2.0.0
        assertTrue(resolver.satisfies("1.0.0", "1.0.0 - 2.0.0"));
        assertTrue(resolver.satisfies("1.5.0", "1.0.0 - 2.0.0"));
        assertTrue(resolver.satisfies("2.0.0", "1.0.0 - 2.0.0"));
        assertFalse(resolver.satisfies("0.9.9", "1.0.0 - 2.0.0"));
        assertFalse(resolver.satisfies("2.0.1", "1.0.0 - 2.0.0"));

        // 1.0.x - 2.x
        assertTrue(resolver.satisfies("1.0.0", "1.0.x - 2.x"));
        assertTrue(resolver.satisfies("2.9.9", "1.0.x - 2.x"));
        assertFalse(resolver.satisfies("3.0.0", "1.0.x - 2.x"));
    }

    @Test
    public void testLogicalAndOr() {
        // AND (spaces)
        assertTrue(resolver.satisfies("1.5.0", ">=1.0.0 <2.0.0"));
        assertFalse(resolver.satisfies("2.0.0", ">=1.0.0 <2.0.0"));

        // OR (||)
        assertTrue(resolver.satisfies("1.5.0", "^1.0.0 || ^2.0.0"));
        assertTrue(resolver.satisfies("2.1.0", "^1.0.0 || ^2.0.0"));
        assertFalse(resolver.satisfies("3.0.0", "^1.0.0 || ^2.0.0"));
    }

    @Test
    public void testResolveVersionRange() {
        List<String> versions = List.of("1.0.0", "1.2.0", "1.2.5", "1.3.0", "2.0.0", "2.1.0");
        
        assertEquals("1.3.0", resolver.resolveVersionRange("^1.2.0", versions));
        assertEquals("1.2.5", resolver.resolveVersionRange("~1.2.0", versions));
        assertEquals("1.3.0", resolver.resolveVersionRange("1.x", versions));
        assertEquals("2.1.0", resolver.resolveVersionRange("*", versions));
        assertEquals("1.3.0", resolver.resolveVersionRange("1.0.0 - 1.3.0", versions));
        assertEquals("2.1.0", resolver.resolveVersionRange("^1.0.0 || ^2.0.0", versions));
    }

    @Test
    public void testMonotonicBuildVersions() {
        // Build 1 (older commit): 0.0.0-build.100.19fe162
        // Build 2 (newer commit): 0.0.0-build.101.1ae63d7
        List<String> unTaggedVersions = List.of("0.0.0-build.100.19fe162", "0.0.0-build.101.1ae63d7");
        
        // Newer monotonic build version (build.101) should resolve as highest version
        assertEquals("0.0.0-build.101.1ae63d7", resolver.resolveVersionRange("*", unTaggedVersions));
        assertEquals("0.0.0-build.101.1ae63d7", resolver.resolveVersionRange("latest", unTaggedVersions));

        // Epoch timestamp based build versions
        List<String> timestampVersions = List.of("0.0.0-build.1770548500000.19fe162", "0.0.0-build.1770548600000.1ae63d7");
        assertEquals("0.0.0-build.1770548600000.1ae63d7", resolver.resolveVersionRange("*", timestampVersions));
    }
}
