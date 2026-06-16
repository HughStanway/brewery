'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, Deployment, DeploymentVersion, DeploymentEvent, ServiceHealthCheck } from '@/api/client';
import { 
  Rocket, 
  Plus, 
  Search, 
  Terminal, 
  Activity, 
  History, 
  Save, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RotateCcw,
  Clock,
  ChevronRight,
  Info
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
    healthCheck:
      endpoint: "GET /health"
      interval: 10s
      timeout: 5s
      unhealthyThreshold: 3
    resources:
      cpus: "0.5"
      memory: "256m"
`;

export default function DeploymentsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'config' | 'history' | 'logs'>('dashboard');
  const [isCreating, setIsCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [yamlContent, setYamlContent] = React.useState(BOILERPLATE_SPEC);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Queries
  const { data: deployments, isLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: apiClient.getDeployments,
    refetchInterval: 5000,
  });

  const { data: currentVersions } = useQuery({
    queryKey: ['deploymentVersions', selectedId],
    queryFn: () => selectedId ? apiClient.getDeploymentVersions(selectedId) : Promise.resolve([]),
    enabled: !!selectedId,
    refetchInterval: activeTab === 'history' ? 5000 : false,
  });

  const { data: currentEvents } = useQuery({
    queryKey: ['deploymentEvents', selectedId],
    queryFn: () => selectedId ? apiClient.getDeploymentEvents(selectedId) : Promise.resolve([]),
    enabled: !!selectedId,
    refetchInterval: activeTab === 'logs' ? 5000 : false,
  });

  const { data: currentHealth } = useQuery({
    queryKey: ['deploymentHealth', selectedId],
    queryFn: () => selectedId ? apiClient.getServiceHealthChecks(selectedId) : Promise.resolve([]),
    enabled: !!selectedId,
    refetchInterval: 5000,
  });

  const selectedDeployment = React.useMemo(() => {
    return deployments?.find(d => d.id === selectedId) || null;
  }, [deployments, selectedId]);

  const sortedEvents = React.useMemo(() => {
    if (!currentEvents) return [];
    return [...currentEvents].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return currentEvents.indexOf(b) - currentEvents.indexOf(a);
    });
  }, [currentEvents]);

  // Sync edited yaml when switching selected deployment
  React.useEffect(() => {
    if (selectedDeployment) {
      setYamlContent(selectedDeployment.deploymentSpec);
    }
  }, [selectedId, selectedDeployment]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (args: { name: string; yaml: string }) => 
      apiClient.createOrUpdateDeployment(args.name, args.yaml, 'dashboard-user'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      setIsCreating(false);
      setSelectedId(data.id);
      setActiveTab('config');
    },
    onError: (err: any) => {
      alert('Error creating deployment: ' + err.message);
    }
  });

  const saveMutation = useMutation({
    mutationFn: (args: { id: string; name: string; yaml: string }) => 
      apiClient.createOrUpdateDeployment(args.name, args.yaml, 'dashboard-user'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      alert('Configuration saved successfully!');
    },
    onError: (err: any) => {
      alert('Error saving config: ' + err.message);
    }
  });

  const deployMutation = useMutation({
    mutationFn: (id: string) => apiClient.deploy(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['deploymentEvents', data.id] });
      queryClient.invalidateQueries({ queryKey: ['deploymentVersions', data.id] });
      alert('Rollout deployment triggered successfully!');
    },
    onError: (err: any) => {
      alert('Deployment failed: ' + err.message);
    }
  });

  const rollbackMutation = useMutation({
    mutationFn: (args: { id: string; version: number }) => apiClient.rollback(args.id, args.version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['deploymentEvents', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['deploymentVersions', selectedId] });
      alert('Rollback triggered successfully!');
    },
    onError: (err: any) => {
      alert('Rollback failed: ' + err.message);
    }
  });

  const checkHealthMutation = useMutation({
    mutationFn: (id: string) => apiClient.triggerHealthCheck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deploymentHealth', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    }
  });

  const filteredDeployments = React.useMemo(() => {
    if (!deployments) return [];
    return deployments.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [deployments, searchQuery]);

  // Set default selection
  React.useEffect(() => {
    if (filteredDeployments.length > 0 && !selectedId && !isCreating) {
      setSelectedId(filteredDeployments[0].id);
    }
  }, [filteredDeployments, selectedId, isCreating]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-mono text-sm animate-pulse">Loading deployments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Rocket className="w-6 h-6 text-blue-500 animate-pulse" />
            Deployment Engine
          </h2>
          <p className="text-sm text-gray-400">Configure, rollout, and rollback multi-container applications on your target environments.</p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setSelectedId(null);
            setNewName('');
            setYamlContent(BOILERPLATE_SPEC);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20 md:self-end"
        >
          <Plus className="w-4 h-4" />
          Create Stack
        </button>
      </div>

      {/* Main Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Stacks Listing */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search stacks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131b2e] border border-[#1e293b] rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="bg-[#131b2e] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#1e293b] bg-[#0d1325]/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Deployment Stacks</h3>
            </div>
            
            <div className="divide-y divide-[#1e293b]/60 max-h-[60vh] overflow-y-auto">
              {filteredDeployments.length > 0 ? (
                filteredDeployments.map((d) => {
                  const isSelected = d.id === selectedId;
                  
                  let statusColor = 'text-gray-400 bg-gray-800';
                  if (d.status === 'healthy') statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  if (d.status === 'unhealthy' || d.status === 'failed') statusColor = 'text-red-400 bg-red-500/10 border-red-500/20';
                  if (d.status === 'deploying') statusColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20 animate-pulse';
                  if (d.status === 'rolled_back') statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';

                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedId(d.id);
                        setIsCreating(false);
                      }}
                      className={`w-full text-left p-4 transition-all flex items-center justify-between group ${
                        isSelected 
                          ? 'bg-blue-600/5 border-l-4 border-blue-500' 
                          : 'hover:bg-[#151d30]/50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="space-y-1 pr-2">
                        <h4 className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors">
                          {d.name}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {d.description || 'No description provided'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {d.status}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No active stacks configured.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Stack Detail Panel or Creation Form */}
        <div className="lg:col-span-8">
          
          {isCreating ? (
            /* Creation Form */
            <div className="bg-[#131b2e] border border-[#1e293b] rounded-2xl p-6 shadow-xl space-y-6">
              <div className="border-b border-[#1e293b] pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-500" />
                  Create New Stack
                </h3>
                <p className="text-xs text-gray-400">Configure a new deployment stack database entry.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Stack Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. production-http"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Deployment Specification (YAML)
                  </label>
                  <textarea
                    rows={12}
                    value={yamlContent}
                    onChange={(e) => setYamlContent(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4 text-xs font-mono text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate({ name: newName, yaml: yamlContent })}
                  disabled={createMutation.isPending || !newName || !yamlContent}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  {createMutation.isPending ? 'Creating...' : 'Save & Configure'}
                </button>
              </div>
            </div>

          ) : selectedDeployment ? (
            /* Selected Stack Detail Display */
            <div className="bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl overflow-hidden">
              
              {/* Stack Header Info */}
              <div className="p-6 border-b border-[#1e293b] bg-[#0d1325]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedDeployment.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                      selectedDeployment.status === 'healthy' 
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                        : selectedDeployment.status === 'deploying'
                        ? 'text-blue-400 bg-blue-500/10 border-blue-500/20 animate-pulse'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    }`}>
                      {selectedDeployment.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{selectedDeployment.description || 'No description configured'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => checkHealthMutation.mutate(selectedDeployment.id)}
                    disabled={checkHealthMutation.isPending}
                    className="p-2 border border-[#1e293b] bg-[#0b0f19] text-gray-400 hover:text-gray-200 rounded-xl transition-colors inline-flex items-center justify-center"
                    title="Refresh Health Status"
                  >
                    <RefreshCw className={`w-4 h-4 ${checkHealthMutation.isPending ? 'animate-spin' : ''}`} />
                  </button>
                  
                  <button
                    onClick={() => deployMutation.mutate(selectedDeployment.id)}
                    disabled={deployMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Deploy Rollout
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-[#1e293b] bg-[#0d1325]/20 px-6">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: Activity },
                  { id: 'config', label: 'Specification', icon: Save },
                  { id: 'history', label: 'Releases', icon: History },
                  { id: 'logs', label: 'Audit Log', icon: Terminal }
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                        isActive 
                          ? 'border-blue-500 text-blue-400' 
                          : 'border-transparent text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Panels */}
              <div className="p-6">
                
                {/* 1. Dashboard Info Tab */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[#0b0f19]/40 border border-[#1e293b] p-4 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Last Deployed</span>
                        <p className="text-sm font-semibold text-gray-200">
                          {selectedDeployment.deployedAt ? new Date(selectedDeployment.deployedAt).toLocaleString() : 'Never'}
                        </p>
                      </div>
                      <div className="bg-[#0b0f19]/40 border border-[#1e293b] p-4 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Deployed By</span>
                        <p className="text-sm font-semibold text-gray-200 font-mono">
                          {selectedDeployment.deployedBy || '--'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Services & Health Metrics</h4>
                      
                      <div className="border border-[#1e293b] rounded-xl overflow-hidden divide-y divide-[#1e293b] bg-[#0b0f19]/20">
                        {currentHealth && currentHealth.length > 0 ? (
                          currentHealth.map((hc) => {
                            let healthBadge = 'text-gray-400 bg-gray-800 border-gray-700/50';
                            let HealthIcon = Info;
                            if (hc.status === 'healthy') {
                              healthBadge = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                              HealthIcon = CheckCircle2;
                            }
                            if (hc.status === 'unhealthy') {
                              healthBadge = 'text-red-400 bg-red-500/10 border-red-500/20';
                              HealthIcon = XCircle;
                            }

                            return (
                              <div key={hc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <h5 className="font-semibold text-sm text-white">{hc.serviceName}</h5>
                                  {hc.errorMessage && (
                                    <p className="text-xs text-red-400 font-mono">{hc.errorMessage}</p>
                                  )}
                                  <div className="flex gap-4 text-[11px] text-gray-500">
                                    <span>Checks: {hc.checkCount}</span>
                                    <span>Failures: {hc.consecutiveFailures}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  {hc.responseTimeMs !== undefined && hc.responseTimeMs > 0 && (
                                    <span className="text-xs font-mono text-gray-400">
                                      {hc.responseTimeMs}ms response
                                    </span>
                                  )}
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${healthBadge}`}>
                                    <HealthIcon className="w-3.5 h-3.5" />
                                    {hc.status}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-gray-500 text-xs font-mono">
                            No health check reports. Trigger "Deploy Rollout" to start monitoring.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Configuration YAML Tab */}
                {activeTab === 'config' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-mono">deployment.yml configuration</span>
                      <button
                        onClick={() => saveMutation.mutate({ 
                          id: selectedDeployment.id, 
                          name: selectedDeployment.name, 
                          yaml: yamlContent 
                        })}
                        disabled={saveMutation.isPending}
                        className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>

                    <textarea
                      rows={14}
                      value={yamlContent}
                      onChange={(e) => setYamlContent(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4 text-xs font-mono text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}

                {/* 3. Versions & Rollbacks Tab */}
                {activeTab === 'history' && (
                  <div className="space-y-4">
                    <div className="border border-[#1e293b] rounded-xl overflow-hidden bg-[#0b0f19]/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#1e293b] text-gray-400 font-semibold bg-[#0d1325]/40">
                            <th className="py-3 px-4">Release</th>
                            <th className="py-3 px-4">Deployed At</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Artifact Targets</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e293b]/60">
                          {currentVersions && currentVersions.length > 0 ? (
                            currentVersions.map((v) => {
                              let isCurrent = v.status === 'active';
                              
                              let statusClass = 'text-gray-400 bg-gray-800/40 border-gray-700/30';
                              if (v.status === 'active') statusClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                              if (v.status === 'failed') statusClass = 'text-red-400 bg-red-500/10 border-red-500/20';
                              if (v.status === 'rolled_back') statusClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';

                              let resolvedMap: Record<string, string> = {};
                              try {
                                resolvedMap = JSON.parse(v.artifactVersions);
                              } catch {}

                              return (
                                <tr key={v.id} className="hover:bg-[#151d30]/20 transition-colors">
                                  <td className="py-3.5 px-4 font-mono font-semibold text-gray-200">
                                    v{v.versionNumber}
                                  </td>
                                  <td className="py-3.5 px-4 text-gray-400">
                                    {v.deployedAt ? new Date(v.deployedAt).toLocaleString() : '--'}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusClass}`}>
                                      {v.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-[10px] text-gray-500">
                                    {Object.entries(resolvedMap).map(([k, ver]) => (
                                      <div key={k}>{k}@{ver}</div>
                                    ))}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    {!isCurrent && (
                                      <button
                                        onClick={() => {
                                          if (confirm(`Are you sure you want to rollback ${selectedDeployment.name} to v${v.versionNumber}?`)) {
                                            rollbackMutation.mutate({ id: selectedDeployment.id, version: v.versionNumber });
                                          }
                                        }}
                                        disabled={rollbackMutation.isPending}
                                        className="inline-flex items-center gap-1 text-[11px] bg-amber-950/20 border border-amber-500/20 hover:bg-amber-500 hover:text-white px-2.5 py-1 rounded-lg text-amber-400 transition-all font-semibold"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Rollback
                                      </button>
                                    )}
                                    {isCurrent && (
                                      <span className="text-gray-500 text-[10px] uppercase font-bold pr-2">Current Active</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-gray-500">
                                No release history.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. Audit Log Events Tab */}
                {activeTab === 'logs' && (
                  <div className="space-y-4">
                    <div className="border border-[#1e293b] rounded-xl overflow-hidden bg-[#0b0f19]/20 max-h-[50vh] overflow-y-auto">
                      <div className="divide-y divide-[#1e293b]/60">
                        {sortedEvents && sortedEvents.length > 0 ? (
                          sortedEvents.map((evt) => {
                            let icon = Clock;
                            let color = 'text-blue-500 bg-blue-500/10';
                            if (evt.eventType === 'succeeded') {
                              icon = CheckCircle2;
                              color = 'text-emerald-500 bg-emerald-500/10';
                            }
                            if (evt.eventType === 'failed') {
                              icon = XCircle;
                              color = 'text-red-500 bg-red-500/10';
                            }
                            if (evt.eventType === 'rolled_back') {
                              icon = RotateCcw;
                              color = 'text-amber-500 bg-amber-500/10';
                            }
                            const LogIcon = icon;

                            return (
                              <div key={evt.id} className="p-4 flex gap-3 items-start">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                                  <LogIcon className="w-4 h-4" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-300 font-mono">
                                      {evt.eventType}
                                    </span>
                                    <span className="text-gray-600 text-[10px]">•</span>
                                    <span className="text-[10px] text-gray-400 font-mono bg-[#1b253b] px-2 py-0.5 rounded border border-[#2e3b56]/40">
                                      {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : ''}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-300">{evt.message}</p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-gray-500 text-sm">
                            No logs recorded.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="bg-[#131b2e] border border-[#1e293b] rounded-2xl p-12 text-center text-gray-500 text-sm shadow-xl flex flex-col items-center justify-center gap-3">
              <Rocket className="w-12 h-12 text-gray-600 animate-pulse" />
              <p>Select a deployment stack from the sidebar or create a new one to begin.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
