const BASE_URL = typeof window === 'undefined'
  ? (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : 'http://localhost:8080/api')
  : '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // ignore JSON parse error for error response
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  
  return response.text() as unknown as Promise<T>;
}

export interface Build {
  id: string;
  repository: string;
  branch: string;
  commit: string;
  webhookEventId?: string;
  status: 'pending' | 'building' | 'success' | 'failed' | 'cancelled';
  logs?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  createdAt: string;
}

export interface Artifact {
  id: string;
  name: string;
  version: string;
  artifactType: string;
  buildId: string;
  storagePath: string;
  fileSizeBytes?: number;
  checksum?: string;
  metadata?: string; // JSON string
  tags?: string[];
  downloadCount?: number;
  lastAccessedAt?: string;
  isLatest?: boolean;
  deprecatedAt?: string;
  createdAt: string;
}

export interface ArtifactMetadataJson {
  name: string;
  version: string;
  artifact_type: string;
  artifact_id: string;
  build_id: string;
  repository: string;
  branch: string;
  commit: string;
  built_at: string;
  file_size_bytes?: number;
  checksums?: Record<string, string>;
  artifact_url?: string;
  download_url?: string;
  dependencies?: { name: string; version_range: string; resolved_version?: string }[];
  tags?: string[];
}

export interface Dependency {
  id: string;
  artifactId: string;
  dependencyName: string;
  versionRange: string;
  resolvedVersion?: string;
  dependencyArtifactId?: string;
  dependencyType: string;
  isOptional: boolean;
  createdAt: string;
}

export interface CascadeTask {
  taskId?: string;
  task_id?: string;
  status: 'pending' | 'building' | 'completed' | 'failed' | 'skipped' | 'error' | 'building'; // support all backend status strings
  artifactId?: string;
  artifact_id?: string;
  artifactName?: string;
  artifact_name?: string;
  artifactVersion?: string;
  artifact_version?: string;
  reason: string;
  priority: number;
  buildId?: string;
  build_id?: string;
  attemptedAt?: string;
  attempted_at?: string;
  completedAt?: string;
  completed_at?: string;
  errorMessage?: string;
  error_message?: string;
}

export interface RebuildChain {
  chainId?: string;
  chain_id?: string;
  id?: string;
  rootArtifactId?: string;
  root_artifact_id?: string;
  rootArtifactName?: string;
  root_artifact_name?: string;
  rootArtifactVersion?: string;
  root_artifact_version?: string;
  triggerType?: string;
  trigger_type?: string;
  rootCause?: string;
  root_cause?: string;
  parentChainId?: string;
  parent_chain_id?: string;
  status: 'running' | 'completed' | 'completed_with_errors' | 'cancelled';
  depth: number;
  startedAt?: string;
  started_at?: string;
  completedAt?: string;
  completed_at?: string;
  taskCount?: number;
  task_count?: number;
  taskStatusCounts?: Record<string, number>;
  task_status_counts?: Record<string, number>;
  tasks: CascadeTask[];
  buildId?: string;
  build_id?: string;
}

export interface DependencyConflict {
  id: string;
  artifactId: string;
  artifactName?: string;
  artifactVersion?: string;
  conflictDescription: string;
  involvedArtifacts: string[];
  suggestedResolutions?: string[];
  detectedAt: string;
}

export interface DashboardStats {
  totalArtifacts: number;
  totalBuilds: number;
  successRate: number;
  queueCount: number;
  pendingCount: number;
  buildingCount: number;
  successCount: number;
  failedCount: number;
  cancelledCount: number;
}

export interface Deployment {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'deploying' | 'healthy' | 'unhealthy' | 'failed' | 'rolled_back' | 'paused';
  deploymentSpec: string;
  deployedAt?: string;
  completedAt?: string;
  deployedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentVersion {
  id: string;
  deploymentId: string;
  versionNumber: number;
  composeConfig: string;
  artifactVersions: string; // JSON string
  deployedAt: string;
  undeployedAt?: string;
  status: 'active' | 'previous' | 'failed' | 'rolled_back';
  dockerComposeOutput?: string;
}

export interface DeploymentEvent {
  id: string;
  deploymentId: string;
  eventType: 'planned' | 'started' | 'progressed' | 'succeeded' | 'failed' | 'rolled_back';
  message?: string;
  metadata?: string; // JSON string
  createdAt: string;
}

export interface ContainerStats {
  cpu: string;
  memoryUsage: string;
  memoryPercent: string;
  network: string;
  online: boolean;
}

export interface ServiceHealthCheck {
  id: string;
  deploymentId: string;
  serviceName: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheckedAt: string;
  responseTimeMs?: number;
  errorMessage?: string;
  checkCount: number;
  consecutiveFailures: number;
}

export const apiClient = {
  // Dashboard API
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),

  // Builds API
  getBuilds: () => request<Build[]>('/builds'),
  getBuild: (id: string) => request<Build>(`/builds/${id}`),
  retryBuild: (id: string) => request<Build>(`/builds/${id}/retry`, { method: 'POST' }),
  cancelBuild: (id: string) => request<Build>(`/builds/${id}/cancel`, { method: 'POST' }),

