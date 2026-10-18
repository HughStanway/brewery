'use client';

import React from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { 
  ArrowLeft,
  Rocket, 
  Server, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ExternalLink,
  Trash2,
  RotateCw,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Terminal,
  AlertTriangle,
  Cpu,
  Settings
} from 'lucide-react';

export default function DeploymentDetailsClient() {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const pathSegmentId = React.useMemo(() => {
    if (!pathname || !pathname.startsWith('/deployments/')) return undefined;
    const seg = pathname.split('/')[2];
    if (!seg || seg === 'details' || seg === '1') return undefined;
    return seg;
  }, [pathname]);

  const paramId = typeof params?.id === 'string' && params.id !== '1' ? params.id : undefined;
  const id = (searchParams?.get('id') || paramId || pathSegmentId || '') as string;

  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedVersion, setSelectedVersion] = React.useState('');
  const [editPort, setEditPort] = React.useState('80');
  const [editCpuLimit, setEditCpuLimit] = React.useState('');
  const [editMemoryLimit, setEditMemoryLimit] = React.useState('');
  const [editPublicDomain, setEditPublicDomain] = React.useState('');
  const [editEnvVars, setEditEnvVars] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');

  const { data: deployment, isLoading } = useQuery({
    queryKey: ['deployment', id],
    queryFn: () => apiClient.getDeployment(id),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: artifactVersionsData } = useQuery({
    queryKey: ['artifact-versions', deployment?.artifactName],
    queryFn: () => apiClient.getArtifactVersions(deployment!.artifactName!),
    enabled: !!deployment?.artifactName,
  });

  const { data: statusData } = useQuery({
    queryKey: ['deployment-status', id],
    queryFn: () => apiClient.getDeploymentStatus(id),
    enabled: !!id,
    refetchInterval: 3000,
  });

  const { data: logData, isLoading: logsLoading } = useQuery({
    queryKey: ['deployment-logs', id],
    queryFn: () => apiClient.getDeploymentLogs(id, 150),
    enabled: !!id,
    refetchInterval: 4000,
  });

  const availableVersions: string[] = React.useMemo(() => {
    if (!artifactVersionsData?.versions) return [];
    return artifactVersionsData.versions.map((v: any) => (typeof v === 'string' ? v : v.version)).filter(Boolean);
  }, [artifactVersionsData]);

  React.useEffect(() => {
    if (deployment && !isEditing) {
      setEditPort(String(deployment.containerPort || 80));
      setEditCpuLimit(deployment.cpuLimit || '');
      setEditMemoryLimit(deployment.memoryLimit || '');
      setEditPublicDomain(deployment.publicDomain || '');
      setEditEnvVars(deployment.envVars || '');
      setEditDescription(deployment.description || '');
    }
  }, [deployment, isEditing]);

  const deployMutation = useMutation({
    mutationFn: (version?: string) => apiClient.deploy(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment', id] });
      queryClient.invalidateQueries({ queryKey: ['deployment-status', id] });
    },
    onError: (err: any) => alert('Error triggering deployment: ' + err.message)
  });

  const rollbackMutation = useMutation({
    mutationFn: (version?: string) => apiClient.rollbackDeployment(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment', id] });
      queryClient.invalidateQueries({ queryKey: ['deployment-status', id] });
    },
    onError: (err: any) => alert('Error rolling back deployment: ' + err.message)
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: {
      containerPort?: number;
      cpuLimit?: string;
      memoryLimit?: string;
      publicDomain?: string;
      envVars?: string;
      description?: string;
    }) =>
      apiClient.updateDeployment(id, {
        name: deployment?.name,
        namespace: deployment?.namespace,
        k8sDeploymentName: deployment?.k8sDeploymentName,
        containerName: deployment?.k8sContainerName,
        artifactName: deployment?.artifactName,
        ...data,
        username: 'dashboard-user',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment', id] });
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      setIsEditing(false);
    },
    onError: (err: any) => alert('Error updating deployment configuration: ' + err.message)
  });

  const restartMutation = useMutation({
    mutationFn: () => apiClient.restartDeployment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment', id] });
      queryClient.invalidateQueries({ queryKey: ['deployment-status', id] });
    },
    onError: (err: any) => alert('Error restarting deployment: ' + err.message)
  });

  const scaleMutation = useMutation({
    mutationFn: (replicas: number) => apiClient.scaleDeployment(id, replicas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment', id] });
      queryClient.invalidateQueries({ queryKey: ['deployment-status', id] });
    },
    onError: (err: any) => alert('Error scaling deployment: ' + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (deleteK8s: boolean) => apiClient.deleteDeployment(id, deleteK8s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      router.push('/deployments');
    },
    onError: (err: any) => alert('Error deleting deployment: ' + err.message)
  });

  if (!id || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-mono text-sm animate-pulse">Loading deployment details...</p>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="p-12 text-center text-gray-500 font-mono space-y-4">
        <p>Deployment mapping not found.</p>
        <button 
          onClick={() => router.push('/deployments')} 
          className="text-blue-600 font-bold hover:underline"
        >
          ← Back to Deployments
        </button>
      </div>
    );
  }

  const ns = deployment.namespace || statusData?.namespace || 'default';
  const k8sName = deployment.k8sDeploymentName || deployment.name;
  const containerName = deployment.k8sContainerName || 'app';
  const port = deployment.containerPort || 80;
  const headlampUrl = deployment.headlampUrl || statusData?.headlampUrl || `https://deployments.bigiron.dev/c/main/deployments/${ns}/${k8sName}`;

  const currentStatus = statusData?.status || deployment.status;
  let statusColor = 'text-gray-500 bg-gray-100 border-gray-200';
  let StatusIcon = Clock;
  if (currentStatus === 'RUNNING' || currentStatus === 'SUCCESS') {
    statusColor = 'text-emerald-500 bg-emerald-50 border-emerald-200';
    StatusIcon = CheckCircle2;
  } else if (currentStatus === 'DEGRADED') {
    statusColor = 'text-amber-500 bg-amber-50 border-amber-200';
    StatusIcon = AlertTriangle;
  } else if (currentStatus === 'STOPPED') {
    statusColor = 'text-gray-500 bg-gray-100 border-gray-300';
    StatusIcon = PauseCircle;
  } else if (currentStatus === 'FAILED') {
    statusColor = 'text-red-500 bg-red-50 border-red-200';
    StatusIcon = XCircle;
  } else if (currentStatus === 'DEPLOYING') {
    statusColor = 'text-blue-500 bg-blue-50 border-blue-200 animate-pulse';
    StatusIcon = Rocket;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Navigation */}
      <button
        onClick={() => router.push('/deployments')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Deployments
      </button>

      {/* Header Card */}
      <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-500/10 text-[var(--primary)] rounded-2xl shrink-0">
            <Server className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {deployment.name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-1">
              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-bold">ns: {ns}</span>
              <span>k8s: {k8sName}:{port}</span>
              <span>container: {containerName}</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => deployMutation.mutate(selectedVersion || undefined)}
            disabled={deployMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md disabled:opacity-50"
          >
            <Rocket className="w-4 h-4" />
            {deployMutation.isPending ? 'Deploying...' : (selectedVersion ? `Deploy v${selectedVersion}` : 'Deploy Now')}
          </button>

          {(deployment.previousDeployedVersion || availableVersions.length > 1) && (
            <button
              onClick={() => {
                const target = selectedVersion || deployment.previousDeployedVersion;
                if (confirm(`Roll back ${deployment.name} to version ${target || 'previous'}?`)) {
                  rollbackMutation.mutate(selectedVersion || undefined);
                }
              }}
              disabled={rollbackMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md disabled:opacity-50"
              title={deployment.previousDeployedVersion ? `Roll back to ${deployment.previousDeployedVersion}` : 'Roll back to previous version'}
            >
              <RotateCcw className="w-4 h-4" />
              {rollbackMutation.isPending
                ? 'Rolling Back...'
                : `Rollback${deployment.previousDeployedVersion ? ` (${deployment.previousDeployedVersion})` : ''}`}
            </button>
          )}

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-colors border border-gray-200"
          >
            <Settings className="w-4 h-4" />
            Edit Config
          </button>

          <button
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-colors border border-gray-200 disabled:opacity-50"
          >
            <RotateCw className="w-4 h-4" />
            Restart
          </button>

          {statusData?.desiredReplicas === 0 ? (
            <button
              onClick={() => scaleMutation.mutate(1)}
              disabled={scaleMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md disabled:opacity-50"
            >
              <PlayCircle className="w-4 h-4" />
              Start (Scale to 1)
            </button>
          ) : (
            <button
              onClick={() => scaleMutation.mutate(0)}
              disabled={scaleMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md disabled:opacity-50"
            >
              <PauseCircle className="w-4 h-4" />
              Stop (Scale to 0)
            </button>
          )}
          
          <a
            href={headlampUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md"
          >
            Open in Headlamp
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={() => {
              const deleteK8s = confirm(`Delete deployment ${deployment.name}?\n\nClick OK to delete K3s resources as well, or Cancel to delete Brewery mapping only.`);
              deleteMutation.mutate(deleteK8s);
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Delete deployment"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Edit Configuration Panel */}
      {isEditing && (
        <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              Edit Container & Runtime Configuration
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Container Port
              </label>
              <input
                type="number"
                value={editPort}
                onChange={(e) => setEditPort(e.target.value)}
                placeholder="80 (or 3000, 8080)"
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Public Ingress Domain (Leave blank for internal only)
              </label>
              <input
                type="text"
                value={editPublicDomain}
                onChange={(e) => setEditPublicDomain(e.target.value)}
                placeholder="e.g. app.bigiron.dev"
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                CPU Limit
              </label>
              <input
                type="text"
                value={editCpuLimit}
                onChange={(e) => setEditCpuLimit(e.target.value)}
                placeholder="e.g. 500m or 1"
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Memory Limit
              </label>
              <input
                type="text"
                value={editMemoryLimit}
                onChange={(e) => setEditMemoryLimit(e.target.value)}
                placeholder="e.g. 512Mi or 1Gi"
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Environment Variables (KEY=VALUE per line or JSON)
              </label>
              <textarea
                rows={4}
                value={editEnvVars}
                onChange={(e) => setEditEnvVars(e.target.value)}
                placeholder={'NODE_ENV=production\nPORT=8080'}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-3.5 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--card-border)] text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const parsedPort = parseInt(editPort, 10);
                updateConfigMutation.mutate({
                  containerPort: !isNaN(parsedPort) && parsedPort > 0 ? parsedPort : 80,
                  cpuLimit: editCpuLimit.trim(),
                  memoryLimit: editMemoryLimit.trim(),
                  publicDomain: editPublicDomain.trim(),
                  envVars: editEnvVars.trim(),
                  description: editDescription,
                });
              }}
              disabled={updateConfigMutation.isPending}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
            >
              {updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* Grid Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mapping Specs */}
        <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl shadow-xl space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b border-[var(--card-border)] pb-3 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" />
            K3s Deployment Specs
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400">Liveness Status:</span>
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColor}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {currentStatus}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400">Linked Artifact Target:</span>
              <span className="font-mono text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 font-semibold">
                {deployment.artifactName || 'Not linked'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400">Deployed Version:</span>
              <div className="flex items-center gap-2">
                {deployment.previousDeployedVersion && (
                  <span className="font-mono text-[10px] text-gray-400">
                    prev: {deployment.previousDeployedVersion}
                  </span>
                )}
                <span className="font-mono text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-bold">
                  {deployment.deployedVersion || 'None'}
                </span>
              </div>
            </div>

            {availableVersions.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400">Target / Rollback Version:</span>
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="font-mono text-xs bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-2.5 py-1 text-gray-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Latest / Default</option>
                  {availableVersions.map((ver) => (
                    <option key={ver} value={ver}>
                      v{ver} {ver === deployment.deployedVersion ? '(active)' : ver === deployment.previousDeployedVersion ? '(previous)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400">Container Port:</span>
              <span className="font-mono text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded border border-gray-200">
                {port} (Service 80 → {port})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400">Resource Limits:</span>
              <span className="font-mono text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded border border-gray-200">
                CPU: {deployment.cpuLimit || 'default'} · Mem: {deployment.memoryLimit || 'default'}
              </span>
            </div>

            {deployment.envVars && (
              <div className="space-y-1 pt-1">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400 block">Environment Variables:</span>
                <pre className="font-mono text-[11px] bg-gray-100 text-gray-800 p-2 rounded-lg border border-gray-200 overflow-x-auto">
                  {deployment.envVars}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400">Active Container Image:</span>
              <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] truncate max-w-[250px]">
                {statusData?.currentImage || 'Fetching...'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400">Last Deployed:</span>
              <span className="font-mono text-gray-600">
                {deployment.deployedAt ? new Date(deployment.deployedAt).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Pods */}
        <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl shadow-xl space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b border-[var(--card-border)] pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-500" />
              Active Pods ({statusData?.readyReplicas ?? 0}/{statusData?.desiredReplicas ?? 0} Ready)
            </span>
          </h2>

          <div className="space-y-2 max-h-[220px] overflow-auto">
            {statusData?.pods && statusData.pods.length > 0 ? (
              statusData.pods.map((pod) => (
                <div key={pod.name} className="p-3 bg-[var(--background)] border border-[var(--card-border)] rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className={`w-2.5 h-2.5 rounded-full ${pod.ready ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="font-bold text-gray-800">{pod.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">{pod.phase}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px]">restarts: {pod.restartCount}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs font-mono text-gray-400">
                No active pods running in K3s.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Pod Logs */}
      <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-500" />
            Live Container Log Tail
          </h2>
          <span className="text-xs text-gray-400 font-mono">Tail: 150 lines (auto-refreshes)</span>
        </div>

        <div className="bg-gray-950 text-emerald-400 font-mono text-xs p-4 rounded-2xl overflow-auto border border-gray-800 max-h-[400px]">
          {logsLoading ? (
            <div className="text-gray-500 animate-pulse">Loading logs from K3s pod...</div>
          ) : (
            <pre className="whitespace-pre-wrap leading-relaxed">{logData?.logs || 'No log output available.'}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
