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
        <div className="space-y-8">
          {/* build.yaml spec */}
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-[var(--card-border)] pb-4">
              <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-xl">
                <FileCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Build Specification (build.yaml)</h3>
                <p className="text-xs text-gray-500">Place this file in the root of your Git repository to define containerized build runs.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Code spec */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 font-mono">build.yaml</span>
                </div>
                <div className="p-4 bg-gray-50 border border-[var(--card-border)] rounded-2xl overflow-x-auto font-mono text-[11px] text-[var(--primary)] leading-relaxed select-all">
                  <pre>{`image: maven:3.9-eclipse-temurin-21
steps:
  - mvn clean package -DskipTests
artifacts:
  name: core-library
  path: target/core-library.jar
  dependencies:
    - name: common-utils
      version_range: "^1.0.0"
    - name: bcrypt
      version_range: "~4.0.0"`}</pre>
                </div>
              </div>

              {/* Explanations */}
              <div className="space-y-4 text-sm">
                <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Configuration Options</h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] font-bold text-gray-500">
                      <th className="pb-2">Field</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                    <tr>
                      <td className="py-2 font-mono font-bold">image</td>
                      <td className="py-2 text-gray-500 font-mono">string</td>
                      <td className="py-2">Docker builder image (e.g. <code>maven</code>, <code>node</code>, <code>golang</code>).</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold">steps</td>
                      <td className="py-2 text-gray-500 font-mono">array</td>
                      <td className="py-2">Sequential shell command steps executed in the compilation environment.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold">artifacts.name</td>
                      <td className="py-2 text-gray-500 font-mono">string</td>
                      <td className="py-2">Unique name of the compiled library/service to output to the registry.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold">artifacts.path</td>
                      <td className="py-2 text-gray-500 font-mono">string</td>
                      <td className="py-2">Relative path within the workspace where compile artifact binary is located.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold">artifacts.dependencies</td>
                      <td className="py-2 text-gray-500 font-mono">array</td>
                      <td className="py-2">Required libraries listing their target names and semantic version ranges.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* deployment.yaml spec */}
          <div className="p-8 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-[var(--card-border)] pb-4">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Deployment Specification (deployment.yaml)</h3>
                <p className="text-xs text-gray-500">Define container stacks, ports mapping, dynamic artifact injection, and environment configuration.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Code spec */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 font-mono">deployment.yaml</span>
                </div>
                <div className="p-4 bg-gray-50 border border-[var(--card-border)] rounded-2xl overflow-x-auto font-mono text-[11px] text-emerald-700 leading-relaxed select-all">
                  <pre>{`services:
  web-gateway:
    artifact: gateway-service@^1.2.0
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - DB_URL=jdbc:postgresql://postgres:5432/db
  auth-worker:
    artifact: auth-service@~2.0.0
    environment:
      - JWT_SECRET=super_secret`}</pre>
                </div>
              </div>

              {/* Explanations */}
              <div className="space-y-4 text-sm">
                <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Configuration Options</h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] font-bold text-gray-500">
                      <th className="pb-2">Field</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--card-border)] text-gray-700">
                    <tr>
                      <td className="py-2 font-mono font-bold">services</td>
                      <td className="py-2 text-gray-500 font-mono">object</td>
                      <td className="py-2">List of service container components comprising the deployment stack.</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold">services.[name].artifact</td>
                      <td className="py-2 text-gray-500 font-mono">string</td>
                      <td className="py-2">Dynamic reference matching <code>artifact_name@range</code> (resolves latest match).</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold">services.[name].ports</td>
                      <td className="py-2 text-gray-500 font-mono">array</td>
                      <td className="py-2">External-to-internal port mapping configurations (e.g. <code>"8080:8080"</code>).</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono font-bold">services.[name].environment</td>
                      <td className="py-2 text-gray-500 font-mono">array</td>
                      <td className="py-2">List of environment variable definitions passed to the running container.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-3">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 text-violet-600">
              <Cpu className="w-4.5 h-4.5" />
              2. Containerized Build Executor
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              The platform creates an isolated filesystem directory on the host server. It clones the target repository, checks out the designated git commit SHA, and parses the <code>build.yaml</code> configuration file. A compilation workspace volume is then mounted inside a Docker container using the specified builder image. Build logs are piped to the database in real-time, and exit statuses are evaluated to confirm compilation integrity.
            </p>
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
