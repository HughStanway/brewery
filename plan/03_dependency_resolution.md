# Phase 3: Dependency Resolution Engine

**Duration:** 2-3 weeks  
**Focus:** Semantic versioning, dependency graph construction, conflict detection  
**Deliverables:** Dependency graphs tracked, conflicts detected, version resolution working

**Depends on:** Phase 1 & 2 (artifacts with dependency metadata available)

---

## 1. Architecture Overview

### 1.1 Component Diagram

```
Artifact Metadata
(with dependencies)
  │
  ▼
┌─────────────────────────────────────────┐
│   Dependency Resolution Engine          │
│   - Parse dependency declarations       │
│   - Resolve version ranges              │
│   - Build dependency graph              │
│   - Detect conflicts                    │
│   - Calculate transitive dependencies   │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴────────────┐
    │                       │
    ▼                       ▼
┌──────────────┐    ┌──────────────────┐
│  PostgreSQL  │    │  Graph Database  │
│  (relational)│    │  (Neo4j optional)│
│              │    │                  │
│ - artifacts  │    │ For visualization│
│ - dependencies
│ - resolvedDeps
│ - reverse_deps
└──────────────┘    └──────────────────┘

  ↓
┌─────────────────────────────────────────┐
│   Conflict Detection                    │
│   - Report incompatible versions        │
│   - Suggest resolutions                 │
└─────────────────────────────────────────┘

  ↓
┌─────────────────────────────────────────┐
│   Graph Visualization & Analysis        │
│   - Dependencies of X                   │
│   - Dependents of X                     │
│   - Circular dependency detection       │
│   - Version compatibility matrix        │
└─────────────────────────────────────────┘
```

---

## 2. Dependency Model

### 2.1 Dependency Declaration

In artifact metadata, dependencies are declared as:

```json
{
  "dependencies": [
    {
      "name": "core-crypto",
      "version_range": "^2.0.0",
      "type": "runtime",
      "optional": false
    },
    {
      "name": "jwt-lib",
      "version_range": ">=1.5.0 <2.0.0",
      "type": "runtime",
      "optional": false
    },
    {
      "name": "test-framework",
      "version_range": "^5.0.0",
      "type": "dev",
      "optional": true
    }
  ]
}
```

### 2.2 Supported Version Range Syntax

```
Exact:        1.2.3
Caret:        ^1.2.3  → >=1.2.3 <2.0.0
Tilde:        ~1.2.3  → >=1.2.3 <1.3.0
Comparison:   >=1.0.0, <=2.0.0, >1.0, <2.0
Range:        >=1.0.0 <2.0.0
Or:           1.2.x || 1.3.x || 2.0.0
Wildcard:     1.2.* or 1.*
Pre-release:  1.2.3-alpha, 1.2.3-rc.1
```

### 2.3 Database Schema Extensions

```sql
-- Dependencies table
CREATE TABLE dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  dependency_name TEXT NOT NULL,
  version_range TEXT NOT NULL,
  resolved_version TEXT,
  dependency_artifact_id UUID REFERENCES artifacts(id),
  dependency_type VARCHAR(50) DEFAULT 'runtime'
    CHECK (dependency_type IN ('runtime', 'dev', 'peer')),
  is_optional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(artifact_id, dependency_name)
);

CREATE INDEX idx_dependencies_artifact ON dependencies(artifact_id);
CREATE INDEX idx_dependencies_name ON dependencies(dependency_name);
CREATE INDEX idx_dependencies_resolved ON dependencies(resolved_version);

-- Resolved dependencies (cache for performance)
CREATE TABLE resolved_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  dependency_id UUID NOT NULL REFERENCES dependencies(id) ON DELETE CASCADE,
  resolved_to_artifact_id UUID NOT NULL REFERENCES artifacts(id),
  resolved_version TEXT NOT NULL,
  resolution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(artifact_id, dependency_id)
);

CREATE INDEX idx_resolved_dep_artifact ON resolved_dependencies(artifact_id);

-- Reverse dependencies (for finding dependents)
CREATE TABLE reverse_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  dependent_artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(artifact_id, dependent_artifact_id)
);

CREATE INDEX idx_reverse_dep_artifact ON reverse_dependencies(artifact_id);
CREATE INDEX idx_reverse_dep_dependent ON reverse_dependencies(dependent_artifact_id);

-- Conflict detections (for reporting)
CREATE TABLE dependency_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id),
  conflict_description TEXT NOT NULL,
  involved_artifacts UUID[] NOT NULL,
  suggested_resolutions TEXT[],
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conflicts_artifact ON dependency_conflicts(artifact_id);
```

