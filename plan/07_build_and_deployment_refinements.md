# Build & Deployment System Refinements

This document outlines the architectural enhancements and refinements proposed for the **Brewery** build and deployment engines to support advanced deployment use cases (e.g., microservices with external system dependencies, Dockerfile-centric builds, multi-file artifacts, and startup configuration hooks).

---

## 1. Identified Architectural Flaws

During the onboarding of the `speedtest` application (a Go backend with a TypeScript frontend and a local Speedtest CLI binary dependency), the following system limitations were identified:

### 1.1 Hardcoded Runtime Wrapper Images (Deployment Engine)
* **Status:** Current deployment configuration hardcodes runtime images for non-docker deployments in `DeploymentServiceImpl.java`:
  * `"binary"` $\rightarrow$ `ubuntu:22.04`
  * `"jar"` $\rightarrow$ `eclipse-temurin:21-jre`
  * `"python-app"` $\rightarrow$ `python:3.10-slim`
* **Limitation:** Deployed apps requiring external system utilities (like `speedtest-cli`, `curl`, `ffmpeg`, or custom C-shared libraries) cannot run in the bare default wrapper containers.

### 1.2 No Native Docker Image Artifact Support
* **Status:** The build engine runs in a Docker-in-Docker (DinD) sidecar, but only outputs files (copied from the build workspace). It cannot build a Docker image, push it to a local registry, and deploy it.
* **Limitation:** Containerized applications that already define a `Dockerfile` cannot be built and run naturally within their intended environment.

### 1.3 Single-File Artifact Restriction (Build & Registry Engines)
* **Status:** `BuildExecutorImpl.java` grabs only the first file matching a wildcard pattern (`files.get(0)`). The storage manager only copies a single file stream per artifact version.
* **Limitation:** Applications requiring additional side-by-side files (such as a database schema, asset folders, configuration templates, or launch helper scripts) cannot be registered under a single version.

### 1.4 Lack of Startup Initialization Hooks (Deployment Engine)
* **Status:** Deployed containers execute the registered artifact directly as the container's PID 1 entrypoint.
* **Limitation:** There is no provision for pre-start commands (e.g., executing database migrations, installing runtime-only dependencies, or dynamically creating directories).

---

## 2. Proposed Solutions & Implementations

### 2.1 Solution 1: Customizable Deployment Base Images
Allow the `deploy.yaml` specification to override the default hardcoded wrapper image for `binary`, `jar`, and `python-app` deployments.

#### YAML Schema Change (`deploy.yaml`):
```yaml
services:
  speedtest:
    artifact: "speedtest@latest"
    type: "binary"
    runtimeImage: "myorg/speedtest-runtime-base:latest" # Custom override
```

#### Code Modifications:
In `DeploymentServiceImpl.java`, resolve the `runtimeImage` field from the spec:
```java
String image = service.getRuntimeImage();
if (image == null) {
    // Fall back to defaults
    if ("binary".equalsIgnoreCase(service.getType())) {
        image = "ubuntu:22.04";
    }
    // ...
}
serviceMap.put("image", image);
```

---

### 2.2 Solution 2: Local Docker Registry & Native Docker Artifacts
Integrate a local Docker registry to store and pull custom built images directly within Brewery's network.

#### Architecture:
```
[Build Executor] ──(build & tag)──> [Local Registry (registry:5000)]
                                                  │
                                            (pull image)
                                                  ▼
                                       [DinD Deployment Daemon]
```

#### Step A: docker-compose.yml Update
Add a private Docker registry container sharing the internal `brewery_net` network:
```yaml
  registry:
    image: registry:2
    restart: unless-stopped
    volumes:
      - registry_data:/var/lib/registry
    networks:
      - brewery_net
```

#### Step B: Build Engine support for `"docker-image"` in `build.yaml`
Add support for the `docker-image` artifact type. When specified, the build executor runs `docker build` and pushes to the local registry:
```yaml
artifacts:
  - name: "speedtest-web"
    pattern: "backend/Dockerfile" # Points to the Dockerfile to compile
    type: "docker-image"
```
```java
// Inside BuildExecutorImpl.java:
if ("docker-image".equalsIgnoreCase(artConfig.getType())) {
    String imageTag = "registry:5000/" + artConfig.getName() + ":" + version;
    // 1. Run docker build
    dockerClient.buildImageCmd(new File(workspaceDir, artConfig.getPattern()))
                .withTags(Set.of(imageTag)).start().awaitCompletion();
    // 2. Run docker push
    dockerClient.pushImageCmd(imageTag).start().awaitCompletion();
    
    // 3. Register imageTag as storagePath in the database
    artifact.setStoragePath(imageTag);
}
```

---

### 2.3 Solution 3: Multi-File Directory Archiving
Allow the build engine to package multiple files or a directory into a single tarball/zip archive, and unpack it at deployment time.

#### Code Modifications:
* **Build Engine:** If the glob pattern matches multiple files or a directory, compress the folder into `artifact.tar.gz` and save it to the registry.
* **Deployment Engine:** If a service of type `binary`, `jar`, or `python-app` is associated with a `.tar.gz` storage path:
  1. Generate a startup wrapper script inside the deployment container.
  2. The script unpacks `/mnt/artifact-store/.../artifact.tar.gz` into the container workspace `/app`.
  3. Executes the target binary from `/app`.

---

### 2.4 Solution 4: Service Initialization Hooks
Add support for executing a list of initialization commands right before launching the primary binary.

#### YAML Schema Change (`deploy.yaml`):
```yaml
services:
  web-app:
    artifact: "speedtest@latest"
    type: "binary"
    init:
      - "apt-get update && apt-get install -y speedtest"
```

#### Code Modifications:
In `DeploymentServiceImpl.java`, if `init` steps are defined:
1. Generate an `entrypoint.sh` wrapper script containing the `init` shell commands.
2. Configure the docker-compose service configuration to mount and execute this `entrypoint.sh`.
