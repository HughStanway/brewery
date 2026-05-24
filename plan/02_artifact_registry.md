# Phase 2: Artifact Registry & Storage

**Duration:** 1-2 weeks  
**Focus:** Versioned artifact storage, metadata management, and queryable registry  
**Deliverables:** Artifacts are stored, versioned, and searchable; API for artifact lookup

**Depends on:** Phase 1 (builds produce artifacts)

---

## 1. Architecture Overview

### 1.1 Component Diagram

```
Build Output
  │
  ▼
┌─────────────────────────────────┐
│  Artifact Registry API          │
│  - Store artifact               │
│  - List versions                │
│  - Get metadata                 │
│  - Search/filter                │
└──────────────┬──────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌──────────────┐  ┌─────────────────┐
│  PostgreSQL  │  │  Filesystem     │
│  Metadata    │  │  Storage        │
│              │  │  /store/        │
│ - artifacts  │  │  {name}/        │
│ - metadata   │  │  {version}/     │
│ - tags       │  │  artifact.{ext} │
└──────────────┘  └─────────────────┘
```

### 1.2 Storage Layout

```
/mnt/artifact-store/
├── core-crypto/
│   ├── 2.1.0/
│   │   ├── core-crypto-2.1.0.jar
│   │   ├── core-crypto-2.1.0.jar.sha256
│   │   ├── metadata.json
│   │   └── build.log
│   ├── 2.0.1/
│   ├── 1.9.2/
│   └── latest -> 2.1.0 (symlink)
│
├── auth-lib/
│   ├── 1.4.2/
│   │   ├── auth_lib-1.4.2-py3-none-any.whl
│   │   ├── auth_lib-1.4.2-py3-none-any.whl.sha256
│   │   ├── metadata.json
│   │   └── build.log
│   └── ...
│
└── api-server/
    ├── 0.5.0/
    │   ├── api-server-0.5.0.tar.gz
    │   ├── api-server-0.5.0.tar.gz.sha256
    │   ├── metadata.json
    │   └── build.log
    └── ...
```

---

## 2. Data Model

### 2.1 Artifact Metadata (metadata.json)

```json
{
  "name": "auth-lib",
  "version": "1.4.2",
  "artifact_type": "python-wheel",
  "artifact_id": "550e8400-e29b-41d4-a716-446655440000",
  "build_id": "550e8400-e29b-41d4-a716-446655440001",
  "repository": "myteam/auth-lib",
  "branch": "main",
  "commit": "abc123def456...",
  "commit_message": "Add OAuth2 support (#minor)",
  "built_at": "2026-05-22T14:30:00Z",
  "built_by": "system",
  "file_size_bytes": 125432,
  "checksums": {
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "artifact_url": "/registry/auth-lib/1.4.2/auth_lib-1.4.2-py3-none-any.whl",
  "download_url": "https://registry.homelab/auth-lib/1.4.2/download",
  "dependencies": [
    {
      "name": "core-crypto",
      "version_range": "^2.0.0",
      "resolved_version": "2.1.0"
    },
    {
      "name": "jwt-lib",
      "version_range": ">=1.5.0",
      "resolved_version": "1.6.0"
    }
  ],
  "tags": ["stable", "production"],
  "metadata": {
    "python_version": "3.11",
    "wheel_platform": "any"
  }
}
```

### 2.2 Database Schema Additions

```sql
-- Enhanced artifacts table
ALTER TABLE artifacts ADD COLUMN (
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  download_count INT DEFAULT 0,
  last_accessed_at TIMESTAMP,
  is_latest BOOLEAN DEFAULT FALSE,
  deprecated_at TIMESTAMP
);

-- New artifact_metadata table (for full-text search)
CREATE TABLE artifact_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id),
  description TEXT,
  keywords TEXT,
  license TEXT,
  homepage_url TEXT,
  repository_url TEXT,
  maintainers TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New artifact_tags table
CREATE TABLE artifact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id),
  tag TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(artifact_id, tag)
);

-- New version_aliases table (for special version names)
CREATE TABLE version_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_name TEXT NOT NULL,
  alias TEXT NOT NULL,
  actual_version TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(artifact_name, alias)
);

-- Create indices for search
CREATE INDEX idx_artifacts_tags ON artifact_tags(tag);
CREATE INDEX idx_artifacts_metadata_keywords ON artifact_metadata USING GIN(to_tsvector('english', keywords));
CREATE INDEX idx_artifacts_name ON artifacts(name);
```

