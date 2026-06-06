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
  Package
} from 'lucide-react';

export default function DocsPage() {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'phases' | 'endpoints' | 'limitations'>('overview');

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-500" />
          System Documentation & Architecture Guide
        </h2>
        <p className="text-sm text-gray-400">Deep-dive technical overview of Brewery supply chain mechanics, integration phases, and APIs.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1e293b] gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab('phases')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
            activeTab === 'phases'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Phase Specs (0 - 4)
        </button>
        <button
          onClick={() => setActiveTab('endpoints')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
            activeTab === 'endpoints'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          API Endpoints
        </button>
        <button
          onClick={() => setActiveTab('limitations')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
            activeTab === 'limitations'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Limitations & Assumptions
        </button>
      </div>

      {/* Overview Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              What is Brewery?
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Brewery is an agentic <strong>Software Supply Chain and DevOps Platform</strong>. It automatically manages the lifecycle of application builds, artifact storage, transitive dependency verification, conflict resolution, and propagation of changes (cascade rebuilds).
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">
              The architecture is structured around a Spring Boot core hosting modular engines (Build Engine, Artifact Registry, Dependency Resolver, and Cascade Rebuild Engine), interacting with a PostgreSQL database, Google Pub/Sub event emulator, and Docker daemon.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Hammer className="w-4 h-4 text-emerald-400" />
                Build & Registry Model
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Builds compile in isolated Docker containers defined by a repository's <code>build.yaml</code>. Successful builds extract artifacts and publish them to the centralized registry, storing critical metadata (checksums, git commit SHAs, and versioning properties).
              </p>
            </div>
            
            <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Network className="w-4 h-4 text-violet-400" />
                Dependency Graphs
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Whenever artifacts declare versioned dependencies (e.g. <code>bcrypt@^4.0.0</code>), Brewery constructs directed acyclic graphs (DAGs). It validates ranges and alerts engineers if circular loops or version mismatches create conflicts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Phase Specs Content */}
      {activeTab === 'phases' && (
        <div className="space-y-8">
          {/* Phase 0 */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-3">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center font-mono text-xs">0</span>
                Phase 0: Platform Foundation
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">COMPLETE</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Established the Spring Boot multimodule maven hierarchy, relational database migration strategy (via Liquibase changelogs), and visual layout structure. Set up the basic mock engines for registry uploads and build histories.
            </p>
          </div>

          {/* Phase 1 */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-3">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center font-mono text-xs">1</span>
                Phase 1: Pub/Sub & Containerized Builds
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">COMPLETE</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Integrated a real-time event listener connected to a local Google Pub/Sub emulator. When a code repository push is received:
            </p>
            <ul className="list-disc list-inside text-xs text-gray-400 space-y-1.5 pl-2 font-mono">
              <li>Repository is cloned/checked-out asynchronously to a temp workspace.</li>
              <li>A container executor initializes a Docker builder container (e.g. Maven, Alpine).</li>
              <li>The workspace runs execution commands specified in the repository's <code>build.yaml</code>.</li>
              <li>Calculates SHA-256 checksums, extracts compiled artifacts, and indexes them in the registry.</li>
            </ul>
          </div>

          {/* Phase 2 */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-3">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center font-mono text-xs">2</span>
                Phase 2: Dependency Resolution Engine
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">COMPLETE</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Constructed the Semantic Versioning evaluation core. Supports evaluating version requirements such as caret ranges (<code>^4.0.0</code>), inequality bounds (<code>&gt;=2.1.0</code>), or exact pinning.
            </p>
            <ul className="list-disc list-inside text-xs text-gray-400 space-y-1.5 pl-2 font-mono">
              <li>Maintains structural mapping of direct and reverse dependency relationships in relational schemas.</li>
              <li>Transitively resolves all dependencies and checks for circular reference loops.</li>
              <li>Detects version conflicts (e.g. package A depends on B@^1.0.0 but package C pulls B@^2.0.0) and records warning entities.</li>
            </ul>
          </div>

          {/* Phase 3 */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-3">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center font-mono text-xs">3</span>
                Phase 3: Deployment History
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">COMPLETE</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Provides visual interfaces and endpoint storage auditing the historical deployment status, build duration statistics, compile logging stdout streams, and registry storage parameters.
            </p>
          </div>

          {/* Phase 4 */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-3">
            <div className="flex justify-between items-center border-b border-[#1e293b] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center font-mono text-xs">4</span>
                Phase 4: Cascade Rebuild Pipelines
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">COMPLETE</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              An automated pipeline system that executes recursive rebuild chain runs when parent dependencies update:
            </p>
            <ul className="list-disc list-inside text-xs text-gray-400 space-y-1.5 pl-2 font-mono">
              <li>When a package version is registered, the engine triggers a cascade search.</li>
              <li>Queries reverse dependencies to isolate all active downstream packages that use it.</li>
              <li>Inspects dependency version range rules to filter out semver-incompatible targets.</li>
              <li>Constructs a <code>RebuildChain</code> and schedules sequential execution tasks.</li>
              <li>Enqueues and resolves builds. If successful, updates the package versions in-place to guarantee downstream compatibility.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Endpoints Content */}
      {activeTab === 'endpoints' && (
        <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3">
            Brewery API REST Endpoints
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1e293b] text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Path</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="font-mono text-gray-300">
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-blue-400 font-semibold">Registry</td>
                  <td className="py-3 px-3"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-3 px-3">/api/registry/artifacts</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">Upload/register new artifact version multipart file.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-blue-400 font-semibold">Registry</td>
                  <td className="py-3 px-3"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-3 px-3">/api/registry/artifacts</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">List all registered artifacts metadata.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-blue-400 font-semibold">Registry</td>
                  <td className="py-3 px-3"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-3 px-3">/api/registry/artifacts/&#123;name&#125;</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">Fetch version list and details for a package name.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-blue-400 font-semibold">Registry</td>
                  <td className="py-3 px-3"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-3 px-3">/api/registry/artifacts/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">Inspect metadata details for a specific artifact version.</td>
                </tr>
                
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-emerald-400 font-semibold">Builds</td>
                  <td className="py-3 px-3"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-3 px-3">/api/builds</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">List historical container executor pipeline runs.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-emerald-400 font-semibold">Builds</td>
                  <td className="py-3 px-3"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-3 px-3">/api/builds/&#123;id&#125;</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">Fetch completion status and console logging output for a build ID.</td>
                </tr>

                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-violet-400 font-semibold">Graph</td>
                  <td className="py-3 px-3"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-3 px-3">/api/dependencies/resolve/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">Trigger dependency tree traversal and conflict auditing.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-violet-400 font-semibold">Graph</td>
                  <td className="py-3 px-3"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-3 px-3">/api/dependencies/graph/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">Fetch directed dependency graph relations (forward/reverse).</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-violet-400 font-semibold">Graph</td>
                  <td className="py-3 px-3"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-3 px-3">/api/dependencies/conflicts</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">Retrieve listing of all active version range conflicts.</td>
                </tr>

                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-amber-400 font-semibold">Cascade</td>
                  <td className="py-3 px-3"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-3 px-3">/api/cascade/trigger/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">Manually trigger cascade analysis queue traversal.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-amber-400 font-semibold">Cascade</td>
                  <td className="py-3 px-3"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-3 px-3">/api/cascade/chains</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">List all rebuild chain executions and trigger reasons.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-amber-400 font-semibold">Cascade</td>
                  <td className="py-3 px-3"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-3 px-3">/api/cascade/chains/&#123;id&#125;</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">Fetch detailed statuses of individual tasks inside a chain.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-amber-400 font-semibold">Cascade</td>
                  <td className="py-3 px-3"><span className="text-green-400 font-bold">POST</span></td>
                  <td className="py-3 px-3">/api/cascade/chains/&#123;id&#125;/cancel</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">Aborts a running chain, skipping all pending rebuilds.</td>
                </tr>
                <tr className="border-b border-[#1e293b]/60">
                  <td className="py-3 px-3 text-amber-400 font-semibold">Cascade</td>
                  <td className="py-3 px-3"><span className="text-blue-400 font-bold">GET</span></td>
                  <td className="py-3 px-3">/api/cascade/impact/&#123;name&#125;/&#123;version&#125;</td>
                  <td className="py-3 px-3 text-gray-400 font-sans">Dry-run impact analysis reporting affected packages.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Limitations & Assumptions Content */}
      {activeTab === 'limitations' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Assumptions and Limitations
            </h3>
            
            <div className="space-y-4 text-xs text-gray-300">
              <div className="p-4 bg-black/20 rounded-xl border border-[#1e293b]">
                <strong className="text-white block mb-1">Single-threaded scheduler loops</strong>
                <p className="text-gray-400 leading-relaxed">
                  The Cascade Rebuild scheduler operates on a fixed delay thread (defaults to 10s). Rebuild tasks are processed sequentially. If multiple builds are enqueued, they compile sequentially in Docker to prevent system load exhaustion.
                </p>
              </div>

              <div className="p-4 bg-black/20 rounded-xl border border-[#1e293b]">
                <strong className="text-white block mb-1">Mock Repository Emulation</strong>
                <p className="text-gray-400 leading-relaxed">
                  Repositories matching mock structures (e.g. <code>myteam/auth-lib</code>) are compiled via mock containers executing local stub commands. Valid absolute file paths are cloned directly from host git nodes.
                </p>
              </div>

              <div className="p-4 bg-black/20 rounded-xl border border-[#1e293b]">
                <strong className="text-white block mb-1">Caret (^) Version Scope limits</strong>
                <p className="text-gray-400 leading-relaxed">
                  The caret range parser handles major versions correctly (e.g., <code>^4.0.0</code> is satisfied by <code>4.0.1</code>, but rejected by <code>5.0.0</code>). Complex range expressions (such as pre-releases, logical OR bounds, or wildcard intersections) default to strict dependency satisfaction queries.
                </p>
              </div>

              <div className="p-4 bg-black/20 rounded-xl border border-[#1e293b]">
                <strong className="text-white block mb-1">Version Bumping</strong>
                <p className="text-gray-400 leading-relaxed">
                  Cascade rebuilds do not automatically increment semantic major/minor version increments (e.g., from <code>1.0.0</code> to <code>1.0.1</code>) on files. Instead, they update/overwrite the latest version binary in-place to ensure downstream compatibility matches without version proliferation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
