'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  PauseCircle,
  PlayCircle,
  Terminal,
  AlertTriangle,
  Cpu
} from 'lucide-react';

export default function DeploymentDetailsClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = (searchParams?.get('id') || params?.id) as string;

  const { data: deployment, isLoading } = useQuery({
    queryKey: ['deployment', id],
    queryFn: () => apiClient.getDeployment(id),
    enabled: !!id,
    refetchInterval: 5000,
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

  const deployMutation = useMutation({
    mutationFn: () => apiClient.deploy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment', id] });
      queryClient.invalidateQueries({ queryKey: ['deployment-status', id] });
    },
    onError: (err: any) => alert('Error triggering deployment: ' + err.message)
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

  if (isLoading) {
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
  const k8sName = deployment.k8sDeploymentName || deployment.komodoStackName || deployment.name;
  const containerName = deployment.k8sContainerName || 'app';
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
              <span>k8s: {k8sName}</span>
              <span>container: {containerName}</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => deployMutation.mutate()}
            disabled={deployMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md disabled:opacity-50"
          >
            <Rocket className="w-4 h-4" />
            {deployMutation.isPending ? 'Deploying...' : 'Deploy Now'}
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
              <span className="font-mono text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-bold">
                {deployment.deployedVersion || 'None'}
              </span>
            </div>

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
