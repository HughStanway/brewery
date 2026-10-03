'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, Deployment, DeploymentStatus } from '@/api/client';
import { useRouter } from 'next/navigation';
import { 
  Rocket, 
  Search, 
  Plus,
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
  X
} from 'lucide-react';

function DeploymentCard({ d, onSelect }: { d: Deployment; onSelect: () => void }) {
  const queryClient = useQueryClient();
  const [showLogs, setShowLogs] = React.useState(false);

  const { data: statusData } = useQuery({
    queryKey: ['deployment-status', d.id],
    queryFn: () => apiClient.getDeploymentStatus(d.id),
    refetchInterval: 4000,
  });

  const { data: logData, isLoading: logsLoading } = useQuery({
    queryKey: ['deployment-logs', d.id],
    queryFn: () => apiClient.getDeploymentLogs(d.id, 100),
    enabled: showLogs,
    refetchInterval: showLogs ? 3000 : false,
  });

  const deployMutation = useMutation({
    mutationFn: () => apiClient.deploy(d.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['deployment-status', d.id] });
    },
    onError: (err: any) => alert('Error deploying: ' + err.message)
  });

  const restartMutation = useMutation({
    mutationFn: () => apiClient.restartDeployment(d.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['deployment-status', d.id] });
    },
    onError: (err: any) => alert('Error restarting: ' + err.message)
  });

  const scaleMutation = useMutation({
    mutationFn: (replicas: number) => apiClient.scaleDeployment(d.id, replicas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['deployment-status', d.id] });
    },
    onError: (err: any) => alert('Error scaling: ' + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (deleteK8s: boolean) => apiClient.deleteDeployment(d.id, deleteK8s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
    onError: (err: any) => alert('Error deleting: ' + err.message)
  });

  const ns = d.namespace || statusData?.namespace || 'default';
  const k8sName = d.k8sDeploymentName || d.komodoStackName || d.name;

  const currentStatus = statusData?.status || d.status;
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

  const headlampUrl = d.headlampUrl || statusData?.headlampUrl || `https://deployments.bigiron.dev/c/main/deployments/${ns}/${k8sName}`;

  return (
    <>
      <div 
        onClick={onSelect}
        className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl flex flex-col justify-between hover:border-[var(--primary)] transition-all duration-300 group cursor-pointer"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-blue-500/10 text-[var(--primary)] rounded-lg shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 group-hover:text-[var(--primary)] transition-colors truncate">
                  {d.name}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">ns: {ns}</span>
                  <span className="truncate">k8s: {k8sName}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                const deleteK8s = confirm(`Delete deployment ${d.name}?\n\nClick OK to delete K3s resources as well, or Cancel to delete Brewery mapping only.`);
                deleteMutation.mutate(deleteK8s);
              }}
              className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete deployment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Details */}
          <div className="space-y-2.5 text-xs text-gray-500">
            <p className="line-clamp-2 min-h-[28px]">{d.description || 'No description provided'}</p>
            
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Target Artifact:</span>
              <span className="font-mono text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                {d.artifactName || 'Not linked'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Active Version:</span>
              <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-bold">
                {d.deployedVersion || 'None'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Liveness & Health:</span>
              <div className="flex items-center gap-2">
                {statusData && (
                  <span className="font-mono text-[10px] text-gray-600 font-bold">
                    {statusData.readyReplicas ?? 0}/{statusData.desiredReplicas ?? 0} Ready
                  </span>
                )}
                <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${statusColor}`}>
                  <StatusIcon className="w-3 h-3" />
                  {currentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-6 pt-3 border-t border-[var(--card-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                deployMutation.mutate();
              }}
              disabled={deployMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              title="Deploy / Patch Image"
            >
              <Rocket className="w-3.5 h-3.5" />
              Deploy
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                restartMutation.mutate();
              }}
              disabled={restartMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
              title="Rolling Restart"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Restart
            </button>

            {statusData?.desiredReplicas === 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  scaleMutation.mutate(1);
                }}
                disabled={scaleMutation.isPending}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg font-semibold transition-colors disabled:opacity-50"
                title="Start (Scale to 1)"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Start
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  scaleMutation.mutate(0);
                }}
                disabled={scaleMutation.isPending}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-semibold transition-colors disabled:opacity-50"
                title="Stop (Scale to 0)"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Stop
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLogs(true);
              }}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
              title="View Pod Logs"
            >
              <Terminal className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={headlampUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 font-bold text-[var(--primary)] hover:underline ml-auto"
          >
            Headlamp
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLogs(false)}>
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-6 w-full max-w-4xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-gray-900 text-lg">Pod Logs: {ns}/{k8sName}</h3>
              </div>
              <button onClick={() => setShowLogs(false)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-gray-950 text-emerald-400 font-mono text-xs p-4 rounded-xl overflow-auto border border-gray-800 min-h-[300px]">
              {logsLoading ? (
                <div className="text-gray-500 animate-pulse">Fetching log output from K3s...</div>
              ) : (
                <pre className="whitespace-pre-wrap leading-relaxed">{logData?.logs || 'No log output available.'}</pre>
              )}
            </div>

            <div className="flex justify-end shrink-0">
              <button onClick={() => setShowLogs(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-sm">
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DeploymentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [namespace, setNamespace] = React.useState('default');
  const [k8sDeploymentName, setK8sDeploymentName] = React.useState('');
  const [containerName, setContainerName] = React.useState('app');
  const [artifactName, setArtifactName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const { data: deployments, isLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: apiClient.getDeployments,
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      namespace: string;
      k8sDeploymentName: string;
      containerName: string;
      artifactName: string;
      description?: string;
    }) => apiClient.registerOrUpdateDeployment({ ...data, username: 'dashboard-user' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      setIsCreating(false);
      setName('');
      setNamespace('default');
      setK8sDeploymentName('');
      setContainerName('app');
      setArtifactName('');
      setDescription('');
    },
    onError: (err: any) => {
      alert('Error registering deployment: ' + err.message);
    }
  });

  const filteredDeployments = React.useMemo(() => {
    if (!deployments) return [];
    return deployments.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((d.k8sDeploymentName || d.komodoStackName) && (d.k8sDeploymentName || d.komodoStackName)!.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.artifactName && d.artifactName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [deployments, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-mono text-sm animate-pulse">Loading K3s deployments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Rocket className="w-6 h-6 text-[var(--primary)]" />
            Kubernetes Workload Deployments
          </h2>
          <p className="text-sm text-gray-500">Manage K3s workloads, trigger rolling updates, monitor liveness, and launch Headlamp diagnostics.</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-[var(--primary)] text-white rounded-full px-4 py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Register K3s Deployment
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by deployment name, namespace, or artifact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-2xl pl-10 pr-4 py-2 text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {isCreating && (
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-6 shadow-xl space-y-6 mb-6">
          <div className="border-b border-[var(--card-border)] pb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[var(--primary)]" />
              Register K3s Deployment Mapping
            </h3>
            <p className="text-xs text-gray-500">Link a Brewery artifact to a K3s Kubernetes workload deployment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Production API"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                K3s Namespace
              </label>
              <input
                type="text"
                placeholder="e.g. default or brewery"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                K3s Deployment Name
              </label>
              <input
                type="text"
                placeholder="e.g. cxx-api-service"
                value={k8sDeploymentName}
                onChange={(e) => setK8sDeploymentName(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Target Container Name
              </label>
              <input
                type="text"
                placeholder="e.g. app"
                value={containerName}
                onChange={(e) => setContainerName(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Target Artifact Name
              </label>
              <input
                type="text"
                placeholder="e.g. cxx-api-service"
                value={artifactName}
                onChange={(e) => setArtifactName(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. Core C++ web API deployment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-2xl text-sm font-semibold border border-[var(--card-border)] text-gray-500 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!name || !artifactName) {
                  alert('Please fill out Display Name and Target Artifact Name.');
                  return;
                }
                createMutation.mutate({
                  name,
                  namespace,
                  k8sDeploymentName: k8sDeploymentName || name,
                  containerName: containerName || 'app',
                  artifactName,
                  description
                });
              }}
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-[var(--primary)] text-white px-6 py-2 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
            >
              {createMutation.isPending ? 'Registering...' : 'Save Deployment'}
            </button>
          </div>
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDeployments.length > 0 ? (
          filteredDeployments.map((d) => (
            <DeploymentCard key={d.id} d={d} onSelect={() => router.push(`/deployments/details?id=${d.id}`)} />
          ))
        ) : (
          <div className="col-span-full p-12 text-center text-gray-500 font-mono border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--background)]/50">
            No Kubernetes workload deployments registered yet.
          </div>
        )}
      </div>
    </div>
  );
}
