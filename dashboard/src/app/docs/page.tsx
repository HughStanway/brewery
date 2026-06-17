'use client';

import React from 'react';
import { 
  BookOpen, 
  Terminal, 
  Cpu, 
  Layers, 
  ShieldAlert, 
  Network, 
  GitBranch, 
  Activity, 
  FileText, 
  Code,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Hammer,
  Package,
  ArrowRight,
  Play,
  Server
} from 'lucide-react';

export default function DocsPage() {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'architecture' | 'guide' | 'endpoints' | 'limitations'>('overview');

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-[var(--primary)]" />
          Documentation & Platform Guide
        </h2>
        <p className="text-base text-gray-500 leading-relaxed">
          Deep-dive technical overview of Brewery build pipeline mechanics, system architecture, and API references.
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
            System Overview
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-blue-500 text-[var(--primary)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Under-The-Hood Architecture
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-blue-500 text-[var(--primary)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Getting Started
          </button>
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'endpoints'
                ? 'border-blue-500 text-[var(--primary)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            API Endpoints
          </button>
          <button
            onClick={() => setActiveTab('limitations')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'limitations'
                ? 'border-blue-500 text-[var(--primary)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Limits & FAQ
          </button>
        </div>
      </div>

      {/* System Overview Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-[var(--primary)]" />
              What is Brewery?
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Brewery is an integrated, state-of-the-art <strong>Continuous Build, Versioning & Deployment Platform</strong>. It automatically coordinates code commit ingestion, containerized builds, artifact registry storage, transitive dependency tracking, conflict detection, and automated cascade rebuilds when dependencies update.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                <Hammer className="w-5 h-5 text-emerald-400" />
                Continuous Build Pipelines
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                Builds compile in isolated Docker containers defined by a repository's <code>build.yaml</code>. Successful builds extract artifacts and publish them to the centralized registry, storing critical metadata (checksums, git commit SHAs, and versioning properties).
              </p>
            </div>
            
            <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                <Network className="w-5 h-5 text-violet-400" />
                Stateful Dependency Graph
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                Whenever artifacts declare versioned dependencies (e.g. <code>bcrypt@^4.0.0</code>), Brewery constructs directed acyclic graphs (DAGs). It validates ranges and alerts engineers if circular loops or version mismatches create conflicts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Under-The-Hood Architecture Content */}
      {activeTab === 'architecture' && (
        <div className="space-y-8">
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <Server className="w-6 h-6 text-[var(--primary)]" />
              Under-the-Hood Subsystem Internals
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Brewery utilizes a modular Spring Boot 3.x core architecture. It persists all states to a PostgreSQL database and integrates with an external container execution system and a messaging topology.
            </p>
          </div>

          {/* Subsystems breakdowns */}
          <div className="space-y-6">
            {/* Ingestion & Pub/Sub */}
            <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 text-[var(--primary)] border-b border-[var(--card-border)] pb-3">
                <Terminal className="w-5 h-5" />
                1. Build Ingestion & Live Pub/Sub Connection
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                In local development, the platform integrates with a Google Pub/Sub emulator. In the **production environment**, Brewery establishes a direct, secure connection to a live **Google Cloud Pub/Sub** service instance.
              </p>
              <p className="text-sm text-gray-500 leading-relaxed pl-3 border-l-2 border-blue-500/40">
                When code changes are pushed to a monitored repository, the hosting service publishes a JSON event payload (containing <code>repository</code>, <code>commit</code>, and <code>branch</code>) to a Google Cloud Pub/Sub topic. Brewery's background subscriber service receives the event, decodes the base64 payload, creates a pending <code>Build</code> record in the database, and schedules it for execution.
              </p>
            </div>

            {/* Docker Container Executor */}
            <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 text-emerald-400 border-b border-[var(--card-border)] pb-3">
                <Cpu className="w-5 h-5" />
                2. Isolated Docker Build Execution
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                The Build Executor manages isolated workspace checkouts and container lifecycles:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-500 space-y-2 pl-2">
                <li>Creates a unique filesystem directory under <code>/tmp/brewery-builds/build-[id]/workspace</code>.</li>
                <li>Clones the targeted git repository and checkouts the exact commit SHA in the workspace.</li>
                <li>Parses the <code>build.yaml</code> configuration file to resolve builder image, parameters, and compilation steps.</li>
                <li>Mounts the temporary workspace folder as a Docker volume and triggers the builder image.</li>
                <li>Streams container logs to the database in real-time, inspects exit statuses, hashes resulting binaries (SHA-256), and invokes the registry service to catalog the build outputs.</li>
              </ul>
            </div>

            {/* DAG Graph & Semantic Parsing */}
            <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 text-violet-400 border-b border-[var(--card-border)] pb-3">
                <Network className="w-5 h-5" />
                3. SemVer Resolution & Directed Dependency Mapping
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                The Dependency Resolver operates as a graph-traversal engine on top of relational schemas:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-500 space-y-2 pl-2">
                <li><strong>Range Parsing:</strong> Translates caret conditions (e.g. <code>^4.0.0</code> matches <code>[4.0.0, 5.0.0)</code>) and inequality ranges (e.g. <code>&gt;=1.2.0</code>) into structured boundaries.</li>
                <li><strong>Relational Graphs:</strong> When an artifact is registered, its metadata is parsed, and corresponding dependency relations are indexed in <code>dependencies</code> and <code>reverse_dependencies</code> database tables.</li>
                <li><strong>Cycle & Conflict Auditing:</strong> Performs transitive BFS/DFS traversals. If multiple versions of the same library are pulled in, or if a cyclical dependency exists, warning entities are generated to block broken configurations.</li>
              </ul>
            </div>

            {/* State-Based Cascade Queue */}
            <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 text-amber-400 border-b border-[var(--card-border)] pb-3">
                <RefreshCw className="w-5 h-5" />
                4. State-Based Rebuild Cascading
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                The Cascade Engine propagates package changes down the dependency tree:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-500 space-y-2 pl-2">
                <li><strong>Event-Driven Triggers:</strong> A Spring event listener captures successful artifact registrations and triggers the cascade resolver.</li>
                <li><strong>Chain Scheduling:</strong> Identifies active dependents via reverse dependency mappings and checks if their version ranges are satisfied. It saves a persistent <code>RebuildChain</code> and schedules pending <code>CascadeTask</code> records.</li>
                <li><strong>In-Place Upgrades:</strong> A background thread pool pulls pending tasks, builds the dependent packages, and registers the output artifacts keeping their original version name. This prevents version inflation while updating the dependency binary bindings in-place.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Getting Started Content */}
      {activeTab === 'guide' && (
        <div className="space-y-8">
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <Play className="w-6 h-6 text-emerald-400" />
              Getting Started Guide
            </h3>
            
            <div className="space-y-8 text-sm text-gray-700">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                  <ChevronRight className="w-4 h-4 text-[var(--primary)]" />
                  1. Define a Repository Build Config
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed pl-6">
                  To register a project with Brewery's automated Build Engine, place a <code>build.yaml</code> configuration file in the root of your repository:
                </p>
                <div className="pl-6">
                  <pre className="p-4 bg-gray-50 border border-[var(--card-border)] rounded-2xl font-mono text-xs text-gray-700 overflow-x-auto">
{`metadata:
  name: "auth-lib"
build:
  image: "maven:3.9-eclipse-temurin-21"
steps:
  build: "mvn clean package"
artifacts:
  - pattern: "target/*.jar"
    type: "jar"
dependencies:
  - name: "bcrypt"
    version_range: "^4.0.0"`}
                  </pre>
                </div>

                <div className="space-y-4 pl-6 pt-2 pb-4">
                  <p className="text-sm text-gray-700 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-[var(--primary)]" />
                    build.yaml Field Definitions
                  </p>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-[var(--card-border)] space-y-2">
                      <strong className="text-sm font-bold text-gray-900 block">A. metadata (Required)</strong>
                      <p className="text-sm text-gray-500 leading-relaxed pl-2">
                        Contains identifying metadata for the project.
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-500 pl-4 space-y-1">
                        <li><code className="text-[var(--primary)]">name</code> (String, Required): The catalog name of the compiled artifact.</li>
                        <li><code className="text-[var(--primary)]">versionScheme</code> (String, Optional): The Semantic Versioning parser format to use.</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-[var(--card-border)] space-y-2">
                      <strong className="text-sm font-bold text-gray-900 block">B. build (Required)</strong>
                      <p className="text-sm text-gray-500 leading-relaxed pl-2">
                        Defines runtime resource limits and execution context parameters.
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-500 pl-4 space-y-1">
                        <li><code className="text-[var(--primary)]">image</code> (String, Required): Docker image name utilized as the isolated build container.</li>
                        <li><code className="text-[var(--primary)]">timeoutSeconds</code> (Integer, Optional): Run duration boundary before execution aborts (default: 1800).</li>
                        <li><code className="text-[var(--primary)]">memory</code> (String, Optional): Ram allocation boundaries assigned to the builder container (e.g. <code>2g</code>, <code>4g</code>).</li>
                        <li><code className="text-[var(--primary)]">cpus</code> (Integer, Optional): Number of core processors allocated for the Docker builder.</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-[var(--card-border)] space-y-2">
                      <strong className="text-sm font-bold text-gray-900 block">C. steps (Required)</strong>
                      <p className="text-sm text-gray-500 leading-relaxed pl-2">
                        The shell scripts to execute inside the build container workspace.
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-500 pl-4 space-y-1">
                        <li><code className="text-[var(--primary)]">setup</code> (String, Optional): Installs prerequisites, setups configurations, or fetches tools.</li>
                        <li><code className="text-[var(--primary)]">build</code> (String, Required): The compile command compiling the codebase (e.g., <code>mvn clean package</code>, <code>npm run build</code>).</li>
                        <li><code className="text-[var(--primary)]">test</code> (String, Optional): Test execution scripts.</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-[var(--card-border)] space-y-2">
                      <strong className="text-sm font-bold text-gray-900 block">D. artifacts (Required)</strong>
                      <p className="text-sm text-gray-500 leading-relaxed pl-2">
                        Specifies which files generated by the compile commands should be collected.
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-500 pl-4 space-y-1">
                        <li><code className="text-[var(--primary)]">pattern</code> (String, Required): Filesystem glob pattern matching compiled files inside workspace (e.g. <code>target/*.jar</code>, <code>dist/*.tgz</code>).</li>
                        <li><code className="text-[var(--primary)]">type</code> (String, Optional): Registry catalog artifact packaging class (e.g., <code>jar</code>, <code>war</code>, <code>tgz</code>).</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-[var(--card-border)] space-y-2">
                      <strong className="text-sm font-bold text-gray-900 block">E. dependencies (Optional)</strong>
                      <p className="text-sm text-gray-500 leading-relaxed pl-2">
                        Defines requirements on other artifacts in the platform.
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-500 pl-4 space-y-1">
                        <li><code className="text-[var(--primary)]">name</code> (String, Required): Dependency artifact catalog identifier.</li>
                        <li><code className="text-[var(--primary)]">version_range</code> / <code className="text-[var(--primary)]">versionRange</code> (String, Required): Target SemVer range filters (e.g. <code>^4.0.0</code>, <code>&gt;=1.2.0</code>).</li>
                        <li><code className="text-[var(--primary)]">optional</code> (Boolean, Optional): If set true, prevents failing builds if missing.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                  <ChevronRight className="w-4 h-4 text-[var(--primary)]" />
                  2. Uploading Artifacts to the Registry
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed pl-6">
                  You can register a library version directly by uploading the pre-compiled binary via the REST API or using the upload interface on the Artifact Registry page:
                </p>
                <div className="pl-6">
                  <pre className="p-4 bg-gray-50 border border-[var(--card-border)] rounded-2xl font-mono text-xs text-gray-700 overflow-x-auto">
{`curl -X POST \\
  -F "file=@bcrypt-4.0.0.jar" \\
  -F "name=bcrypt" \\
  -F "version=4.0.0" \\
  -F "artifact_type=jar" \\
  -F "repository=myteam/bcrypt" \\
  -F "commit=bc400" \\
  "http://localhost:8080/api/registry/artifacts"`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                  <ChevronRight className="w-4 h-4 text-[var(--primary)]" />
                  3. Ingesting via Pub/Sub Events
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed pl-6">
                  Trigger automated builds by publishing a JSON push event payload to the live Google Cloud Pub/Sub topic configured for the environment:
                </p>
                <div className="pl-6">
                  <pre className="p-4 bg-gray-50 border border-[var(--card-border)] rounded-2xl font-mono text-xs text-gray-700 overflow-x-auto">
{`# Base64 encoded JSON payload containing "repository", "commit", "branch"
PAYLOAD='{"repository":"/path/to/myteam/auth-lib","commit":"a1b2c3d","branch":"main"}'
BASE64_DATA=$(echo -n $PAYLOAD | base64)

curl -X POST \\
  -H "Content-Type: application/json" \\
  -d "{\\"messages\\": [{\\"data\\": \\"\${BASE64_DATA}\\"}]}" \\
  "https://pubsub.googleapis.com/v1/projects/brewery-production/topics/brewery-jobs:publish"`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                  <ChevronRight className="w-4 h-4 text-[var(--primary)]" />
                  4. Monitoring Cascading Rebuilds
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed pl-6">
                  Once a package is registered, Brewery automatically runs cascade checks. If you publish a new version of a library (e.g. <code>bcrypt@4.0.1</code>), Brewery checks all downstream dependents. If their declared semver requirements are met, it automatically spawns a rebuild chain.
                </p>
                <p className="text-sm text-gray-500 leading-relaxed pl-6">
                  You can audit active tasks, cancel running rebuild chains, or trace dry-run previews on the <strong>Cascade Rebuilds</strong> dashboard tab.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Endpoints Content */}
      {activeTab === 'endpoints' && (
        <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5 border-b border-[var(--card-border)] pb-3">
            <Code className="w-6 h-6 text-[var(--primary)]" />
            API Endpoints Reference
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse font-sans">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Subsystem</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Endpoint Path</th>
                  <th className="py-3 px-4">Action Description</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm text-gray-700">
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-emerald-400 font-semibold font-sans">Registry</td>
                  <td className="py-4 px-4"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-4 px-4">/api/registry/artifacts</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Upload and register a new artifact version binary.</td>
                </tr>
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-emerald-400 font-semibold font-sans">Registry</td>
                  <td className="py-4 px-4"><span className="text-[var(--primary)] font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/registry/artifacts</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">List all registered artifacts.</td>
                </tr>
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-emerald-400 font-semibold font-sans">Registry</td>
                  <td className="py-4 px-4"><span className="text-[var(--primary)] font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/registry/artifacts/&#123;name&#125;</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Get version listing and details for an artifact name.</td>
                </tr>
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-emerald-400 font-semibold font-sans">Registry</td>
                  <td className="py-4 px-4"><span className="text-[var(--primary)] font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/registry/artifacts/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Get metadata files/manifest details for a version.</td>
                </tr>
                
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-[var(--primary)] font-semibold font-sans">Build Engine</td>
                  <td className="py-4 px-4"><span className="text-[var(--primary)] font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/builds</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Fetch list of all builds.</td>
                </tr>
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-[var(--primary)] font-semibold font-sans">Build Engine</td>
                  <td className="py-4 px-4"><span className="text-[var(--primary)] font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/builds/&#123;id&#125;</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Get build execution status, compile time, and terminal logs.</td>
                </tr>

                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-violet-400 font-semibold font-sans">Resolver</td>
                  <td className="py-4 px-4"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-4 px-4">/api/dependencies/resolve/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Resolve dependency mapping and scan for conflicts.</td>
                </tr>
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-violet-400 font-semibold font-sans">Resolver</td>
                  <td className="py-4 px-4"><span className="text-[var(--primary)] font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/dependencies/graph/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Get direct/transitive dependency graph relations.</td>
                </tr>
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-violet-400 font-semibold font-sans">Resolver</td>
                  <td className="py-4 px-4"><span className="text-[var(--primary)] font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/dependencies/conflicts</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Retrieve all registered dependency conflict warnings.</td>
                </tr>

                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-amber-400 font-semibold font-sans">Cascade</td>
                  <td className="py-4 px-4"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-4 px-4">/api/cascade/trigger/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Manually trigger cascade analysis.</td>
                </tr>
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-amber-400 font-semibold font-sans">Cascade</td>
                  <td className="py-4 px-4"><span className="text-[var(--primary)] font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/cascade/chains</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">List all historical rebuild chain runs.</td>
                </tr>
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-amber-400 font-semibold font-sans">Cascade</td>
                  <td className="py-4 px-4"><span className="text-[var(--primary)] font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/cascade/chains/&#123;id&#125;</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Fetch detailed status of tasks and runs within a chain.</td>
                </tr>
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-amber-400 font-semibold font-sans">Cascade</td>
                  <td className="py-4 px-4"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-4 px-4">/api/cascade/chains/&#123;id&#125;/cancel</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Cancel a running chain and skip pending builds.</td>
                </tr>
                <tr className="border-b border-[var(--card-border)]">
                  <td className="py-4 px-4 text-amber-400 font-semibold font-sans">Cascade</td>
                  <td className="py-4 px-4"><span className="text-[var(--primary)] font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/cascade/impact/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-4 px-4 text-gray-500 font-sans">Fetch dry-run impact analysis of dependent packages.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Limits & FAQ Content */}
      {activeTab === 'limitations' && (
        <div className="space-y-6">
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5 border-b border-[var(--card-border)] pb-3">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              Platform Constraints & Design Rules
            </h3>
            
            <div className="space-y-6 text-sm text-gray-700">
              <div className="p-6 bg-gray-50 rounded-2xl border border-[var(--card-border)] space-y-3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  In-place Rebuilding Strategy
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  When a cascade triggers a rebuild on a dependent package (e.g., rebuilding <code>auth-lib@1.0.0</code> when <code>bcrypt</code> updates), Brewery rebuilds and updates the original target version <strong>in-place</strong> in the registry. It does not auto-increment version strings. This ensures that downstream dependents can continue resolving the artifact range requirements without version inflation.
                </p>
              </div>

              <div className="p-6 bg-gray-50 rounded-2xl border border-[var(--card-border)] space-y-3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                  <Terminal className="w-4 h-4 text-[var(--primary)]" />
                  Sequential Task Scheduler
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  The Cascade Rebuild scheduler operates on a 1-minute loop (or configurable delay), processing pending rebuild jobs sequentially. To prevent local CPU/Docker resource depletion, containerized builds are executed one at a time.
                </p>
              </div>

              <div className="p-6 bg-gray-50 rounded-2xl border border-[var(--card-border)] space-y-3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                  <Network className="w-4 h-4 text-violet-400" />
                  Caret (^) Range Boundary Rules
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  The version resolver validates caret conditions based on standard semantic constraints. For instance, <code>^4.0.0</code> is satisfied by version <code>4.0.1</code>, but not by <code>5.0.0</code>. Pre-releases and multi-range union expressions default to strict pinned comparisons.
                </p>
              </div>

              <div className="p-6 bg-gray-50 rounded-2xl border border-[var(--card-border)] space-y-3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  Mock and Absolute Repositories
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  The build executor simulates builds for team namespace repositories (e.g. <code>myteam/auth-lib</code>) using mock files and workspace stubs. Real local directories specified via absolute paths (e.g. <code>/Users/hughstanway/Projects/brewery</code>) are cloned and built using actual git repositories.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