---

## 3. Registry API Specification

### 3.1 Artifact Upload

**POST** `/api/registry/artifacts`

```json
Request Headers:
  Content-Type: multipart/form-data
  Authorization: Bearer {token}

Request Body:
{
  "artifact": {file},
  "name": "auth-lib",
  "version": "1.4.2",
  "artifact_type": "python-wheel",
  "build_id": "uuid-123",
  "repository": "myteam/auth-lib",
  "branch": "main",
  "commit": "abc123...",
  "dependencies": [
    { "name": "core-crypto", "version_range": "^2.0.0" }
  ]
}

Response (201 Created):
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "auth-lib",
  "version": "1.4.2",
  "artifact_url": "/registry/auth-lib/1.4.2/auth_lib-1.4.2-py3-none-any.whl",
  "download_url": "https://registry.homelab/auth-lib/1.4.2/download",
  "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

### 3.2 List Artifact Versions

**GET** `/api/registry/artifacts/{name}`

```json
Response:
{
  "name": "auth-lib",
  "versions": [
    {
      "version": "1.4.2",
      "artifact_type": "python-wheel",
      "created_at": "2026-05-22T14:30:00Z",
      "file_size_bytes": 125432,
      "tags": ["stable", "production"],
      "download_url": "https://registry.homelab/auth-lib/1.4.2/download"
    },
    {
      "version": "1.4.1",
      "artifact_type": "python-wheel",
      "created_at": "2026-05-20T10:15:00Z",
      "file_size_bytes": 123456,
      "tags": ["stable"],
      "download_url": "https://registry.homelab/auth-lib/1.4.1/download"
    }
  ],
  "latest": "1.4.2"
}
```

### 3.3 Get Specific Artifact

**GET** `/api/registry/artifacts/{name}/{version}`

```json
Response:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "auth-lib",
  "version": "1.4.2",
  "artifact_type": "python-wheel",
  "created_at": "2026-05-22T14:30:00Z",
  "file_size_bytes": 125432,
  "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "download_url": "https://registry.homelab/auth-lib/1.4.2/download",
  "repository": "myteam/auth-lib",
  "branch": "main",
  "commit": "abc123...",
  "dependencies": [
    {
      "name": "core-crypto",
      "version_range": "^2.0.0",
      "resolved_version": "2.1.0"
    }
  ],
  "tags": ["stable", "production"],
  "metadata": {
    "python_version": "3.11",
    "wheel_platform": "any"
  }
}
```

### 3.4 Download Artifact

**GET** `/api/registry/artifacts/{name}/{version}/download`

```
Response:
  200 OK with binary artifact
  Content-Type: application/octet-stream
  Content-Disposition: attachment; filename="auth_lib-1.4.2-py3-none-any.whl"
  Content-Length: 125432
```

### 3.5 Search Artifacts

**GET** `/api/registry/search?q={query}&type={type}&tag={tag}&limit=20&offset=0`

```json
Response:
{
  "total": 42,
  "limit": 20,
  "offset": 0,
  "results": [
    {
      "name": "auth-lib",
      "latest_version": "1.4.2",
      "artifact_type": "python-wheel",
      "description": "OAuth2 and JWT authentication library",
      "tags": ["stable", "production"],
      "last_updated": "2026-05-22T14:30:00Z"
    }
  ]
}
```

### 3.6 Tag Management

**POST** `/api/registry/artifacts/{name}/{version}/tags`

```json
Request:
{
  "tags": ["stable", "production"]
}

Response:
{
  "name": "auth-lib",
  "version": "1.4.2",
  "tags": ["stable", "production"]
}
```

**DELETE** `/api/registry/artifacts/{name}/{version}/tags/{tag}`

```
Response: 204 No Content
```

### 3.7 Version Aliases

**POST** `/api/registry/aliases`

```json
Request:
{
  "name": "auth-lib",
  "alias": "latest",
  "target_version": "1.4.2"
}

Response:
{
  "name": "auth-lib",
  "alias": "latest",
  "target_version": "1.4.2",
  "actual_version": "1.4.2"
}
```

**GET** `/api/registry/aliases/{name}/{alias}`

```json
Response:
{
  "name": "auth-lib",
  "alias": "latest",
  "target_version": "1.4.2"
}
```

---

## 4. Implementation Components

### 4.1 Artifact Storage Manager

```java
public interface ArtifactStorageManager {
  