---

## 3. Dependency Resolution API

### 3.1 Resolve Single Artifact Dependencies

**POST** `/api/dependencies/resolve/{name}/{version}`

```json
Request:
{
  "include_transitive": true,
  "include_dev_dependencies": false
}

Response:
{
  "artifact": "auth-lib@1.4.2",
  "resolved_dependencies": [
    {
      "name": "core-crypto",
      "requested_range": "^2.0.0",
      "resolved_version": "2.1.0",
      "dependency_type": "runtime",
      "transitive": false
    },
    {
      "name": "jwt-lib",
      "requested_range": ">=1.5.0",
      "resolved_version": "1.6.0",
      "dependency_type": "runtime",
      "transitive": false
    },
    {
      "name": "bcrypt",
      "resolved_version": "4.0.1",
      "dependency_type": "runtime",
      "transitive": true,
      "required_by": "core-crypto@2.1.0"
    }
  ],
  "transitive_dependencies": [
    {
      "path": "core-crypto@2.1.0 -> bcrypt@4.0.1",
      "dependency": "bcrypt@4.0.1"
    }
  ],
  "conflicts": [],
  "resolution_time_ms": 45
}
```

### 3.2 Get Dependency Graph

**GET** `/api/dependencies/graph/{name}/{version}?depth=2&direction=forward`

```json
Response:
{
  "artifact": "auth-lib@1.4.2",
  "graph": {
    "nodes": [
      {
        "id": "auth-lib@1.4.2",
        "name": "auth-lib",
        "version": "1.4.2",
        "type": "runtime"
      },
      {
        "id": "core-crypto@2.1.0",
        "name": "core-crypto",
        "version": "2.1.0",
        "type": "runtime"
      },
      {
        "id": "bcrypt@4.0.1",
        "name": "bcrypt",
        "version": "4.0.1",
        "type": "runtime",
        "transitive": true
      }
    ],
    "edges": [
      {
        "from": "auth-lib@1.4.2",
        "to": "core-crypto@2.1.0",
        "type": "depends-on",
        "version_range": "^2.0.0"
      },
      {
        "from": "core-crypto@2.1.0",
        "to": "bcrypt@4.0.1",
        "type": "depends-on"
      }
    ]
  }
}
```

### 3.3 Find Dependents (Reverse Dependencies)

**GET** `/api/dependencies/reverse/{name}/{version}?depth=2`

```json
Response:
{
  "artifact": "core-crypto@2.1.0",
  "reverse_dependencies": [
    {
      "dependent": "auth-lib@1.4.2",
      "version_range": "^2.0.0",
      "transitive": false
    },
    {
      "dependent": "api-server@0.5.0",
      "version_range": ">=2.0.0",
      "transitive": false
    }
  ],
  "transitively_required_by": [
    {
      "path": "web-service@1.0.0 -> auth-lib@1.4.2 -> core-crypto@2.1.0"
    }
  ]
}
```

### 3.4 Check for Conflicts

**POST** `/api/dependencies/conflicts`

```json
Request:
{
  "artifacts": [
    { "name": "auth-lib", "version": "1.4.2" },
    { "name": "api-server", "version": "0.5.0" },
    { "name": "web-service", "version": "1.0.0" }
  ]
}

Response:
{
  "has_conflicts": true,
  "conflicts": [
    {
      "type": "version_conflict",
      "description": "web-service@1.0.0 requires core-crypto@>=1.5.0 but auth-lib@1.4.2 requires core-crypto@^2.0.0",
      "involved_artifacts": [
        "web-service@1.0.0",
        "auth-lib@1.4.2"
      ],
      "suggested_resolutions": [
        "Upgrade web-service to 1.1.0 (which supports core-crypto@^2.0.0)",
        "Downgrade auth-lib to 1.3.0 (which supports core-crypto@^1.5.0)"
      ]
    }
  ],
  "resolution_recommendations": [
    {
      "artifact": "web-service",
      "current_version": "1.0.0",
      "suggested_version": "1.1.0",
      "reason": "Resolves conflicts with other artifacts"
    }
  ]
}
```

