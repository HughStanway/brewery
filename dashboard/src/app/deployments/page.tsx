'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
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
  Trash2
} from 'lucide-react';

export default function DeploymentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [komodoStackName, setKomodoStackName] = React.useState('');
  const [artifactName, setArtifactName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const { data: deployments, isLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: apiClient.getDeployments,
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; komodoStackName: string; artifactName: string; description?: string }) => 
      apiClient.registerOrUpdateDeployment({ ...data, username: 'dashboard-user' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      setIsCreating(false);
      setName('');
      setKomodoStackName('');
      setArtifactName('');
      setDescription('');
    },
    onError: (err: any) => {
      alert('Error registering deployment mapping: ' + err.message);
    }
  });

  const deployMutation = useMutation({
    mutationFn: (id: string) => apiClient.deploy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
    onError: (err: any) => {
      alert('Error triggering deployment: ' + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteDeployment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
    onError: (err: any) => {
      alert('Error deleting deployment mapping: ' + err.message);
    }
  });

  const filteredDeployments = React.useMemo(() => {
    if (!deployments) return [];
    return deployments.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.komodoStackName && d.komodoStackName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.artifactName && d.artifactName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [deployments, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-mono text-sm animate-pulse">Loading deployments...</p>
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
            Komodo Deployment Integration
          </h2>
          <p className="text-sm text-gray-500">Map Brewery artifact builds & cascade updates directly to Komodo deployment stacks.</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-[var(--primary)] text-white rounded-full px-4 py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Register Stack Mapping
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search mappings by name, stack, or artifact..."
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
              Register Komodo Stack Mapping
            </h3>
            <p className="text-xs text-gray-500">Link a Brewery artifact to a target Komodo deployment stack.</p>
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
                Komodo Stack Name
              </label>
              <input
                type="text"
                placeholder="e.g. production-api-stack"
                value={komodoStackName}
                onChange={(e) => setKomodoStackName(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Target Artifact Name
              </label>
              <input
                type="text"
                placeholder="e.g. api-server"
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
                placeholder="e.g. Core web API deployment"
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
                if (!name || !komodoStackName || !artifactName) {
                  alert('Please fill out Name, Komodo Stack Name, and Artifact Name.');
                  return;
                }
                createMutation.mutate({ name, komodoStackName, artifactName, description });
              }}
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-[var(--primary)] text-white px-6 py-2 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
            >
              {createMutation.isPending ? 'Registering...' : 'Save Mapping'}
            </button>
          </div>
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDeployments.length > 0 ? (
          filteredDeployments.map((d) => {
            let statusColor = 'text-gray-500 bg-gray-100 border-gray-200';
            let StatusIcon = Clock;
            if (d.status === 'SUCCESS') {
              statusColor = 'text-emerald-500 bg-emerald-50 border-emerald-200';
              StatusIcon = CheckCircle2;
            } else if (d.status === 'FAILED') {
              statusColor = 'text-red-500 bg-red-50 border-red-200';
              StatusIcon = XCircle;
            } else if (d.status === 'DEPLOYING') {
              statusColor = 'text-blue-500 bg-blue-50 border-blue-200 animate-pulse';
              StatusIcon = Rocket;
            }

            return (
              <div 
                key={d.id}
                onClick={() => router.push(`/deployments/details?id=${d.id}`)}
                className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl flex flex-col justify-between hover:border-[var(--primary)] transition-all duration-300 group cursor-pointer"
              >
                <div className="space-y-4">
                  {/* Title & Status */}
                  <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-blue-500/10 text-[var(--primary)] rounded-lg shrink-0">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-[var(--primary)] transition-colors truncate">
                          {d.name}
                        </h3>
                        <p className="text-[11px] text-gray-500 font-mono">Stack: {d.komodoStackName || d.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete mapping for ${d.name}?`)) {
                          deleteMutation.mutate(d.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete mapping"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Info List */}
                  <div className="space-y-2.5 text-xs text-gray-500">
                    <p className="line-clamp-2 min-h-[28px]">{d.description || 'No description provided'}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Artifact:</span>
                      <span className="font-mono text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                        {d.artifactName || 'Not linked'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Deployed Version:</span>
                      <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-bold">
                        {d.deployedVersion || 'None'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Status:</span>
                      <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${statusColor}`}>
                        <StatusIcon className="w-3 h-3" />
                        {d.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Last Triggered:</span>
                      <span className="font-mono text-gray-600">
                        {d.deployedAt ? new Date(d.deployedAt).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-6 pt-3 border-t border-[var(--card-border)] flex items-center justify-between text-xs">
                  <button
                    onClick={() => deployMutation.mutate(d.id)}
                    disabled={deployMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    Deploy Now
                  </button>

                  {d.komodoUrl && (
                    <a
                      href={d.komodoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-bold text-[var(--primary)] hover:underline"
                    >
                      Komodo UI
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full p-12 text-center text-gray-500 font-mono border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--background)]/50">
            No Komodo stack mappings registered yet.
          </div>
        )}
      </div>
    </div>
  );
}
