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
  Activity,
  X
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
  const [yamlContent, setYamlContent] = React.useState(BOILERPLATE_SPEC);
  const [showQuickDeployModal, setShowQuickDeployModal] = React.useState(false);

  const { data: deployments, isLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: apiClient.getDeployments,
    refetchInterval: 5000,
  });

  const { data: artifacts, isLoading: isLoadingArtifacts } = useQuery({
    queryKey: ['quickDeployArtifacts'],
    queryFn: apiClient.getArtifacts,
    enabled: showQuickDeployModal,
  });

  // Handle Mount URL Quick Deploy check
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const quickDeploy = params.get('quickDeploy');
      const artifactName = params.get('artifactName');
      const artifactVersion = params.get('artifactVersion');
      if (quickDeploy === 'true' && artifactName && artifactVersion) {
        apiClient.getArtifact(artifactName, artifactVersion)
          .then((metadata) => {
            if (metadata && metadata.deployment_yaml) {
              setYamlContent(metadata.deployment_yaml);
              setIsCreating(true);
              // Clear query params so refreshing doesn't keep opening it
              const newUrl = window.location.pathname;
              window.history.replaceState({}, '', newUrl);
              
              // Scroll to form after rendering
              setTimeout(() => {
                const formElement = document.getElementById('create-stack-form');
                if (formElement) {
                  formElement.scrollIntoView({ behavior: 'smooth' });
                }
              }, 100);
            } else {
              alert(`No deployment configuration found for artifact ${artifactName}@${artifactVersion}`);
            }
          })
          .catch((err) => {
            console.error("Error fetching quick deploy metadata", err);
          });
      }
    }
  }, []);

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

  const artifactsWithConfig = React.useMemo(() => {
    if (!artifacts) return [];
    return artifacts.map(art => {
      let parsedMeta = null;
      try {
        if (art.metadata) {
          parsedMeta = JSON.parse(art.metadata);
        }
      } catch (e) {}
      return { ...art, parsedMeta };
    }).filter(art => art.parsedMeta && art.parsedMeta.deployment_yaml);
  }, [artifacts]);

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
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setShowQuickDeployModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Rocket className="w-4 h-4" />
            Quick Deploy
          </button>
          <button
            onClick={() => {
              setIsCreating(true);
              setYamlContent(BOILERPLATE_SPEC);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-[var(--primary)] text-white rounded-full px-4 py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Create Stack
          </button>
        </div>
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
        <div id="create-stack-form" className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-6 shadow-xl space-y-6 mb-6">
          <div className="border-b border-[var(--card-border)] pb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[var(--primary)]" />
              Create New Stack
            </h3>
            <p className="text-xs text-gray-500">Configure a new deployment stack database entry.</p>
          </div>

          <div className="space-y-4">
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

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-2xl text-sm font-semibold border border-[var(--card-border)] text-gray-500 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const nameMatch = yamlContent.match(/name:\s*["']?([^"'\n\r]+)["']?/);
                const name = nameMatch ? nameMatch[1].trim() : '';
                if (!name) {
                  alert('Deployment name not found in YAML. Please add a "name:" field.');
                  return;
                }
                createMutation.mutate({ name, yaml: yamlContent });
              }}
              disabled={createMutation.isPending || !yamlContent}
              className="bg-blue-600 hover:bg-[var(--primary)] text-white px-6 py-2 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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

      {/* QUICK DEPLOY MODAL */}
      {showQuickDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[var(--card)] border border-[var(--card-border)] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-zoomIn flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-emerald-600 animate-pulse" />
                  Quick Deploy stack from Registry
                </h3>
                <p className="text-xs text-gray-500 mt-1">Select a build artifact containing a deployment.yaml configuration to auto-fill the stack creation form.</p>
              </div>
              <button 
                onClick={() => setShowQuickDeployModal(false)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {isLoadingArtifacts ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 text-xs font-mono">Loading registry packages...</p>
                </div>
              ) : artifactsWithConfig.length > 0 ? (
                <div className="space-y-3">
                  {artifactsWithConfig.map((art: any) => (
                    <div 
                      key={art.id}
                      onClick={() => {
                        setYamlContent(art.parsedMeta.deployment_yaml);
                        setIsCreating(true);
                        setShowQuickDeployModal(false);
                        setTimeout(() => {
                          const form = document.getElementById('create-stack-form');
                          if (form) form.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="p-4 border border-[var(--card-border)] rounded-2xl bg-[var(--background)] hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 group-hover:text-emerald-600 transition-colors">{art.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 border border-[var(--card-border)] rounded-lg text-gray-600">{art.version}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono flex flex-wrap gap-x-4 gap-y-1">
                          <span>branch: {art.parsedMeta.branch || 'unknown'}</span>
                          <span>commit: {art.parsedMeta.commit ? art.parsedMeta.commit.substring(0, 7) : 'unknown'}</span>
                          <span>built: {art.parsedMeta.built_at ? new Date(art.parsedMeta.built_at).toLocaleString() : 'unknown'}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide bg-emerald-50 border border-emerald-200 text-emerald-600 uppercase">
                          <Rocket className="w-3 h-3" />
                          Ready to Deploy
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500 font-mono text-xs border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--background)]/30">
                  No build artifacts in the registry contain a deployment.yaml configuration.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--card-border)] bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setShowQuickDeployModal(false)}
                className="px-5 py-2.5 bg-white border border-[var(--card-border)] rounded-2xl text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors shadow-sm"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