### 3.5 Version Compatibility Matrix

**GET** `/api/dependencies/compatibility-matrix?artifacts=auth-lib,core-crypto,jwt-lib`

```json
Response:
{
  "matrix": [
    {
      "artifact": "auth-lib",
      "versions": ["1.4.2", "1.4.1", "1.4.0"],
      "compatible_with": {
        "core-crypto": {
          "1.4.2": ["2.0.0", "2.1.0"],
          "1.4.1": ["2.0.0", "2.0.1"],
          "1.4.0": ["1.9.0", "1.9.2"]
        },
        "jwt-lib": {
          "1.4.2": ["1.5.0", "1.6.0"],
          "1.4.1": ["1.5.0"],
          "1.4.0": ["1.4.0"]
        }
      }
    }
  ]
}
```

---

## 4. Implementation Components

### 4.1 Dependency Parser

```java
public class DependencyParser {
  
  /**
   * Parse dependency declaration from metadata
   */
  public Dependency parseDependency(Map<String, Object> metadata) {
    String name = (String) metadata.get("name");
    String versionRange = (String) metadata.get("version_range");
    String type = (String) metadata.getOrDefault("type", "runtime");
    boolean optional = (boolean) metadata.getOrDefault("optional", false);
    
    return new Dependency(name, versionRange, type, optional);
  }
  
  /**
   * Extract all dependencies from artifact metadata
   */
  public List<Dependency> extractDependencies(ArtifactMetadata metadata) {
    List<Map<String, Object>> deps = metadata.getDependencies();
    return deps.stream()
      .map(this::parseDependency)
      .collect(Collectors.toList());
  }
}
```

### 4.2 Version Range Resolver

```java
public class VersionRangeResolver {
  
  /**
   * Resolve version range to single version
   * Examples: ^1.2.3 -> 1.2.5 (if available)
   */
  public String resolveVersionRange(
    String artifactName,
    String versionRange,
    ArtifactRegistry registry
  ) throws VersionResolutionException {
    
    // Get all available versions
    List<String> availableVersions = registry.listVersions(artifactName);
    
    // Parse version range
    VersionRangeSpecifier spec = parseVersionRange(versionRange);
    
    // Filter versions matching range
    List<String> matching = availableVersions.stream()
      .filter(v -> spec.matches(SemanticVersion.parse(v)))
      .collect(Collectors.toList());
    
    if (matching.isEmpty()) {
      throw new VersionResolutionException(
        String.format("No version of %s matches %s", artifactName, versionRange)
      );
    }
    
    // Return highest matching version
    return matching.stream()
      .map(SemanticVersion::parse)
      .max(Comparator.naturalOrder())
      .map(SemanticVersion::toString)
      .orElseThrow();
  }
  
  /**
   * Parse version range specifier
   * ^1.2.3, ~1.2.3, >=1.0.0, etc.
   */
  private VersionRangeSpecifier parseVersionRange(String rangeString) {
    if (rangeString.startsWith("^")) {
      // Caret: compatible with version
      return new CaretVersionRange(rangeString.substring(1));
    } else if (rangeString.startsWith("~")) {
      // Tilde: approximately equivalent to version
      return new TildeVersionRange(rangeString.substring(1));
    } else if (rangeString.contains("||")) {
      // Or: any of the ranges
      return new OrVersionRange(rangeString);
    } else {
      // Comparison ranges: >=1.0.0 <2.0.0
      return new ComparisonVersionRange(rangeString);
    }
  }
}
```

### 4.3 Dependency Graph Builder