  /**
   * Store an artifact file and generate metadata
   */
  ArtifactMetadata storeArtifact(
    String name,
    String version,
    InputStream artifactStream,
    Map<String, String> metadata
  ) throws IOException;
  
  /**
   * Retrieve artifact file
   */
  InputStream getArtifact(String name, String version) throws IOException;
  
  /**
   * Delete artifact from storage
   */
  void deleteArtifact(String name, String version) throws IOException;
  
  /**
   * Calculate checksum
   */
  String calculateChecksum(InputStream stream) throws IOException;
  
  /**
   * List all versions of an artifact
   */
  List<String> listVersions(String name);
  
  /**
   * Get storage path for artifact
   */
  Path getArtifactPath(String name, String version);
}
```

### 4.2 Registry Query Service

```java
public interface ArtifactRegistryService {
  
  /**
   * Register a new artifact
   */
  Artifact registerArtifact(ArtifactRegistration registration);
  
  /**
   * Find artifact by name and version
   */
  Optional<Artifact> findArtifact(String name, String version);
  
  /**
   * List all versions of an artifact
   */
  List<ArtifactVersion> listVersions(String name);
  
  /**
   * Search artifacts by query
   */
  Page<Artifact> search(ArtifactSearchCriteria criteria);
  
  /**
   * Tag an artifact version
   */
  void tagArtifact(String name, String version, String tag);
  
  /**
   * Create version alias (e.g., "latest")
   */
  void createVersionAlias(String name, String alias, String targetVersion);
  
  /**
   * Resolve version range (e.g., "^1.2.0") to actual version
   */
  String resolveVersionRange(String name, String versionRange);
  
  /**
   * Get artifact metadata
   */
  ArtifactMetadata getMetadata(String name, String version);
  
  /**
   * Mark artifact as latest
   */
  void markAsLatest(String name, String version);
  
  /**
   * Get download statistics
   */
  DownloadStats getDownloadStats(String name, String version);
}
```

### 4.3 Metadata Handler

```java
public class ArtifactMetadataHandler {
  
  /**
   * Generate metadata.json file
   */
  public void generateMetadata(
    Artifact artifact,
    Path targetPath,
    ArtifactDependencies dependencies
  ) throws IOException {
    
    Map<String, Object> metadata = new LinkedHashMap<>();
    metadata.put("name", artifact.getName());
    metadata.put("version", artifact.getVersion());
    metadata.put("artifact_type", artifact.getType());
    metadata.put("artifact_id", artifact.getId());
    metadata.put("build_id", artifact.getBuildId());
    metadata.put("repository", artifact.getRepository());
    metadata.put("branch", artifact.getBranch());
    metadata.put("commit", artifact.getCommit());
    metadata.put("built_at", artifact.getCreatedAt());
    metadata.put("file_size_bytes", artifact.getFileSize());
    metadata.put("checksums", Map.of("sha256", artifact.getChecksum()));
    metadata.put("dependencies", dependencies.toDependencyList());
    
    ObjectMapper mapper = new ObjectMapper();
    mapper.writerWithDefaultPrettyPrinter()
      .writeValue(new File(targetPath.toFile(), "metadata.json"), metadata);
  }
  
  /**
   * Parse metadata from file
   */
  public ArtifactMetadata parseMetadata(Path metadataPath) throws IOException {
    ObjectMapper mapper = new ObjectMapper();
    return mapper.readValue(metadataPath.toFile(), ArtifactMetadata.class);
  }
}
```

### 4.4 Download Tracking

```java
public class ArtifactDownloadTracker {
  
  @Autowired
  private ArtifactRepository artifactRepository;
  
  public void recordDownload(String artifactId, String userAgent) {
    Artifact artifact = artifactRepository.findById(artifactId);
    
    artifact.setDownloadCount(artifact.getDownloadCount() + 1);
    artifact.setLastAccessedAt(Instant.now());
    
    artifactRepository.save(artifact);
    
    // Log for analytics
    logger.info("Artifact downloaded: {} (user-agent: {})", artifactId, userAgent);
  }
}
```

---

## 5. Semantic Versioning Support

### 5.1 Version Parsing & Resolution

```java
public class SemanticVersionResolver {
  
