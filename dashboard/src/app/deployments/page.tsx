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

function parseYamlServices(yamlStr: string): Record<string, { artifact: string; type: string; depends_on?: string[] }> {
  const services: Record<string, any> = {};
  const lines = yamlStr.split('\n');
  let inServices = false;
  let currentService: string | null = null;
  
  for (const line of lines) {
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    if (trimmed.startsWith('services:')) {
      inServices = true;
      currentService = null;
      continue;
    }
    
    if (inServices) {
      if (indent === 0 && !trimmed.startsWith('services:')) {
        inServices = false;
        currentService = null;
        continue;
      }
      
      if (indent === 2 && trimmed.endsWith(':')) {
        currentService = trimmed.substring(0, trimmed.length - 1).trim();
        services[currentService] = { depends_on: [] };
        continue;
      }
      
      if (currentService && indent >= 4) {
        if (trimmed.startsWith('artifact:')) {
          services[currentService].artifact = trimmed.substring('artifact:'.length).replace(/['"]/g, '').trim();
        } else if (trimmed.startsWith('type:')) {
          services[currentService].type = trimmed.substring('type:'.length).replace(/['"]/g, '').trim();
        } else if (trimmed.startsWith('depends_on:')) {
          services[currentService].rawDepends = true;
        } else if (services[currentService].rawDepends && trimmed.startsWith('-')) {
          const dep = trimmed.substring(1).trim().replace(/['"]/g, '');
          services[currentService].depends_on.push(dep);
        } else if (indent === 4 && !trimmed.startsWith('-')) {
          services[currentService].rawDepends = false;
        }
      }
    }
  }
  return services;
}

function ServiceMetricsCard({ deploymentId, serviceName, serviceType, isSelected, onClick, healthInfo }: {
  deploymentId: string;
  serviceName: string;
  serviceType: string;
  isSelected: boolean;
  onClick: () => void;
  healthInfo: ServiceHealthCheck | null;
}) {
  const { data: stats } = useQuery({
    queryKey: ['containerStats', deploymentId, serviceName],
    queryFn: () => apiClient.getContainerStats(deploymentId, serviceName),
    refetchInterval: 5000,
  });

  const isOnline = stats?.online || false;

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
        isSelected 
          ? 'bg-blue-950/20 border-blue-500 shadow-lg shadow-blue-500/10' 
          : 'bg-[#0d1325]/40 border-[#1e293b] hover:border-[#2e3b56]'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h5 className="font-semibold text-sm text-white group-hover:text-blue-400 transition-colors">{serviceName}</h5>
          <span className="text-[10px] text-gray-500 font-mono uppercase">{serviceType}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {healthInfo && (
            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase border ${
              healthInfo.status === 'healthy' 
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                : healthInfo.status === 'unhealthy'
                ? 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse'
                : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
            }`}>
              {healthInfo.status}
            </span>
          )}
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between text-gray-400 text-[10px]">
            <span>CPU USAGE</span>
            <span className="font-mono font-bold text-gray-200">{stats?.cpu || '0.0%'}</span>
          </div>
          <div className="w-full bg-[#131b2e] rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: isOnline ? Math.min(100, parseFloat(stats?.cpu || '0') * 2) + '%' : '0%' }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-gray-400 text-[10px]">
            <span>MEMORY</span>
            <span className="font-mono font-bold text-gray-200">{stats?.memoryPercent || '0.0%'}</span>
          </div>
          <div className="w-full bg-[#131b2e] rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: isOnline ? (stats?.memoryPercent || '0%') : '0%' }}
            />
          </div>
        </div>

        <div className="flex justify-between text-gray-500 text-[9px] font-mono pt-1">
          <span>NET I/O</span>
          <span>{stats?.network || '--'}</span>
        </div>

        {healthInfo && (
          <div className="flex justify-between text-gray-500 text-[9px] font-mono pt-1 border-t border-[#1e293b]/40">
            <span>HEALTH PROBES</span>
            <span>{healthInfo.checkCount} chks {healthInfo.responseTimeMs ? `(${healthInfo.responseTimeMs}ms)` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceLogsTerminal({ deploymentId, serviceName }: { deploymentId: string; serviceName: string }) {
  const [isPaused, setIsPaused] = React.useState(false);
  const [clearedLogs, setClearedLogs] = React.useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['containerLogs', deploymentId, serviceName],
    queryFn: () => apiClient.getContainerLogs(deploymentId, serviceName),
    refetchInterval: isPaused ? false : 3000,
    enabled: !!serviceName,
  });

  const displayLogs = React.useMemo(() => {
    if (clearedLogs !== null) {
      if (!data?.logs) return '';
      const idx = data.logs.indexOf(clearedLogs);
      if (idx !== -1) {
        return data.logs.substring(idx + clearedLogs.length);
      }
    }
    return data?.logs || 'Loading logs...';
  }, [data, clearedLogs]);

  return (
    <div className="border border-[#1e293b] rounded-xl overflow-hidden bg-[#070b14] shadow-2xl flex flex-col h-[40vh]">
      <div className="px-4 py-2 border-b border-[#1e293b] bg-[#0c1220] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-xs font-mono font-bold text-gray-300">CONTAINER LOGS: {serviceName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              isPaused 
                ? 'bg-amber-600/10 border-amber-500/30 text-amber-400' 
                : 'bg-[#131b2e] border-[#1e293b] text-gray-400 hover:text-gray-200'
            }`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button 
            onClick={() => setClearedLogs(data?.logs || '')}
            className="px-3 py-1 bg-[#131b2e] border border-[#1e293b] hover:border-red-500/30 hover:text-red-400 text-gray-400 rounded-lg text-xs font-semibold transition-all"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="p-4 flex-1 font-mono text-xs text-gray-300 overflow-auto whitespace-pre select-text">
        {displayLogs || '[No log statements recorded for this container]'}
      </div>
    </div>
  );
}

function TopologyMap({ yamlStr, activeServiceName, onSelectService }: {
  yamlStr: string;
  activeServiceName: string | null;
  onSelectService: (name: string) => void;
}) {
  const services = React.useMemo(() => {
    try {
      return parseYamlServices(yamlStr);
    } catch (e) {
      return {};
    }
  }, [yamlStr]);

  const serviceNames = Object.keys(services);

  if (serviceNames.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm font-mono border border-dashed border-[#1e293b] rounded-xl">
        Failed to parse services topology.
      </div>
    );
  }

  return (
    <div className="bg-[#0c1220]/60 border border-[#1e293b] p-6 rounded-2xl flex flex-col gap-6 relative min-h-[200px]">
      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
        <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
        Stack Topology Map
      </h4>
      <div className="flex flex-wrap items-center justify-center gap-8 py-4 relative">
        {serviceNames.map((name) => {
          const svc = services[name];
          const isSelected = name === activeServiceName;

          return (
            <div key={name} className="relative flex flex-col items-center">
              <button
                onClick={() => onSelectService(name)}
                className={`px-5 py-3 rounded-xl border flex flex-col items-center gap-1 min-w-[140px] text-center transition-all ${
                  isSelected 
                    ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/20 text-white' 
                    : 'bg-[#131b2e] border-[#1e293b] hover:border-gray-700 text-gray-300'
                }`}
              >
                <span className="font-semibold text-xs">{name}</span>
                <span className="text-[9px] text-gray-500 font-mono uppercase">{svc.type}</span>
              </button>

              {svc.depends_on && svc.depends_on.length > 0 && (
                <div className="text-[9px] text-gray-500 font-mono mt-1 max-w-[150px] text-center">
                  depends on: {svc.depends_on.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RolloutStepper({ deploymentStatus, events }: { deploymentStatus: string; events: any[] }) {
  const [isOpen, setIsOpen] = React.useState(deploymentStatus === 'deploying');

  React.useEffect(() => {
    if (deploymentStatus === 'deploying') {
      setIsOpen(true);
    }
  }, [deploymentStatus]);

  const steps = [
    { id: 1, label: 'Version Resolution', desc: 'Resolving SemVer ranges and latest version aliases' },
    { id: 2, label: 'Compose Workspace Generation', desc: 'Writing docker-compose.yml configuration to disk' },
    { id: 3, label: 'Container Stack Rollout', desc: 'Running docker-compose up sibling rollout commands' },
    { id: 4, label: 'Active Health Probes', desc: 'Evaluating container execution and polling health checks' }
  ];

  const getStepStatus = (stepId: number) => {
    if (deploymentStatus === 'healthy' || deploymentStatus === 'active') return 'completed';
    if (deploymentStatus === 'failed' || deploymentStatus === 'unhealthy') return 'failed';
    
    const hasStarted = events.some(e => e.eventType === 'started');
    const hasSucceeded = events.some(e => e.eventType === 'succeeded');
    const hasFailed = events.some(e => e.eventType === 'failed');

    if (hasFailed) return 'failed';

    switch (stepId) {
      case 1:
        return 'completed';
      case 2:
        return 'completed';
      case 3:
        if (hasSucceeded) return 'completed';
        if (hasStarted) return 'active';
        return 'pending';
      case 4:
        if (hasSucceeded) return 'completed';
        if (hasStarted) return 'active';
        return 'pending';
      default:
        return 'pending';
    }
  };

  return (
    <div className="bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#1a243e] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Rocket className={`w-4.5 h-4.5 text-blue-400 ${deploymentStatus === 'deploying' ? 'animate-pulse' : ''}`} />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              {deploymentStatus === 'deploying' ? 'Stack Rollout in Progress' : 'Rollout Stepper Sequence'}
            </h3>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              Current Status: <span className={`uppercase font-bold ${
                deploymentStatus === 'healthy' || deploymentStatus === 'active'
                  ? 'text-emerald-400'
                  : deploymentStatus === 'deploying'
                  ? 'text-blue-400 animate-pulse'
                  : 'text-red-400'
              }`}>{deploymentStatus}</span>
            </p>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="p-5 border-t border-[#1e293b]/60 space-y-4 bg-[#0d1325]/20">
          <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1e293b]">
            {steps.map((s) => {
              const status = getStepStatus(s.id);
              let color = 'bg-gray-800 border-gray-700 text-gray-500';
              let DotIcon = Clock;

              if (status === 'completed') {
                color = 'bg-emerald-500/10 border-emerald-500 text-emerald-400';
                DotIcon = CheckCircle2;
              } else if (status === 'active') {
                color = 'bg-blue-500/10 border-blue-500 text-blue-400 animate-pulse';
                DotIcon = RefreshCw;
              } else if (status === 'failed') {
                color = 'bg-red-500/10 border-red-500 text-red-400';
                DotIcon = XCircle;
              }

              const StepIcon = DotIcon;

              return (
                <div key={s.id} className="flex gap-4 items-start pl-1 relative">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10 ${color}`}>
                    <StepIcon className={`w-4 h-4 ${status === 'active' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="space-y-0.5 pt-1">
                    <h4 className="font-semibold text-xs text-white">{s.label}</h4>
                    <p className="text-[11px] text-gray-400">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeploymentsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'config' | 'history' | 'logs'>('dashboard');
  const [isCreating, setIsCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [yamlContent, setYamlContent] = React.useState(BOILERPLATE_SPEC);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedService, setSelectedService] = React.useState<string | null>(null);

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

  const parsedServices = React.useMemo(() => {
    try {
      return parseYamlServices(selectedDeployment?.deploymentSpec || '');
    } catch (e) {
      return {};
    }
  }, [selectedDeployment]);

  const serviceNames = Object.keys(parsedServices);

  React.useEffect(() => {
    if (serviceNames.length > 0) {
      setSelectedService(serviceNames[0]);
    } else {
      setSelectedService(null);
    }
  }, [selectedId, serviceNames.length]);

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
                    {/* Rollout Stepper (always shown, collapsible) */}
                    <RolloutStepper 
                      deploymentStatus={selectedDeployment.status} 
                      events={currentEvents || []} 
                    />

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

                    {/* Interactive Topology map */}
                    <TopologyMap 
                      yamlStr={selectedDeployment.deploymentSpec} 
                      activeServiceName={selectedService} 
                      onSelectService={(name) => setSelectedService(name)} 
                    />

                    {/* Service Metrics Card Grid */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Services & Performance Gauges</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {serviceNames.length > 0 ? (
                          serviceNames.map((name) => {
                            const svc = parsedServices[name];
                            const health = currentHealth?.find(hc => hc.serviceName === name) || null;
                            return (
                              <ServiceMetricsCard 
                                key={name}
                                deploymentId={selectedDeployment.id} 
                                serviceName={name} 
                                serviceType={svc.type} 
                                isSelected={name === selectedService} 
                                onClick={() => setSelectedService(name)} 
                                healthInfo={health}
                              />
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-gray-500 text-xs font-mono col-span-3 border border-dashed border-[#1e293b] rounded-xl">
                            No services detected in stack spec.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Services & Health Metrics Section (Restored) */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Services & Health Metrics</h4>
                      <div className="border border-[#1e293b] rounded-xl overflow-hidden divide-y divide-[#1e293b]/60 bg-[#0b0f19]/20 shadow-xl">
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
                                    <p className="text-xs text-red-400 font-mono bg-red-950/20 border border-red-500/20 rounded p-1.5 mt-1">{hc.errorMessage}</p>
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

                    {/* Logs Console */}
                    {selectedService && (
                      <ServiceLogsTerminal 
                        deploymentId={selectedDeployment.id} 
                        serviceName={selectedService} 
                      />
                    )}
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

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-8">
                        <textarea
                          rows={16}
                          value={yamlContent}
                          onChange={(e) => setYamlContent(e.target.value)}
                          className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4 text-xs font-mono text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="lg:col-span-4 bg-[#0d1325]/40 border border-[#1e293b] p-4 rounded-xl space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Spec Schema Guide</h4>
                        <div className="space-y-3 text-xs">
                          <div>
                            <span className="font-mono font-semibold text-blue-400">version</span>
                            <p className="text-gray-400 text-[11px] mt-0.5">Schema version. Set to <code className="font-mono text-gray-200">1</code>.</p>
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-blue-400">deployment</span>
                            <p className="text-gray-400 text-[11px] mt-0.5">Contains stack metadata (<code className="font-mono text-gray-200">name</code> and <code className="font-mono text-gray-200">description</code>).</p>
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-blue-400">services</span>
                            <p className="text-gray-400 text-[11px] mt-0.5">Defines the containers to run. Each service must specify:</p>
                            <ul className="list-disc pl-4 text-gray-500 text-[10px] mt-1 space-y-1">
                              <li><code className="font-mono text-gray-300">artifact</code>: Package reference (e.g. <code className="font-mono text-gray-400">service@latest</code>).</li>
                              <li><code className="font-mono text-gray-300">type</code>: Run mode (<code className="font-mono text-gray-400">binary</code>, <code className="font-mono text-gray-400">jar</code>, <code className="font-mono text-gray-400">python-app</code>, <code className="font-mono text-gray-400">docker</code>).</li>
                              <li><code className="font-mono text-gray-300">ports</code>: Host ports mappings list.</li>
                              <li><code className="font-mono text-gray-300">healthCheck</code>: Probing intervals and commands.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
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
