'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Rocket, 
  Search, 
  Plus,
  Server,
  CheckCircle2,
  XCircle,
  Clock,
  Activity
} from 'lucide-react';

const BOILERPLATE_SPEC = `version: 1
deployment:
  name: "production-http"
  description: "Production web server deployment"

services:
  http-server:
    artifact: "http-server-bin@latest"
    type: "binary"
    ports:
      - "8080:8080"
`;

export default function DeploymentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [yamlContent, setYamlContent] = React.useState(BOILERPLATE_SPEC);

  const { data: deployments, isLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: apiClient.getDeployments,
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (args: { name: string; yaml: string }) => 
      apiClient.createOrUpdateDeployment(args.name, args.yaml, 'dashboard-user'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      setIsCreating(false);
      router.push(`/deployments/${data.id}`);
    },
    onError: (err: any) => {
      alert('Error creating deployment: ' + err.message);
    }
  });

  const filteredDeployments = React.useMemo(() => {
    if (!deployments) return [];
    return deployments.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
            Deployment Engine
          </h2>
          <p className="text-sm text-gray-500">Configure, rollout, and rollback multi-container applications on your target environments.</p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setNewName('');
            setYamlContent(BOILERPLATE_SPEC);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-[var(--primary)] text-white rounded-full px-4 py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20 md:self-end"
        >
          <Plus className="w-4 h-4" />
          Create Stack
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search stacks..."
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
              Create New Stack
            </h3>
            <p className="text-xs text-gray-500">Configure a new deployment stack database entry.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Stack Name
              </label>
              <input
                type="text"
                placeholder="e.g. production-http"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-2xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Deployment Specification (YAML)
              </label>
              <textarea
                rows={12}
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-2xl p-4 text-xs font-mono text-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
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
              onClick={() => createMutation.mutate({ name: newName, yaml: yamlContent })}
              disabled={createMutation.isPending || !newName || !yamlContent}
              className="bg-blue-600 hover:bg-[var(--primary)] text-white rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Save & Configure'}
            </button>
          </div>
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDeployments.length > 0 ? (
          filteredDeployments.map((d) => {
            let statusColor = 'text-gray-500 bg-gray-100 border-gray-200';
            let StatusIcon = Activity;
            if (d.status === 'healthy') {
              statusColor = 'text-emerald-500 bg-emerald-50 border-emerald-200';
              StatusIcon = CheckCircle2;
            }
            if (d.status === 'unhealthy' || d.status === 'failed') {
              statusColor = 'text-red-500 bg-red-50 border-red-200';
              StatusIcon = XCircle;
            }
            if (d.status === 'deploying') {
              statusColor = 'text-[var(--primary)] bg-blue-50 border-blue-200 animate-pulse';
              StatusIcon = Rocket;
            }
            if (d.status === 'rolled_back') {
              statusColor = 'text-amber-500 bg-amber-50 border-amber-200';
              StatusIcon = Clock;
            }
            if (d.status === 'paused') {
              statusColor = 'text-amber-500 bg-amber-50 border-amber-200';
              StatusIcon = Clock;
            }

            return (
              <div 
                key={d.id} 
                className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl flex flex-col justify-between hover:border-[var(--primary)] transition-all duration-300 group cursor-pointer"
                onClick={() => router.push(`/deployments/${d.id}`)}
              >
                <div className="space-y-4">
                  {/* Title & Status */}
                  <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-blue-500/10 text-[var(--primary)] rounded-lg group-hover:scale-110 transition-transform shrink-0">
                        <Server className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-900 group-hover:text-[var(--primary)] transition-colors truncate">
                        {d.name}
                      </h3>
                    </div>
                  </div>

                  {/* Info List */}
                  <div className="space-y-2.5 text-xs text-gray-500">
                    <p className="line-clamp-2 min-h-[32px]">{d.description || 'No description provided'}</p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Status:</span>
                      <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${statusColor}`}>
                        <StatusIcon className="w-3 h-3" />
                        {d.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Last Deploy:</span>
                      <span className="font-mono bg-gray-50 px-2 py-0.5 rounded-lg border border-[var(--card-border)]">
                        {d.deployedAt ? new Date(d.deployedAt).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="mt-6 pt-3 border-t border-[var(--card-border)] flex items-center text-xs font-bold text-[var(--primary)] group-hover:underline">
                  Manage Deployment →
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full p-12 text-center text-gray-500 font-mono border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--background)]/50">
            No deployment stacks match your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