```java
public class DependencyGraphBuilder {
  
  /**
   * Build complete dependency graph for an artifact
   */
  public DependencyGraph buildGraph(
    String artifactName,
    String version,
    ArtifactRegistry registry,
    VersionRangeResolver resolver
  ) throws DependencyResolutionException {
    
    DependencyGraph graph = new DependencyGraph(artifactName, version);
    Set<String> visited = new HashSet<>();
    Queue<String> toProcess = new LinkedList<>();
    
    toProcess.offer(artifactName + "@" + version);
    
    while (!toProcess.isEmpty()) {
      String artifactId = toProcess.poll();
      
      if (visited.contains(artifactId)) {
        continue; // Avoid cycles
      }
      
      visited.add(artifactId);
      
      String[] parts = artifactId.split("@");
      String name = parts[0];
      String v = parts[1];
      
      // Get artifact metadata
      Artifact artifact = registry.getArtifact(name, v);
      
      // Process each dependency
      for (Dependency dep : artifact.getDependencies()) {
        
        // Resolve version range
        String resolvedVersion = resolver.resolveVersionRange(
          dep.getName(), dep.getVersionRange(), registry
        );
        
        String dependencyId = dep.getName() + "@" + resolvedVersion;
        
        // Add to graph
        graph.addDependency(artifactId, dependencyId, dep.getVersionRange());
        
        // Queue for processing (transitive)
        if (!visited.contains(dependencyId)) {
          toProcess.offer(dependencyId);
        }
      }
    }
    
    return graph;
  }
  
  /**
   * Detect circular dependencies
   */
  public List<CircularDependency> detectCycles(DependencyGraph graph) {
    List<CircularDependency> cycles = new ArrayList<>();
    
    for (String node : graph.getNodes()) {
      List<String> path = new ArrayList<>();
      if (hasCycle(graph, node, node, path, new HashSet<>())) {
        cycles.add(new CircularDependency(path));
      }
    }
    
    return cycles;
  }
  
  private boolean hasCycle(
    DependencyGraph graph,
    String start,
    String current,
    List<String> path,
    Set<String> visited
  ) {
    path.add(current);
    visited.add(current);
    
    for (String neighbor : graph.getDependencies(current)) {
      if (neighbor.equals(start) && path.size() > 1) {
        return true; // Found cycle back to start
      }
      if (!visited.contains(neighbor)) {
        if (hasCycle(graph, start, neighbor, path, visited)) {
          return true;
        }
      }
    }
    
    path.remove(path.size() - 1);
    return false;
  }
}
```

### 4.4 Conflict Detector

```java
public class ConflictDetector {
  
  /**
   * Detect version conflicts in dependency set
   */
  public List<DependencyConflict> detectConflicts(
    List<Artifact> artifacts,
    DependencyGraphBuilder graphBuilder,
    ArtifactRegistry registry
  ) throws DependencyResolutionException {
    
    List<DependencyConflict> conflicts = new ArrayList<>();
    Map<String, Set<String>> artifactVersions = new HashMap<>();
    
    // Build complete dependency sets for all artifacts
    for (Artifact artifact : artifacts) {
      DependencyGraph graph = graphBuilder.buildGraph(
        artifact.getName(), artifact.getVersion(), registry, resolver
      );
      
      for (String dep : graph.getAllDependencies()) {
        String[] parts = dep.split("@");
        String name = parts[0];
        String version = parts[1];
        
        artifactVersions.computeIfAbsent(name, k -> new HashSet<>()).add(version);
      }
    }
    
    // Check for conflicts (same artifact name with different versions)
    for (Map.Entry<String, Set<String>> entry : artifactVersions.entrySet()) {
      if (entry.getValue().size() > 1) {
        DependencyConflict conflict = new DependencyConflict(
          entry.getKey(),
          entry.getValue(),
          findConflictingArtifacts(entry.getKey(), artifacts)
        );
        conflicts.add(conflict);
      }
    }
    
    return conflicts;
  }
}
```

### 4.5 Transitive Dependency Calculator

```java
public class TransitiveDependencyCalculator {
  
  /**
   * Get all transitive dependencies with their paths
   */
  public Map<String, List<String>> getTransitiveDependencies(
    DependencyGraph graph,
    String artifactId
  ) {
    Map<String, List<String>> transitive = new HashMap<>();
    Set<String> visited = new HashSet<>();
    
    traverseDependencies(
      graph, artifactId, new ArrayList<>(), visited, transitive
    );
    
    return transitive;
  }
  
  private void traverseDependencies(
    DependencyGraph graph,
    String current,
    List<String> path,
    Set<String> visited,
    Map<String, List<String>> result
  ) {
    if (visited.contains(current)) {
      return; // Avoid cycles
    }
    
    visited.add(current);
    path.add(current);
    
    for (String dependency : graph.getDependencies(current)) {
      List<String> newPath = new ArrayList<>(path);
      newPath.add(dependency);
      result.put(dependency, newPath);
      
      traverseDependencies(graph, dependency, newPath, visited, result);
    }
  }
}
```