  /**
   * Parse semantic version string
   * Examples: 1.4.2, 1.4.2-rc.1, 1.4.2+build.123
   */
  public SemanticVersion parse(String versionString) {
    // Implement SemVer parsing
    // https://semver.org/
  }
  
  /**
   * Resolve version range to actual version
   * Examples:
   *   ^1.2.3 -> >=1.2.3 <2.0.0
   *   ~1.2.3 -> >=1.2.3 <1.3.0
   *   >=1.0.0 <2.0.0
   */
  public String resolveVersionRange(
    String name,
    String versionRange,
    List<String> availableVersions
  ) {
    // Return highest version matching range
  }
  
  /**
   * Compare two semantic versions
   */
  public int compare(SemanticVersion v1, SemanticVersion v2) {
    // Returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
  }
}
```

---

## 6. Storage Policies

### 6.1 Retention & Cleanup

```yaml
retention:
  # Keep last 10 versions of each artifact
  max_versions_per_artifact: 10
  
  # Keep tagged versions indefinitely
  keep_tagged_versions: true
  
  # Delete untagged versions older than 30 days
  untagged_retention_days: 30
  
  # Delete versions marked as deprecated
  delete_deprecated: true

cleanup:
  # Run cleanup daily at 2 AM
  schedule: "0 2 * * *"
  
  # Dry-run first
  dry_run: false
```

### 6.2 Quotas & Limits

```yaml
quotas:
  # Max storage per artifact type
  max_storage_per_type:
    binary: 10gb
    jar: 5gb
    wheel: 3gb
    npm-package: 2gb
  
  # Max artifact file size
  max_artifact_size: 500mb
  
  # Max total registry size
  max_total_storage: 100gb
```

---

## 7. Security Considerations

### 7.1 Checksum Verification

```java
public class ChecksumValidator {
  
  public boolean verify(
    InputStream artifactStream,
    String expectedChecksum,
    String algorithm
  ) throws IOException {
    
    MessageDigest digest = MessageDigest.getInstance(algorithm);
    byte[] buffer = new byte[8192];
    int bytesRead;
    
    while ((bytesRead = artifactStream.read(buffer)) != -1) {
      digest.update(buffer, 0, bytesRead);
    }
    
    String computedChecksum = HexFormat.of().formatHex(digest.digest());
    return computedChecksum.equalsIgnoreCase(expectedChecksum);
  }
}
```

### 7.2 Access Control

```java
@Configuration
public class RegistrySecurityConfig {
  
  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .authorizeHttpRequests(authz -> authz
        // Artifact uploads require authentication
        .requestMatchers(HttpMethod.POST, "/api/registry/**")
          .authenticated()
        // Artifact downloads are public (for now)
        .requestMatchers(HttpMethod.GET, "/api/registry/*/*/download")
          .permitAll()
        // Other registry queries are public
        .requestMatchers(HttpMethod.GET, "/api/registry/**")
          .permitAll()
        .anyRequest()
          .authenticated()
      )
      .httpBasic(Customizer.withDefaults());
    
    return http.build();
  }
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```java
@Test
void testArtifactMetadataGeneration() { }

@Test
void testVersionRangeResolution() { }

@Test
void testChecksumCalculation() { }

@Test
void testSemanticVersionComparison() { }
```

### 8.2 Integration Tests

```java
@Test
void testArtifactUploadAndRetrieval() { }

@Test
void testArtifactSearch() { }

@Test
void testVersionAliasing() { }

@Test
void testTagManagement() { }

@Test
void testDownloadTracking() { }
```

---

## 9. Success Criteria

- [ ] Artifacts from Phase 1 builds are stored with correct structure
- [ ] Metadata is generated and stored accurately
- [ ] All registry APIs respond correctly
- [ ] Search functionality works for artifact names and tags
- [ ] Version resolution handles semantic versioning correctly
- [ ] Download tracking records all artifact access
- [ ] Checksums are calculated and verified
- [ ] Database queries complete in < 100ms
- [ ] Artifact storage is organized and maintainable

---

## 10. Next Steps

1. Implement artifact storage manager with filesystem operations
2. Extend database schema with registry tables
3. Create registry API controllers
4. Implement semantic version resolver
5. Build artifact search functionality
6. Set up download tracking
7. Write comprehensive tests
8. Proceed to [Phase 3: Dependency Resolution](03_dependency_resolution.md)
