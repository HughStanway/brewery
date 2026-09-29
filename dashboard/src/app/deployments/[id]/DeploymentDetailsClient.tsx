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
  Trash2
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

  const deployMutation = useMutation({
    mutationFn: () => apiClient.deploy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment', id] });
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
    onError: (err: any) => {
      alert('Error triggering deployment: ' + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deleteDeployment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      router.push('/deployments');
    },
    onError: (err: any) => {
      alert('Error deleting mapping: ' + err.message);
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-mono text-sm animate-pulse">Loading deployment mapping...</p>
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

  let statusColor = 'text-gray-500 bg-gray-100 border-gray-200';
  let StatusIcon = Clock;
  if (deployment.status === 'SUCCESS') {
    statusColor = 'text-emerald-500 bg-emerald-50 border-emerald-200';
    StatusIcon = CheckCircle2;
  } else if (deployment.status === 'FAILED') {
    statusColor = 'text-red-500 bg-red-50 border-red-200';
    StatusIcon = XCircle;
  } else if (deployment.status === 'DEPLOYING') {
    statusColor = 'text-blue-500 bg-blue-50 border-blue-200 animate-pulse';
    StatusIcon = Rocket;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Navigation */}
      <button
        onClick={() => router.push('/deployments')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Deployments
      </button>

      {/* Header */}
      <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-[var(--primary)] rounded-2xl shrink-0">
            <Server className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{deployment.name}</h1>
            <p className="text-xs text-gray-500 font-mono mt-0.5">Komodo Stack: {deployment.komodoStackName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => deployMutation.mutate()}
            disabled={deployMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <Rocket className="w-4 h-4" />
            {deployMutation.isPending ? 'Deploying...' : 'Deploy Now via Komodo'}
          </button>
          
          {deployment.komodoUrl && (
            <a
              href={deployment.komodoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20"
            >
              Open in Komodo UI
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          <button
            onClick={() => {
              if (confirm(`Delete deployment mapping for ${deployment.name}?`)) {
                deleteMutation.mutate();
              }
            }}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Delete mapping"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overview Card */}
      <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-3xl shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-gray-900 border-b border-[var(--card-border)] pb-3">
          Mapping Configuration & Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Status</span>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColor}`}>
                <StatusIcon className="w-4 h-4" />
                {deployment.status}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Linked Artifact</span>
              <span className="font-mono text-gray-800 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 inline-block font-semibold">
                {deployment.artifactName || 'Not specified'}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Deployed Version</span>
              <span className="font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 inline-block font-bold">
                {deployment.deployedVersion || 'None'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Komodo Stack Target</span>
              <span className="font-mono text-gray-800 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 inline-block">
                {deployment.komodoStackName}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Last Deployed At</span>
              <span className="font-mono text-gray-600">
                {deployment.deployedAt ? new Date(deployment.deployedAt).toLocaleString() : 'Never'}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Created By</span>
              <span className="text-gray-700 font-semibold">{deployment.deployedBy || 'system'}</span>
            </div>
          </div>
        </div>

        {deployment.description && (
          <div className="pt-4 border-t border-[var(--card-border)]">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Description</span>
            <p className="text-sm text-gray-600">{deployment.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