  // Artifact Registry API
  getArtifacts: () => request<Artifact[]>('/registry/artifacts'),
  getArtifactVersions: (name: string) => request<{ name: string; versions: any[]; latest?: string }>(`/registry/artifacts/${name}`),
  getArtifact: (name: string, version: string) => request<ArtifactMetadataJson>(`/registry/artifacts/${name}/${version}`),
  addTag: (name: string, version: string, tag: string) => 
    request<any>(`/registry/artifacts/${name}/${version}/tags`, { 
      method: 'POST', 
      body: JSON.stringify({ tags: [tag] }) 
    }),
  removeTag: (name: string, version: string, tag: string) => 
    request<void>(`/registry/artifacts/${name}/${version}/tags/${tag}`, { method: 'DELETE' }),
  deleteArtifact: (name: string, version: string) => 
    request<void>(`/registry/artifacts/${name}/${version}`, { method: 'DELETE' }),

  // Dependencies API
  getDependencyGraph: (name: string, version: string, depth = 2, direction = 'forward') => 
    request<any>(`/dependencies/graph/${name}/${version}?depth=${depth}&direction=${direction}`),
  resolveDependencies: (name: string, version: string) => 
    request<any>(`/dependencies/resolve/${name}/${version}`, { method: 'POST' }),
  getReverseDependencies: (name: string, version: string, depth = 2) => 
    request<any>(`/dependencies/reverse/${name}/${version}?depth=${depth}`),
  getConflicts: () => request<DependencyConflict[]>('/dependencies/conflicts'),

  // Cascade Rebuilds API
  getCascadeChains: () => request<RebuildChain[]>('/cascade/chains'), // Note: backend trigger / chains list endpoint might vary, we can fetch all or handle no chains empty list gracefully
  getCascadeChain: (id: string) => request<RebuildChain>(`/cascade/chains/${id}`),
  triggerCascade: (name: string, version: string, reason: string, maxDepth = 5) => 
    request<any>(`/cascade/trigger/${name}/${version}`, { 
      method: 'POST', 
      body: JSON.stringify({ reason, max_depth: maxDepth }) 
    }),
  cancelCascade: (id: string) => request<any>(`/cascade/chains/${id}/cancel`, { method: 'POST' }),
  getCascadeImpact: (name: string, version: string) => request<any>(`/cascade/impact/${name}/${version}`),

  // Deployments API
  getDeployments: () => request<Deployment[]>('/deployments'),
  getDeployment: (id: string) => request<Deployment>(`/deployments/${id}`),
  createOrUpdateDeployment: (name: string, specYaml: string, username?: string) => 
    request<Deployment>('/deployments', { 
      method: 'POST', 
      body: JSON.stringify({ name, specYaml, username }) 
    }),
  planDeployment: (specYaml: string) => 
    request<any>('/deployments/plan', { 
      method: 'POST', 
      body: JSON.stringify({ specYaml }) 
    }),
  deploy: (id: string) => request<Deployment>(`/deployments/${id}/deploy`, { method: 'POST' }),
  rollback: (id: string, version: number) => 
    request<any>(`/deployments/${id}/rollback/${version}`, { method: 'POST' }),
  getDeploymentVersions: (id: string) => request<DeploymentVersion[]>(`/deployments/${id}/versions`),
  getDeploymentEvents: (id: string) => request<DeploymentEvent[]>(`/deployments/${id}/events`),
  getServiceHealthChecks: (id: string) => request<ServiceHealthCheck[]>(`/deployments/${id}/health`),
  triggerHealthCheck: (id: string) => request<any>(`/deployments/${id}/health/check`, { method: 'POST' }),
  getContainerLogs: (id: string, serviceName: string) => request<{ logs: string }>(`/deployments/${id}/logs/${serviceName}`),
  getContainerStats: (id: string, serviceName: string) => request<ContainerStats>(`/deployments/${id}/stats/${serviceName}`),
  pause: (id: string) => request<Deployment>(`/deployments/${id}/pause`, { method: 'POST' }),
  resume: (id: string) => request<Deployment>(`/deployments/${id}/resume`, { method: 'POST' }),
  restart: (id: string) => request<Deployment>(`/deployments/${id}/restart`, { method: 'POST' }),
  deleteDeployment: (id: string) => request<void>(`/deployments/${id}`, { method: 'DELETE' }),

  // Auth API
  login: (username: string, password: string) => 
    request<{ username: string; role: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request<{ username: string; role: string }>('/auth/me'),

  // User Management API
  getUsers: () => request<any[]>('/users'),
  createUser: (userData: any) => 
    request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
  updateUsername: (id: string, username: string) => 
    request<any>(`/users/${id}/username`, {
      method: 'PUT',
      body: JSON.stringify({ username })
    }),
  updateUserRole: (id: string, role: string) => 
    request<any>(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    }),
  resetUserPassword: (id: string, password: string) => 
    request<void>(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password })
    }),
  deleteUser: (id: string) => 
    request<void>(`/users/${id}`, { method: 'DELETE' }),
};