---

## 5. Data Structures

### 5.1 Dependency Graph

```java
public class DependencyGraph {
  private String rootArtifact;
  private String rootVersion;
  private Map<String, Set<String>> edges; // artifact -> dependencies
  private Map<String, String> versionRanges; // "from->to" -> range
  
  public void addDependency(String from, String to, String versionRange) {
    edges.computeIfAbsent(from, k -> new HashSet<>()).add(to);
    versionRanges.put(from + "->" + to, versionRange);
  }
  
  public Set<String> getDependencies(String artifact) {
    return edges.getOrDefault(artifact, new HashSet<>());
  }
  
  public Set<String> getNodes() {
    return edges.keySet();
  }
  
  public Set<String> getAllDependencies() {
    Set<String> all = new HashSet<>(edges.keySet());
    for (Set<String> deps : edges.values()) {
      all.addAll(deps);
    }
    return all;
  }
}
```

### 5.2 Dependency Conflict

```java
public record DependencyConflict(
  String artifactName,
  Set<String> conflictingVersions,
  List<String> conflictingDependents,
  String description,
  List<String> suggestedResolutions
) {}
```

---

## 6. Background Job: Dependency Resolution

```java
@Component
public class DependencyResolutionWorker {
  
  @Scheduled(cron = "0 */6 * * *")  // Every 6 hours
  public void resolveNewArtifactDependencies() {
    
    // Find artifacts with unresolved dependencies
    List<Artifact> unresolved = artifactRepository.findUnresolved();
    
    for (Artifact artifact : unresolved) {
      try {
        DependencyGraph graph = graphBuilder.buildGraph(
          artifact.getName(),
          artifact.getVersion(),
          registry,
          resolver
        );
        
        // Store resolved dependencies
        storeDependencyGraph(artifact, graph);
        
        // Detect and store conflicts
        List<DependencyConflict> conflicts = conflictDetector.detectConflicts(
          List.of(artifact), graphBuilder, registry
        );
        
        for (DependencyConflict conflict : conflicts) {
          conflictRepository.save(new DependencyConflictEntity(
            artifact.getId(),
            conflict.description(),
            conflict.suggestedResolutions()
          ));
        }
        
      } catch (Exception e) {
        logger.error("Failed to resolve dependencies for {}", artifact, e);
      }
    }
  }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```java
@Test
void testVersionRangeResolution() { }

@Test
void testCaretVersionRange() { }

@Test
void testTildeVersionRange() { }

@Test
void testComparisonVersionRange() { }

@Test
void testCircularDependencyDetection() { }

@Test
void testConflictDetection() { }

@Test
void testTransitiveDependencies() { }
```

### 7.2 Integration Tests

```java
@Test
void testDependencyGraphBuilding() { }

@Test
void testComplexDependencyResolution() { }

@Test
void testDependencyConflictDetection() { }

@Test
void testReverseDepencies() { }
```

---

## 8. Success Criteria

- [ ] Dependency declarations parsed correctly from artifacts
- [ ] Version ranges resolved to actual versions accurately
- [ ] Dependency graphs constructed for all artifact types
- [ ] Circular dependencies detected
- [ ] Transitive dependencies calculated correctly
- [ ] Conflicts detected between incompatible versions
- [ ] Suggested resolutions provided for conflicts
- [ ] All APIs respond in < 200ms
- [ ] Database efficiently handles complex queries

---

## 9. Next Steps

1. Implement semantic version parsing and comparison
2. Build version range resolver for all supported syntaxes
3. Create dependency graph builder and cycle detector
4. Implement conflict detection logic
5. Build background job for dependency resolution
6. Create all API endpoints
7. Write comprehensive tests
8. Proceed to [Phase 4: Cascade Rebuilds](04_cascade_rebuilds.md)
