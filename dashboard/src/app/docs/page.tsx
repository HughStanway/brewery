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
        <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-500" />
          Documentation & Platform Guide
        </h2>
        <p className="text-base text-gray-400 leading-relaxed">
          Deep-dive technical overview of Brewery supply chain mechanics, system architecture, and API references.
        </p>
      </div>

      {/* Tabs / Navigator Top Bar */}
      <div className="border-b border-[#1e293b] pb-px">
        <div className="flex flex-wrap gap-2 overflow-y-hidden pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            System Overview
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Under-The-Hood Architecture
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Getting Started
          </button>
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'endpoints'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            API Endpoints
          </button>
          <button
            onClick={() => setActiveTab('limitations')}
            className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'limitations'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Limits & FAQ
          </button>
        </div>
      </div>

      {/* System Overview Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="p-8 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-blue-400" />
              What is Brewery?
            </h3>
            <p className="text-base text-gray-300 leading-relaxed">
              Brewery is an integrated, state-of-the-art <strong>Software Supply Chain and DevOps Platform</strong>. It automatically coordinates code commit ingestion, containerized builds, artifact registry storage, transitive dependency tracking, conflict detection, and automated cascade rebuilds when dependencies update.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1e293b] pb-3">
                <Hammer className="w-5 h-5 text-emerald-400" />
                Continuous Build Pipelines
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Builds compile in isolated Docker containers defined by a repository's <code>build.yaml</code>. Successful builds extract artifacts and publish them to the centralized registry, storing critical metadata (checksums, git commit SHAs, and versioning properties).
              </p>
            </div>
            
            <div className="p-8 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1e293b] pb-3">
                <Network className="w-5 h-5 text-violet-400" />
                Stateful Dependency Graph
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Whenever artifacts declare versioned dependencies (e.g. <code>bcrypt@^4.0.0</code>), Brewery constructs directed acyclic graphs (DAGs). It validates ranges and alerts engineers if circular loops or version mismatches create conflicts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Under-The-Hood Architecture Content */}
      {activeTab === 'architecture' && (
        <div className="space-y-8">
          <div className="p-8 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Server className="w-6 h-6 text-blue-400" />
              Under-the-Hood Subsystem Internals
            </h3>
            <p className="text-base text-gray-300 leading-relaxed">
              Brewery utilizes a modular Spring Boot 3.x core architecture. It persists all states to a PostgreSQL database and integrates with an external container execution system and a messaging topology.
            </p>
          </div>

          {/* Subsystems breakdowns */}
          <div className="space-y-6">
            {/* Ingestion & Pub/Sub */}
            <div className="p-8 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 text-blue-400 border-b border-[#1e293b] pb-3">
                <Terminal className="w-5 h-5" />
                1. Build Ingestion & Live Pub/Sub Connection
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                In local development, the platform integrates with a Google Pub/Sub emulator. In the **production environment**, Brewery establishes a direct, secure connection to a live **Google Cloud Pub/Sub** service instance.
              </p>
              <p className="text-sm text-gray-400 leading-relaxed pl-3 border-l-2 border-blue-500/40">
                When code changes are pushed to a monitored repository, the hosting service publishes a JSON event payload (containing <code>repository</code>, <code>commit</code>, and <code>branch</code>) to a Google Cloud Pub/Sub topic. Brewery's background subscriber service receives the event, decodes the base64 payload, creates a pending <code>Build</code> record in the database, and schedules it for execution.
              </p>
            </div>

            {/* Docker Container Executor */}
            <div className="p-8 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 text-emerald-400 border-b border-[#1e293b] pb-3">
                <Cpu className="w-5 h-5" />
                2. Isolated Docker Build Execution
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                The Build Executor manages isolated workspace checkouts and container lifecycles:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-400 space-y-2 pl-2">
                <li>Creates a unique filesystem directory under <code>/tmp/brewery-builds/build-[id]/workspace</code>.</li>
                <li>Clones the targeted git repository and checkouts the exact commit SHA in the workspace.</li>
                <li>Parses the <code>build.yaml</code> configuration file to resolve builder image, parameters, and compilation steps.</li>
                <li>Mounts the temporary workspace folder as a Docker volume and triggers the builder image.</li>
                <li>Streams container logs to the database in real-time, inspects exit statuses, hashes resulting binaries (SHA-256), and invokes the registry service to catalog the build outputs.</li>
              </ul>
            </div>

            {/* DAG Graph & Semantic Parsing */}
            <div className="p-8 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 text-violet-400 border-b border-[#1e293b] pb-3">
                <Network className="w-5 h-5" />
                3. SemVer Resolution & Directed Dependency Mapping
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                The Dependency Resolver operates as a graph-traversal engine on top of relational schemas:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-400 space-y-2 pl-2">
                <li><strong>Range Parsing:</strong> Translates caret conditions (e.g. <code>^4.0.0</code> matches <code>[4.0.0, 5.0.0)</code>) and inequality ranges (e.g. <code>&gt;=1.2.0</code>) into structured boundaries.</li>
                <li><strong>Relational Graphs:</strong> When an artifact is registered, its metadata is parsed, and corresponding dependency relations are indexed in <code>dependencies</code> and <code>reverse_dependencies</code> database tables.</li>
                <li><strong>Cycle & Conflict Auditing:</strong> Performs transitive BFS/DFS traversals. If multiple versions of the same library are pulled in, or if a cyclical dependency exists, warning entities are generated to block broken configurations.</li>
              </ul>
            </div>

            {/* State-Based Cascade Queue */}
            <div className="p-8 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 text-amber-400 border-b border-[#1e293b] pb-3">
                <RefreshCw className="w-5 h-5" />
                4. State-Based Rebuild Cascading
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                The Cascade Engine propagates package changes down the dependency tree:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-400 space-y-2 pl-2">
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
          <div className="p-8 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Play className="w-6 h-6 text-emerald-400" />
              Getting Started Guide
            </h3>
            
            <div className="space-y-8 text-sm text-gray-300">
              <div className="space-y-3">
                <h4 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-wider border-b border-[#1e293b] pb-2">
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                  1. Define a Repository Build Config
                </h4>
                <p className="text-gray-400 leading-relaxed pl-6">
                  To register a project with Brewery's automated Build Engine, place a <code>build.yaml</code> configuration file in the root of your repository:
                </p>
                <div className="pl-6">
                  <pre className="p-4 bg-black/40 border border-[#1e293b] rounded-xl font-mono text-xs text-gray-300 overflow-x-auto">
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
              </div>

              <div className="space-y-3">
                <h4 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-wider border-b border-[#1e293b] pb-2">
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                  2. Uploading Artifacts to the Registry
                </h4>
                <p className="text-gray-400 leading-relaxed pl-6">
                  You can register a library version directly by uploading the pre-compiled binary via the REST API or using the upload interface on the Artifact Registry page:
                </p>
                <div className="pl-6">
                  <pre className="p-4 bg-black/40 border border-[#1e293b] rounded-xl font-mono text-xs text-gray-300 overflow-x-auto">
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
                <h4 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-wider border-b border-[#1e293b] pb-2">
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                  3. Ingesting via Pub/Sub Events
                </h4>
                <p className="text-gray-400 leading-relaxed pl-6">
                  Trigger automated builds by publishing a JSON push event payload to the live Google Cloud Pub/Sub topic configured for the environment:
                </p>
                <div className="pl-6">
                  <pre className="p-4 bg-black/40 border border-[#1e293b] rounded-xl font-mono text-xs text-gray-300 overflow-x-auto">
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
                <h4 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-wider border-b border-[#1e293b] pb-2">
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                  4. Monitoring Cascading Rebuilds
                </h4>
                <p className="text-gray-400 leading-relaxed pl-6">
                  Once a package is registered, Brewery automatically runs cascade checks. If you publish a new version of a library (e.g. <code>bcrypt@4.0.1</code>), Brewery checks all downstream dependents. If their declared semver requirements are met, it automatically spawns a rebuild chain.
                </p>
                <p className="text-gray-400 leading-relaxed pl-6">
                  You can audit active tasks, cancel running rebuild chains, or trace dry-run previews on the <strong>Cascade Rebuilds</strong> dashboard tab.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Endpoints Content */}
      {activeTab === 'endpoints' && (
        <div className="p-8 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-6">
          <h3 className="text-xl font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3">
            API Endpoints Reference
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse font-sans">
              <thead>
                <tr className="border-b border-[#1e293b] text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Subsystem</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Endpoint Path</th>
                  <th className="py-3 px-4">Action Description</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm text-gray-300">
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-emerald-400 font-semibold font-sans">Registry</td>
                  <td className="py-4 px-4"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-4 px-4">/api/registry/artifacts</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Upload and register a new artifact version binary.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-emerald-400 font-semibold font-sans">Registry</td>
                  <td className="py-4 px-4"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/registry/artifacts</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">List all registered artifacts.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-emerald-400 font-semibold font-sans">Registry</td>
                  <td className="py-4 px-4"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/registry/artifacts/&#123;name&#125;</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Get version listing and details for an artifact name.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-emerald-400 font-semibold font-sans">Registry</td>
                  <td className="py-4 px-4"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/registry/artifacts/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Get metadata files/manifest details for a version.</td>
                </tr>
                
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-blue-400 font-semibold font-sans">Build Engine</td>
                  <td className="py-4 px-4"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/builds</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Fetch list of all builds.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-blue-400 font-semibold font-sans">Build Engine</td>
                  <td className="py-4 px-4"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/builds/&#123;id&#125;</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Get build execution status, compile time, and terminal logs.</td>
                </tr>

                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-violet-400 font-semibold font-sans">Resolver</td>
                  <td className="py-4 px-4"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-4 px-4">/api/dependencies/resolve/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Resolve dependency mapping and scan for conflicts.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-violet-400 font-semibold font-sans">Resolver</td>
                  <td className="py-4 px-4"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/dependencies/graph/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Get direct/transitive dependency graph relations.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-violet-400 font-semibold font-sans">Resolver</td>
                  <td className="py-4 px-4"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/dependencies/conflicts</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Retrieve all registered dependency conflict warnings.</td>
                </tr>

                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-amber-400 font-semibold font-sans">Cascade</td>
                  <td className="py-4 px-4"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-4 px-4">/api/cascade/trigger/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Manually trigger cascade analysis.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-amber-400 font-semibold font-sans">Cascade</td>
                  <td className="py-4 px-4"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/cascade/chains</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">List all historical rebuild chain runs.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-amber-400 font-semibold font-sans">Cascade</td>
                  <td className="py-4 px-4"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/cascade/chains/&#123;id&#125;</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Fetch detailed status of tasks and runs within a chain.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-amber-400 font-semibold font-sans">Cascade</td>
                  <td className="py-4 px-4"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-4 px-4">/api/cascade/chains/&#123;id&#125;/cancel</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Cancel a running chain and skip pending builds.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-4 px-4 text-amber-400 font-semibold font-sans">Cascade</td>
                  <td className="py-4 px-4"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-4 px-4">/api/cascade/impact/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-4 px-4 text-gray-400 font-sans">Fetch dry-run impact analysis of dependent packages.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Limits & FAQ Content */}
      {activeTab === 'limitations' && (
        <div className="space-y-6">
          <div className="p-8 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              Platform Constraints & Design Rules
            </h3>
            
            <div className="space-y-6 text-sm text-gray-300">
              <div className="p-6 bg-black/20 rounded-xl border border-[#1e293b] space-y-2">
                <strong className="text-white text-base block font-bold">In-place Rebuilding Strategy</strong>
                <p className="text-gray-400 leading-relaxed">
                  When a cascade triggers a rebuild on a dependent package (e.g., rebuilding <code>auth-lib@1.0.0</code> when <code>bcrypt</code> updates), Brewery rebuilds and updates the original target version <strong>in-place</strong> in the registry. It does not auto-increment version strings. This ensures that downstream dependents can continue resolving the artifact range requirements without version inflation.
                </p>
              </div>

              <div className="p-6 bg-black/20 rounded-xl border border-[#1e293b] space-y-2">
                <strong className="text-white text-base block font-bold">Sequential Task Scheduler</strong>
                <p className="text-gray-400 leading-relaxed">
                  The Cascade Rebuild scheduler operates on a 1-minute loop (or configurable delay), processing pending rebuild jobs sequentially. To prevent local CPU/Docker resource depletion, containerized builds are executed one at a time.
                </p>
              </div>

              <div className="p-6 bg-black/20 rounded-xl border border-[#1e293b] space-y-2">
                <strong className="text-white text-base block font-bold">Caret (^) Range Boundary Rules</strong>
                <p className="text-gray-400 leading-relaxed">
                  The version resolver validates caret conditions based on standard semantic constraints. For instance, <code>^4.0.0</code> is satisfied by version <code>4.0.1</code>, but not by <code>5.0.0</code>. Pre-releases and multi-range union expressions default to strict pinned comparisons.
                </p>
              </div>

              <div className="p-6 bg-black/20 rounded-xl border border-[#1e293b] space-y-2">
                <strong className="text-white text-base block font-bold">Mock and Absolute Repositories</strong>
                <p className="text-gray-400 leading-relaxed">
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
