'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  Terminal, 
  Cpu, 
  Layers, 
  ShieldAlert, 
  Network, 
  Activity, 
  Code,
  ChevronRight,
  RefreshCw,
  Hammer,
  Package,
  Server,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  FileCode,
  Lock,
  Globe,
  Database
} from 'lucide-react';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'configs' | 'architecture' | 'api' | 'troubleshooting'>('overview');

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-[var(--primary)]" />
          Documentation & Platform Guide
        </h2>
        <p className="text-base text-gray-500 leading-relaxed">
          Learn the basics of Brewery, configure build/deployment YAML specifications, and explore backend subsystem internals.
        </p>
      </div>

      {/* Tabs / Navigator Top Bar */}
      <div className="border-b border-[var(--card-border)] pb-px">
        <div className="flex flex-wrap gap-2 overflow-y-hidden pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-500 text-[var(--primary)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            🏠 Getting Started
          </button>
          <button
            onClick={() => setActiveTab('configs')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'configs'
                ? 'border-blue-500 text-[var(--primary)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            📄 Config Specifications
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-blue-500 text-[var(--primary)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            🔄 Subsystem Internals
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'api'
                ? 'border-blue-500 text-[var(--primary)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            🔌 API Reference
          </button>
          <button
            onClick={() => setActiveTab('troubleshooting')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'troubleshooting'
                ? 'border-blue-500 text-[var(--primary)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            ❓ FAQ & Troubleshooting
          </button>
        </div>
      </div>

      {/* 🏠 Getting Started Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-[var(--primary)]" />
              What is Brewery?
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Brewery is an integrated, state-of-the-art <strong>Continuous Build, Versioning & Deployment Platform</strong>. It automates containerized builds, maintains a secure artifact registry, maps transitive dependencies in real-time, and schedules automated cascade rebuilds when upstream libraries change.
            </p>
          </div>

          {/* Quickstart Guide */}
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Developer Quickstart Guide
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 border border-[var(--card-border)] p-4 rounded-xl bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-[var(--primary)] flex items-center justify-center font-bold text-sm">1</div>
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Authentication</h4>
                <p className="text-xs text-gray-500">Log in with credentials. Standard accounts allow read access, while Administrator accounts have full configuration access.</p>
              </div>

              <div className="space-y-2 border border-[var(--card-border)] p-4 rounded-xl bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold text-sm">2</div>
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Define Build Spec</h4>
                <p className="text-xs text-gray-500">Add a <code>build.yaml</code> to the root of your Git repository. Define your compiler image, build commands, and output artifact paths.</p>
              </div>

              <div className="space-y-2 border border-[var(--card-border)] p-4 rounded-xl bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-sm">3</div>
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Publish Artifacts</h4>
                <p className="text-xs text-gray-500">Run a build. On success, the platform extracts your build outputs, hashes them (SHA-256), and registers them in the Artifact Registry.</p>
              </div>

              <div className="space-y-2 border border-[var(--card-border)] p-4 rounded-xl bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">4</div>
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Deploy Stacks</h4>
                <p className="text-xs text-gray-500">Write a <code>deployment.yaml</code> referencing your artifacts. Launch your containers, configure environment variables, and manage rollouts.</p>
              </div>
            </div>
          </div>

          {/* User Roles Card */}
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-500" />
              Role-Based Access Control (RBAC)
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Brewery secures dashboard access and backend REST APIs using two main user roles:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-5 border border-purple-200 rounded-xl bg-purple-50 space-y-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200">ADMIN</span>
                <p className="text-xs text-purple-700 leading-relaxed font-semibold">
                  Administrators have full read-write privileges over all pipelines and deployments, and exclusive access to the User Settings page to add users, change roles, and reset passwords.
                </p>
              </div>
              <div className="p-5 border border-blue-200 rounded-xl bg-blue-50 space-y-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">USER</span>
                <p className="text-xs text-blue-700 leading-relaxed font-semibold">
                  Standard Users can view dashboards, monitor active build runs, inspect artifact dependencies, and observe live container deployment rollouts, but cannot alter configuration settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📄 Config Specifications Content */}
      {activeTab === 'configs' && (
        <div className="space-y-10">

          {/* ── build.yaml ─────────────────────────────────────── */}
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-8">
            <div className="flex items-center gap-3 border-b border-[var(--card-border)] pb-4">
              <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-xl"><FileCode className="w-6 h-6" /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Build Specification — build.yaml</h3>
                <p className="text-xs text-gray-500">Place this file in the root of your Git repository. It is <strong>required</strong> for every project Brewery builds.</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full annotated example</span>
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl overflow-x-auto font-mono text-[11px] text-violet-300 leading-relaxed select-all">
                <pre>{`metadata:
  name: "my-service"          # Required. Registry artifact name.
  versionScheme: "semver"     # Optional. Reserved for future use.

build:
  image: "golang:1.21-alpine" # Required. Builder container image.
  timeoutSeconds: 1800        # Optional. Kill timeout in seconds. Default: 1800.
  memory: "4g"                # Optional. Memory cap for builder container (e.g. "512m", "2g").
  platform: "linux/amd64"     # Optional. Platform for docker pull/create (e.g. "linux/arm64").

steps:
  setup: |                    # Optional. Runs first. Dependency installs, env prep.
    go mod download
  build: |                    # Optional. Runs second. Main compilation command.
    go build -o dist/myapp ./cmd/server
  test: |                     # Optional. Runs third. Tests/linting. Non-zero exit fails the build.
    go test ./...

artifacts:
  - name: "my-service"        # Optional. Defaults to metadata.name if omitted.
    type: "binary"            # Required. One of: binary, jar, python-app, docker-image.
    pattern: "dist/myapp"     # Required. Glob path to output file(s) in workspace.

  - name: "my-service-image"  # Multiple artifacts per project are supported.
    type: "docker-image"
    pattern: "backend/Dockerfile"  # Path to Dockerfile, or directory containing one.

dependencies:
  - name: "common-utils"      # Required. Must match a registered artifact name.
    version_range: "^1.0.0"  # Required. Semver range. Also accepted as versionRange.
    type: "jar"               # Optional. Informational type hint.
    optional: false           # Optional. If true, missing dep does not fail the build.`}</pre>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-violet-700 uppercase tracking-wider flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5" />metadata</h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="border-b border-[var(--card-border)] text-gray-400 font-bold"><th className="pb-2 pr-4">Field</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Required</th><th className="pb-2">Description</th></tr></thead>
                <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                  <tr><td className="py-2 pr-4 font-mono font-bold">metadata.name</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-red-500 font-semibold">Required</td><td className="py-2">Canonical name for this project in the registry. Used as the image/artifact name and must be unique per project.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">metadata.versionScheme</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Parsed and stored but reserved for future use. Intended to support alternative versioning strategies (e.g. <code>semver</code>, <code>calver</code>).</td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-violet-700 uppercase tracking-wider flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5" />build</h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="border-b border-[var(--card-border)] text-gray-400 font-bold"><th className="pb-2 pr-4">Field</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Required</th><th className="pb-2">Description</th></tr></thead>
                <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                  <tr><td className="py-2 pr-4 font-mono font-bold">build.image</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-red-500 font-semibold">Required</td><td className="py-2">Docker image for the ephemeral builder container (e.g. <code>maven:3.9</code>, <code>golang:1.21-alpine</code>, <code>node:20</code>). Always pulled fresh before the build runs.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">build.timeoutSeconds</td><td className="py-2 pr-4 font-mono text-gray-500">integer</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Seconds the engine waits before killing the builder container and marking the build failed. <strong>Default: 1800</strong> (30 min).</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">build.memory</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Maximum RAM for the builder container. Accepts suffixes <code>k</code>, <code>m</code>, <code>g</code> (e.g. <code>"512m"</code>, <code>"4g"</code>). Passed directly to Docker's <code>--memory</code> flag on container creation.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">build.platform</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Target platform for <code>docker pull</code> and <code>docker create</code> (e.g. <code>"linux/amd64"</code>, <code>"linux/arm64"</code>). Useful for cross-compilation or ARM environments.</td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-violet-700 uppercase tracking-wider flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5" />steps</h4>
              <p className="text-xs text-gray-500">All three keys are optional. They are concatenated in order into a single <code>set -e</code> shell script injected into the builder container and executed from <code>/workspace</code>. A labelled echo precedes each step in the build log.</p>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="border-b border-[var(--card-border)] text-gray-400 font-bold"><th className="pb-2 pr-4">Field</th><th className="pb-2 pr-4">Required</th><th className="pb-2">Description</th></tr></thead>
                <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                  <tr><td className="py-2 pr-4 font-mono font-bold">steps.setup</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Runs <strong>first</strong>. Environment preparation: installing OS packages, downloading dependencies, setting config files.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">steps.build</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Runs <strong>second</strong>. Main compilation (e.g. <code>mvn package</code>, <code>go build</code>, <code>npm run build</code>). Output must be written inside <code>/workspace</code> to be accessible after the container exits.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">steps.test</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Runs <strong>third</strong>. Unit tests, integration tests, linting. A non-zero exit code marks the build failed and no artifact is registered.</td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-violet-700 uppercase tracking-wider flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5" />artifacts</h4>
              <p className="text-xs text-gray-500">A list of one or more outputs to register after a successful build. At least one entry is required. Multiple artifacts can be produced from a single build run.</p>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="border-b border-[var(--card-border)] text-gray-400 font-bold"><th className="pb-2 pr-4">Field</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Required</th><th className="pb-2">Description</th></tr></thead>
                <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                  <tr><td className="py-2 pr-4 font-mono font-bold">artifacts[].name</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Registry name for this artifact. Defaults to <code>metadata.name</code> if omitted.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">artifacts[].type</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-red-500 font-semibold">Required</td><td className="py-2">
                    Controls how the output is processed and deployed:
                    <ul className="mt-1.5 space-y-1 list-disc list-inside text-gray-600">
                      <li><code>binary</code> — compiled executable. Deployed via <code>exec</code> in a runtime container (default: <code>ubuntu:22.04</code>).</li>
                      <li><code>jar</code> — Java archive. Deployed via <code>java -jar</code> (default runtime: <code>eclipse-temurin:21-jre</code>).</li>
                      <li><code>python-app</code> — Python script/package. Deployed via <code>python</code> (default runtime: <code>python:3.10-slim</code>).</li>
                      <li><code>docker-image</code> — runs <code>docker build</code> against a Dockerfile, pushes the image to the internal registry at <code>registry:5000</code>, and stores an image-tag pointer. No binary bytes stored in the artifact store.</li>
                    </ul>
                  </td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">artifacts[].pattern</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-red-500 font-semibold">Required</td><td className="py-2">
                    For <code>binary</code>, <code>jar</code>, <code>python-app</code>: glob path relative to workspace root (e.g. <code>target/*.jar</code>, <code>dist/myapp</code>). Multiple matched files are automatically bundled into a <code>.tar.gz</code> archive with the first file as the <code>primaryEntrypoint</code>.<br />
                    For <code>docker-image</code>: path to the Dockerfile (e.g. <code>backend/Dockerfile</code>) or a directory containing one. The repo root is always the Docker build context, making all files accessible to <code>COPY</code> instructions.
                  </td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-violet-700 uppercase tracking-wider flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5" />dependencies</h4>
              <p className="text-xs text-gray-500">Declares which other Brewery-managed artifacts this project depends on. Drives the dependency graph and automatic cascade rebuilds when upstream artifacts publish new versions.</p>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="border-b border-[var(--card-border)] text-gray-400 font-bold"><th className="pb-2 pr-4">Field</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Required</th><th className="pb-2">Description</th></tr></thead>
                <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                  <tr><td className="py-2 pr-4 font-mono font-bold">dependencies[].name</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-red-500 font-semibold">Required</td><td className="py-2">Exact name of the upstream artifact as registered in the Brewery registry.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">dependencies[].version_range</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-red-500 font-semibold">Required</td><td className="py-2">Semver constraint the upstream version must satisfy to trigger a cascade rebuild. Accepts <code>^</code>, <code>~</code>, <code>x</code> wildcards, and exact versions. Also accepted as <code>versionRange</code> (camelCase — both are supported).</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">dependencies[].type</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Informational artifact type hint (e.g. <code>jar</code>). Stored in metadata but does not affect build behaviour.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">dependencies[].optional</td><td className="py-2 pr-4 font-mono text-gray-500">boolean</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">When <code>true</code>, a missing or unresolvable upstream artifact does not cause the build to fail. Default: <code>false</code>.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── deployment.yaml ───────────────────────────────── */}
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-8">
            <div className="flex items-center gap-3 border-b border-[var(--card-border)] pb-4">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl"><Globe className="w-6 h-6" /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Deployment Specification — deployment.yaml</h3>
                <p className="text-xs text-gray-500">Describes which artifacts to run, how to configure them, and how to manage rollouts and health checks.</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full annotated example</span>
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl overflow-x-auto font-mono text-[11px] text-emerald-300 leading-relaxed select-all">
                <pre>{`version: 1

deployment:
  name: "my-stack"              # Required. Unique stack identifier. Used as docker compose -p name.
  description: "My application" # Optional. Human-readable label stored with the deployment.

services:
  backend:
    artifact: "my-service@^1.0.0"    # Brewery artifact ref: name@semver-range.
                                      # Use name@latest to always pull the newest version.
                                      # No @ = raw Docker image (e.g. "postgres:15") pulled directly.
    type: "jar"                       # Required for Brewery artifacts. One of: binary, jar, python-app, docker-image.
    replicas: 2                       # Optional. Docker Compose deploy.replicas (applied only if > 1).
    runtimeImage: "eclipse-temurin:21-jre"  # Optional. Overrides the default runtime image for the service type.
    ports:
      - "8080:8080"                   # Optional. Host:container port mappings.
    volumes:
      - "app_data:/app/data"          # Optional. Named volumes or bind mounts.
    environment:
      SPRING_PROFILES_ACTIVE: "prod"  # Optional. Key/value env vars injected into the container.
      DB_URL: "jdbc:postgresql://db:5432/mydb"
    depends_on:
      - "db"                          # Optional. Services in this stack that must start first.
    init:
      - "chmod +x /app/migrate.sh"    # Optional. Shell commands run BEFORE the main process starts.
      - "/app/migrate.sh"             # Triggers automatic wrapper entrypoint script generation.
    healthCheck:
      endpoint: "GET http://172.20.0.10:8080/actuator/health"  # HTTP GET check. 2xx-3xx = healthy.
      # command: "curl -f http://localhost:8080/health"         # Alternative: docker exec command.
      interval: "30s"                 # Polling frequency (informational; stored in spec).
      timeout: "5s"                   # Response timeout (informational; stored in spec).
      retries: 3                      # Successes needed to recover healthy state (stored in spec).
      unhealthyThreshold: 2           # Consecutive failures before marking unhealthy (stored in spec).
    resources:
      memory: "1g"                    # Informational. Stored in spec; not enforced at compose level.
      cpus: "1.0"                     # Informational. Stored in spec; not enforced at compose level.

  db:
    artifact: "postgres:15"           # Raw Docker Hub image — no @ means direct pull, no registry lookup.
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: "secret"

volumes:
  app_data: {}                        # Named volume declarations. Passed verbatim to docker compose.

networks:
  my-network:                         # Custom network definitions. Passed verbatim to docker compose.
    driver: bridge

policies:
  strategy: "rolling"                 # Informational deployment strategy label.
  waitForHealthy: true                # Reserved for future stepper gating logic.
  healthCheckTimeout: "120s"          # Reserved for future stepper timeout configuration.

rollback:
  automatic: true                     # ACTIVE. On rollout failure, automatically re-applies the last
                                      # successful version's stored docker-compose config.
  onFailure: true                     # Informational alias for automatic (not separately evaluated).
  keepPreviousVersions: 5             # Informational. Version pruning not yet automated.`}</pre>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5" />Top-level fields</h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="border-b border-[var(--card-border)] text-gray-400 font-bold"><th className="pb-2 pr-4">Field</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Required</th><th className="pb-2">Description</th></tr></thead>
                <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                  <tr><td className="py-2 pr-4 font-mono font-bold">version</td><td className="py-2 pr-4 font-mono text-gray-500">integer</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Schema version. Parsed but not validated. Use <code>1</code>.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">deployment.name</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-red-500 font-semibold">Required</td><td className="py-2">Unique stack identifier. Must match the name used when registering via the API/UI. Used as the Docker Compose project name (<code>-p</code> flag) and as the prefix for all container names (<code>name-serviceName</code>).</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">deployment.description</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Human-readable description stored with the deployment record.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">volumes</td><td className="py-2 pr-4 font-mono text-gray-500">map</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Named Docker volume declarations. Passed verbatim into the generated <code>docker-compose.yml</code>. For binary artifact types the engine automatically adds an <code>artifact_store</code> external volume.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">networks</td><td className="py-2 pr-4 font-mono text-gray-500">map</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Custom Docker network definitions. Passed verbatim into the generated <code>docker-compose.yml</code> networks section.</td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5" />{'services.<name>'}</h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="border-b border-[var(--card-border)] text-gray-400 font-bold"><th className="pb-2 pr-4">Field</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Required</th><th className="pb-2">Description</th></tr></thead>
                <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                  <tr><td className="py-2 pr-4 font-mono font-bold">artifact</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-red-500 font-semibold">Required</td><td className="py-2">
                    Two formats:
                    <ul className="mt-1 space-y-0.5 list-disc list-inside text-gray-600">
                      <li><code>name@range</code> — Brewery registry lookup (e.g. <code>my-service@^1.2.0</code>, <code>my-service@latest</code>). Resolved against all available versions at deploy time.</li>
                      <li>No <code>@</code> — raw Docker image pulled directly by Compose (e.g. <code>postgres:15</code>). No registry lookup occurs.</li>
                    </ul>
                  </td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">type</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Conditional</td><td className="py-2">Required when using <code>name@range</code> format. One of <code>binary</code>, <code>jar</code>, <code>python-app</code>, <code>docker-image</code>. Not needed for raw Docker image references.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">replicas</td><td className="py-2 pr-4 font-mono text-gray-500">integer</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Number of container replicas. Only applied when value is greater than 1 (maps to <code>deploy.replicas</code> in docker-compose).</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">runtimeImage</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Override the default runtime container image for non-docker-image types. Defaults: <code>binary</code> → <code>ubuntu:22.04</code>, <code>jar</code> → <code>eclipse-temurin:21-jre</code>, <code>python-app</code> → <code>python:3.10-slim</code>.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">ports</td><td className="py-2 pr-4 font-mono text-gray-500">array</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Host-to-container port mappings (e.g. <code>"4000:8080"</code>). Passed directly to the generated docker-compose service.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">volumes</td><td className="py-2 pr-4 font-mono text-gray-500">array</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Named volume mounts or bind mounts (e.g. <code>"app_data:/app/data"</code>). For non-docker-image types, the engine automatically appends a read-only <code>artifact_store</code> volume mount.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">environment</td><td className="py-2 pr-4 font-mono text-gray-500">map</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Key/value environment variables injected into the container. Must be a YAML map (not an array). Passed directly to docker-compose.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">depends_on</td><td className="py-2 pr-4 font-mono text-gray-500">array</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Other service names in this stack that must start before this service. Maps to docker-compose <code>depends_on</code>.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">init</td><td className="py-2 pr-4 font-mono text-gray-500">array</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Shell commands run inside the container's entrypoint script <strong>before</strong> the main process starts (e.g. DB migrations, permission fixes). Triggers automatic wrapper script generation — the engine writes and mounts an <code>/entrypoint.sh</code>.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">resources.memory</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Desired memory limit (e.g. <code>"1g"</code>). Stored in spec; not currently enforced at the docker-compose level.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">resources.cpus</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Desired CPU allocation (e.g. <code>"1.0"</code>). Stored in spec; not currently enforced at the docker-compose level.</td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5" />{'services.<name>.healthCheck'}</h4>
              <p className="text-xs text-gray-500">When defined, the deployment engine's background scheduler periodically runs this check and updates the service status in the database. Services without a <code>healthCheck</code> block are marked <code>unknown</code>. Provide either <code>endpoint</code> <em>or</em> <code>command</code> — not both.</p>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="border-b border-[var(--card-border)] text-gray-400 font-bold"><th className="pb-2 pr-4">Field</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Required</th><th className="pb-2">Description</th></tr></thead>
                <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                  <tr><td className="py-2 pr-4 font-mono font-bold">endpoint</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">HTTP health check. Format: <code>GET http://&lt;host&gt;:&lt;port&gt;/path</code>. The engine strips the <code>GET </code> prefix and issues a real HTTP GET with a 5-second connection and read timeout. Any 2xx–3xx response = healthy.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">command</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Alternative to <code>endpoint</code>. Runs via <code>docker exec &lt;stack&gt;-&lt;service&gt; /bin/sh -c &lt;command&gt;</code>. Zero exit code = healthy.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">interval</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Desired polling frequency (e.g. <code>"30s"</code>). Stored in spec; actual cadence controlled by the engine's global cron schedule.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">timeout</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Desired response timeout (e.g. <code>"5s"</code>). Stored in spec; HTTP checks use a fixed 5s connection timeout.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">retries</td><td className="py-2 pr-4 font-mono text-gray-500">integer</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Consecutive successes needed to recover healthy state after a failure. Stored in spec as configuration intent.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">unhealthyThreshold</td><td className="py-2 pr-4 font-mono text-gray-500">integer</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Consecutive failures before marking the service <code>unhealthy</code>. Stored in spec as configuration intent.</td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5" />policies</h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="border-b border-[var(--card-border)] text-gray-400 font-bold"><th className="pb-2 pr-4">Field</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Required</th><th className="pb-2">Description</th></tr></thead>
                <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                  <tr><td className="py-2 pr-4 font-mono font-bold">policies.strategy</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Deployment strategy label (e.g. <code>"rolling"</code>, <code>"recreate"</code>). Stored in spec for documentation; not currently evaluated.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">policies.waitForHealthy</td><td className="py-2 pr-4 font-mono text-gray-500">boolean</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Intended to gate rollout progression until health checks pass. Reserved for future stepper logic.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">policies.healthCheckTimeout</td><td className="py-2 pr-4 font-mono text-gray-500">string</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Maximum time to wait for services to become healthy before aborting a rollout. Reserved for future stepper logic.</td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5" />rollback</h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="border-b border-[var(--card-border)] text-gray-400 font-bold"><th className="pb-2 pr-4">Field</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Required</th><th className="pb-2">Description</th></tr></thead>
                <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                  <tr><td className="py-2 pr-4 font-mono font-bold">rollback.automatic</td><td className="py-2 pr-4 font-mono text-gray-500">boolean</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2"><strong>Actively enforced.</strong> When <code>true</code> and a rollout fails, the engine automatically re-runs <code>docker compose up</code> with the most recent previously-successful version's stored compose config. Stack status is set to <code>rolled_back</code>.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">rollback.onFailure</td><td className="py-2 pr-4 font-mono text-gray-500">boolean</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Informational alias for <code>automatic</code>. Parsed and stored but not separately evaluated.</td></tr>
                  <tr><td className="py-2 pr-4 font-mono font-bold">rollback.keepPreviousVersions</td><td className="py-2 pr-4 font-mono text-gray-500">integer</td><td className="py-2 pr-4 text-gray-400">Optional</td><td className="py-2">Intended number of historical versions to retain. Parsed and stored but automated pruning is not yet implemented — all versions are kept indefinitely and remain available for manual rollback.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}


      {/* 🔄 Subsystem Internals Content */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          {/* Subsystem Introduction */}
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <Server className="w-6 h-6 text-[var(--primary)]" />
              Under-the-Hood Subsystem Internals
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Brewery utilizes a modular Spring Boot core orchestrator. It manages build pipelines, parses dependency maps, and coordinates container lifecycles via the following integrated engines:
            </p>
          </div>

          {/* Ingestion */}
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-3">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 text-[var(--primary)]">
              <Terminal className="w-4.5 h-4.5" />
              1. Build Ingestion Engine
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Brewery connects to a Google Cloud Pub/Sub topic to listen for repository commit hooks. When a webhook event is received (e.g. via git push), the platform base64-decodes the payload containing details of the repository, branch, and commit SHA, maps it to a database record, and queues it for building.
            </p>
          </div>

          {/* Build Engine */}
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-4">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 text-violet-600">
              <Cpu className="w-4.5 h-4.5" />
              2. Containerized Build Executor
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              The build executor supports two distinct pipelines depending on the artifact <code>type</code> declared in <code>build.yaml</code>. Both paths begin identically — a temporary workspace is created, the repository is shallow-cloned at the exact commit SHA, and <code>build.yaml</code> is parsed.
            </p>

            {/* Binary / JAR path */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-violet-700 uppercase tracking-wider">Path A — Binary / JAR Artifact</h5>
              <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>An ephemeral builder container is started using the image specified in <code>build.image</code> (e.g. <code>golang:1.21</code>, <code>maven:3.9</code>).</li>
                <li>The full workspace is mounted into the container at <code>/workspace</code>.</li>
                <li>The <code>steps</code> commands are injected as a shell script and executed inside the container. All stdout/stderr is captured and persisted as the build log.</li>
                <li>After the container exits cleanly, the workspace is extracted back from the container to retrieve compiled outputs.</li>
                <li>The <code>pattern</code> glob (e.g. <code>dist/myapp</code>) is used to locate the output file(s). Multiple files are automatically bundled into a <code>.tar.gz</code> archive.</li>
                <li>The <strong>actual binary bytes</strong> are uploaded and stored in the Artifact Registry. The artifact record points directly to the file content.</li>
              </ol>
            </div>

            {/* Docker Image path */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Path B — Docker Image Artifact</h5>
              <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>A lightweight builder container still runs for any pre-build steps, but the Dockerfile owns the main compilation process.</li>
                <li>After the builder container exits, <code>docker build</code> is invoked directly against the DinD (Docker-in-Docker) sidecar daemon using the <code>pattern</code> field as the path to the Dockerfile.</li>
                <li>The image is tagged in the format <code>registry:5000/{'<name>'}:{'<commit-sha>'}</code>, making every build uniquely and immutably addressable.</li>
                <li>The image is pushed to the <strong>private internal registry</strong> (<code>registry:5000</code>). Nothing is sent to Docker Hub or any external service.</li>
                <li>A lightweight placeholder record (containing just the image tag string) is written to the Artifact Registry — the actual image layers live in the Docker registry.</li>
                <li>Build output from both <code>docker build</code> and <code>docker push</code> is captured line-by-line and appended to the build log.</li>
              </ol>
            </div>

            {/* Comparison table */}
            <div className="space-y-2 pt-1">
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pipeline Comparison</h5>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 font-bold text-gray-400">
                    <th className="pb-2">Stage</th>
                    <th className="pb-2">Binary / JAR</th>
                    <th className="pb-2">Docker Image</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-600">
                  <tr>
                    <td className="py-2 font-semibold">Compilation</td>
                    <td className="py-2">Inside builder container via <code>steps</code></td>
                    <td className="py-2">Inside the Dockerfile itself</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold">Artifact stored</td>
                    <td className="py-2">Actual binary bytes in DB/registry</td>
                    <td className="py-2">Image tag pointer; layers in Docker registry</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold">Toolchain location</td>
                    <td className="py-2"><code>build.image</code> container</td>
                    <td className="py-2">Dockerfile <code>FROM</code> stages</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold">Deployment pull</td>
                    <td className="py-2">Download binary from artifact store</td>
                    <td className="py-2"><code>docker pull registry:5000/...</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Dependency DAG */}
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-3">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 text-indigo-600">
              <Network className="w-4.5 h-4.5" />
              3. Directed Dependency Mapping (DAG)
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              When compile outputs are successfully written to the registry, the Dependency Resolver parses the artifact metadata. It indexes dependencies and reverse-dependencies inside target tables. In addition, it carries out Breadth-First and Depth-First graph traversals to ensure version compatibility, verify semantic ranges, and check for circular reference loops.
            </p>
          </div>

          {/* Cascade Rebuilds */}
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-3">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 text-amber-600">
              <RefreshCw className="w-4.5 h-4.5" />
              4. Automated Cascade Rebuilds
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Whenever a library registers a new version release, the system checks downstream artifacts declared in the dependency tree. If an downstream library's version range matches the new upstream version, a cascade task is created. The platform schedules a background task runner that queues automatic builds for all compatible dependents, propagating updates down the supply chain.
            </p>
          </div>

          {/* Deployment Engine */}
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-3">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 text-emerald-600">
              <Layers className="w-4.5 h-4.5" />
              5. Stepper Rollouts & Deployment Engine
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              The Deployment Engine evaluates stack versions and launches Docker Compose container sequences. During rollouts, a stepper mechanism monitors health check endpoints periodically. If a service container fails consecutive health check reviews, the engine immediately terminates the rollout and triggers an automated rollback to the previous known active version.
            </p>
          </div>
        </div>
      )}

      {/* 🔌 API Reference Content */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-[var(--primary)]" />
              REST API Endpoint Reference
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              All backend endpoints are bound relative to the base context path `/api` (or proxied directly via the Next.js routes).
            </p>
          </div>

          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-4">
            <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              Authentication & Accounts API
            </h4>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold">
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Path</th>
                  <th className="pb-2">Access Role</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">POST</span></td>
                  <td className="py-3 font-mono">/auth/login</td>
                  <td className="py-3">Public</td>
                  <td className="py-3">Validate credentials, start session, and set HttpOnly session cookie.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">POST</span></td>
                  <td className="py-3 font-mono">/auth/logout</td>
                  <td className="py-3">Authenticated</td>
                  <td className="py-3">Terminate active session and invalidate cookie.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">GET</span></td>
                  <td className="py-3 font-mono">/auth/me</td>
                  <td className="py-3">Authenticated</td>
                  <td className="py-3">Retrieve authenticated user name and role.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">GET</span></td>
                  <td className="py-3 font-mono">/users</td>
                  <td className="py-3">ADMIN</td>
                  <td className="py-3">List all registered user accounts.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">POST</span></td>
                  <td className="py-3 font-mono">/users</td>
                  <td className="py-3">ADMIN</td>
                  <td className="py-3">Create a new user with BCrypt hashed password.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">PUT</span></td>
                  <td className="py-3 font-mono">/users/&#123;id&#125;/username</td>
                  <td className="py-3">ADMIN</td>
                  <td className="py-3">Modify a user account username.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">PUT</span></td>
                  <td className="py-3 font-mono">/users/&#123;id&#125;/role</td>
                  <td className="py-3">ADMIN</td>
                  <td className="py-3">Update a user permissions role (USER / ADMIN).</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">PUT</span></td>
                  <td className="py-3 font-mono">/users/&#123;id&#125;/password</td>
                  <td className="py-3">ADMIN</td>
                  <td className="py-3">Reset a user password with a new hash.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">DELETE</span></td>
                  <td className="py-3 font-mono">/users/&#123;id&#125;</td>
                  <td className="py-3">ADMIN</td>
                  <td className="py-3">Delete a user account. Safely blocks if it's the last admin.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-4">
            <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-3 flex items-center gap-2">
              <Hammer className="w-4 h-4 text-violet-500" />
              Builds & Deployments API
            </h4>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold">
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Path</th>
                  <th className="pb-2">Access Role</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">GET</span></td>
                  <td className="py-3 font-mono">/builds</td>
                  <td className="py-3">Authenticated</td>
                  <td className="py-3">List all system build execution history.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">GET</span></td>
                  <td className="py-3 font-mono">/builds/&#123;id&#125;</td>
                  <td className="py-3">Authenticated</td>
                  <td className="py-3">Retrieve build metadata details, logs, and compile errors.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">GET</span></td>
                  <td className="py-3 font-mono">/deployments</td>
                  <td className="py-3">Authenticated</td>
                  <td className="py-3">List active deployment stacks configurations.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">POST</span></td>
                  <td className="py-3 font-mono">/deployments</td>
                  <td className="py-3">Authenticated</td>
                  <td className="py-3">Create or update a stack configuration from YAML.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">POST</span></td>
                  <td className="py-3 font-mono">/deployments/&#123;id&#125;/deploy</td>
                  <td className="py-3">Authenticated</td>
                  <td className="py-3">Trigger an active rollout stepper sequence.</td>
                </tr>
                <tr>
                  <td className="py-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">POST</span></td>
                  <td className="py-3 font-mono">/deployments/&#123;id&#125;/rollback/&#123;v&#125;</td>
                  <td className="py-3">Authenticated</td>
                  <td className="py-3">Rollback a deployment stack to a specific version number.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ❓ FAQ & Troubleshooting Content */}
      {activeTab === 'troubleshooting' && (
        <div className="space-y-8">
          {/* Version Ranges FAQ */}
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-500" />
              Understanding Version Ranges Reference
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Brewery integrates a range resolution parser to map dependencies. Refer to this guide to understand caret vs tilde range resolutions:
            </p>
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--card-border)] font-bold text-gray-500 uppercase">
                    <th className="pb-2">Operator Range</th>
                    <th className="pb-2">Equivalent Bounds</th>
                    <th className="pb-2">Matching Example Versions</th>
                    <th className="pb-2">Non-Matching Example Versions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                  <tr>
                    <td className="py-3 font-mono font-bold">^1.2.3</td>
                    <td className="py-3 font-mono">&gt;=1.2.3 &lt;2.0.0</td>
                    <td className="py-3 text-emerald-600 font-semibold">1.2.3, 1.2.5, 1.9.0</td>
                    <td className="py-3 text-red-600 font-semibold">1.2.2, 2.0.0</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono font-bold">~1.2.3</td>
                    <td className="py-3 font-mono">&gt;=1.2.3 &lt;1.3.0</td>
                    <td className="py-3 text-emerald-600 font-semibold">1.2.3, 1.2.9</td>
                    <td className="py-3 text-red-600 font-semibold">1.2.2, 1.3.0</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono font-bold">1.x</td>
                    <td className="py-3 font-mono">&gt;=1.0.0 &lt;2.0.0</td>
                    <td className="py-3 text-emerald-600 font-semibold">1.0.0, 1.5.0, 1.9.9</td>
                    <td className="py-3 text-red-600 font-semibold">0.9.9, 2.0.0</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono font-bold">1.0.0 - 2.0.0</td>
                    <td className="py-3 font-mono">&gt;=1.0.0 &lt;=2.0.0</td>
                    <td className="py-3 text-emerald-600 font-semibold">1.0.0, 1.5.0, 2.0.0</td>
                    <td className="py-3 text-red-600 font-semibold">0.9.9, 2.0.1</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Common Errors Troubleshooting */}
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Common Errors Troubleshooting
            </h3>

            <div className="space-y-4">
              <div className="p-5 border border-gray-200 rounded-xl bg-gray-50 space-y-2">
                <h4 className="font-bold text-gray-900 text-sm">"Failed to Connect to Platform" Error on dashboard startup</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Verify that the Brewery backend Spring Boot application is running on port <code>8080</code> on your server. If running in containers, verify that database container is active and Liquibase has completed initializing database schemas.
                </p>
              </div>

              <div className="p-5 border border-gray-200 rounded-xl bg-gray-50 space-y-2">
                <h4 className="font-bold text-gray-900 text-sm">"Docker socket not specified" build failure</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  If executing locally, ensure that the Docker desktop application is active. If executing inside containers, check that the host docker socket file mount <code>/var/run/docker.sock</code> is correctly passed in your run command configs.
                </p>
              </div>

              <div className="p-5 border border-gray-200 rounded-xl bg-gray-50 space-y-2">
                <h4 className="font-bold text-gray-900 text-sm">Authentication failures after renaming default user account</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  The initial administrator account <code>admin / password</code> is generated dynamically on first boot. If you modify its username or password in Settings, you must update your active login credentials immediately. Note that the backend prevents deleting or demoting the last remaining admin to prevent account lockout.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
