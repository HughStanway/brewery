'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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
  Pause,
  Trash2,
  Sliders,
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

function parseYamlEnvironment(yamlStr: string, serviceName: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = yamlStr.split('\n');
  let inServices = false;
  let inTargetService = false;
  let inEnvironment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('services:')) {
      inServices = true;
      inTargetService = false;
      inEnvironment = false;
      continue;
    }

    if (inServices) {
      if (indent === 0 && !trimmed.startsWith('services:')) {
        inServices = false;
        inTargetService = false;
        inEnvironment = false;
        continue;
      }

      if (indent === 2 && trimmed.endsWith(':')) {
        const currentService = trimmed.substring(0, trimmed.length - 1).trim();
        if (currentService === serviceName) {
          inTargetService = true;
          inEnvironment = false;
        } else {
          inTargetService = false;
          inEnvironment = false;
        }
        continue;
      }

      if (inTargetService) {
        if (indent <= 2) {
          inTargetService = false;
          inEnvironment = false;
          continue;
        }

        if (trimmed.startsWith('environment:')) {
          inEnvironment = true;
          continue;
        }

        if (inEnvironment) {
          if (indent <= 4) {
            inEnvironment = false;
            continue;
          }

          if (trimmed.startsWith('-')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
              const k = trimmed.substring(1, eqIdx).trim().replace(/['"]/g, '');
              const v = trimmed.substring(eqIdx + 1).trim().replace(/['"]/g, '');
              env[k] = v;
            }
          } else {
            const colonIdx = trimmed.indexOf(':');
            if (colonIdx !== -1) {
              const k = trimmed.substring(0, colonIdx).trim().replace(/['"]/g, '');
              const v = trimmed.substring(colonIdx + 1).trim().replace(/['"]/g, '');
              env[k] = v;
            }
          }
        }
      }
    }
  }
  return env;
}

function updateYamlEnvironment(yamlStr: string, serviceName: string, env: Record<string, string>): string {
  const lines = yamlStr.split('\n');
  let inServices = false;
  let inTargetService = false;
  let targetServiceLineIdx = -1;
  let envStartIdx = -1;
  let envEndIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    if (trimmed.startsWith('services:')) {
      inServices = true;
      continue;
    }

    if (inServices) {
      if (indent === 0 && !trimmed.startsWith('services:')) {
        inServices = false;
        inTargetService = false;
        continue;
      }

      if (indent === 2 && trimmed.endsWith(':')) {
        const name = trimmed.substring(0, trimmed.length - 1).trim();
        if (name === serviceName) {
          inTargetService = true;
          targetServiceLineIdx = i;
        } else {
          inTargetService = false;
        }
        continue;
      }

      if (inTargetService) {
        if (indent <= 2 && trimmed) {
          inTargetService = false;
          continue;
        }

        if (trimmed.startsWith('environment:')) {
          envStartIdx = i;
          let j = i + 1;
          while (j < lines.length) {
            const nextLine = lines[j];
            const nextIndent = nextLine.search(/\S/);
            const nextTrimmed = nextLine.trim();
            if (!nextTrimmed) {
              j++;
              continue;
            }
            if (nextIndent <= 4) {
              break;
            }
            j++;
          }
          envEndIdx = j - 1;
          break;
        }
      }
    }
  }

  const envLines: string[] = [];
  const envKeys = Object.keys(env);
  if (envKeys.length > 0) {
    envLines.push('    environment:');
    for (const key of envKeys) {
      const val = env[key];
      envLines.push(`      ${key}: "${val.replace(/"/g, '\\"')}"`);
    }
  }

  if (envStartIdx !== -1) {
    lines.splice(envStartIdx, envEndIdx - envStartIdx + 1, ...envLines);
  } else if (targetServiceLineIdx !== -1) {
    lines.splice(targetServiceLineIdx + 1, 0, ...envLines);
  }

  return lines.join('\n');
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
      className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
        isSelected 
          ? 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-500/10' 
          : 'bg-[var(--card)]/40 border-[var(--card-border)] hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h5 className="font-semibold text-sm text-gray-900 group-hover:text-[var(--primary)] transition-colors">{serviceName}</h5>
          <span className="text-[10px] text-gray-500 font-mono uppercase">{serviceType}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {healthInfo && (
            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase border ${
              healthInfo.status === 'healthy' 
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                : healthInfo.status === 'unhealthy'
                ? 'text-red-600 bg-red-500/10 border-red-500/20 animate-pulse'
                : 'text-gray-500 bg-gray-500/10 border-gray-500/20'
            }`}>
              {healthInfo.status}
            </span>
          )}
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between text-gray-500 text-[10px]">
            <span>CPU USAGE</span>
            <span className="font-mono font-bold text-gray-800">{stats?.cpu || '0.0%'}</span>
          </div>
          <div className="w-full bg-gray-50 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: isOnline ? Math.min(100, parseFloat(stats?.cpu || '0') * 2) + '%' : '0%' }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-gray-500 text-[10px]">
            <span>MEMORY</span>
            <span className="font-mono font-bold text-gray-800">{stats?.memoryPercent || '0.0%'}</span>
          </div>
          <div className="w-full bg-gray-50 rounded-full h-1.5 overflow-hidden">
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
          <div className="flex justify-between text-gray-500 text-[9px] font-mono pt-1 border-t border-[var(--card-border)]/40">
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
  const [filterQuery, setFilterQuery] = React.useState('');

  const { data } = useQuery({
    queryKey: ['containerLogs', deploymentId, serviceName],
    queryFn: () => apiClient.getContainerLogs(deploymentId, serviceName),
    refetchInterval: isPaused ? false : 5000,
  });

  const displayLogs = React.useMemo(() => {
    if (clearedLogs !== null) {
      if (!data?.logs) return '';
      const idx = data.logs.indexOf(clearedLogs);
      if (idx !== -1) {
        return data.logs.substring(idx + clearedLogs.length);
      }
    }
    return data?.logs || '';
  }, [data, clearedLogs]);

  const rawLines = React.useMemo(() => {
    if (!displayLogs) return [];
    return displayLogs.split('\n');
  }, [displayLogs]);

  const filteredLines = React.useMemo(() => {
    if (!filterQuery.trim()) return rawLines;
    try {
      const regex = new RegExp(filterQuery, 'i');
      return rawLines.filter(line => regex.test(line));
    } catch (e) {
      const lowerQuery = filterQuery.toLowerCase();
      return rawLines.filter(line => line.toLowerCase().includes(lowerQuery));
    }
  }, [rawLines, filterQuery]);

  return (
    <div className="bg-white border border-[var(--card-border)] rounded-2xl flex flex-col h-[380px] overflow-hidden shadow-2xl">
      <div className="bg-[var(--background)] border-b border-[var(--card-border)] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--primary)]" />
          <span className="text-xs font-mono font-bold text-gray-700">CONTAINER LOGS: {serviceName}</span>
          {filterQuery && (
            <span className="text-[10px] bg-blue-500/10 text-[var(--primary)] border border-blue-500/25 px-2 py-0.5 rounded font-mono">
              {filteredLines.length} match{filteredLines.length === 1 ? '' : 'es'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Regex / text filter input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter logs (regex)..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="bg-[var(--card)] border border-[var(--card-border)] text-gray-900 placeholder-gray-400 rounded-full text-xs px-2.5 py-1 w-44 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
            />
            {filterQuery && (
              <button 
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-[10px] font-bold"
              >
                ×
              </button>
            )}
          </div>

          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              isPaused 
                ? 'bg-amber-600/10 border-amber-500/30 text-amber-400' 
                : 'bg-gray-50 border-[var(--card-border)] text-gray-500 hover:text-gray-800'
            }`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button 
            onClick={() => setClearedLogs(data?.logs || '')}
            className="px-3 py-1 bg-gray-50 border border-[var(--card-border)] hover:border-red-500/30 hover:text-red-600 text-gray-500 rounded-full text-xs font-semibold transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 font-mono text-xs text-gray-700 overflow-auto space-y-1 select-text bg-gray-50">
        {filteredLines.length > 0 ? (
          filteredLines.map((line, idx) => {
            const lineLower = line.toLowerCase();
            let lineClass = 'text-gray-700 pl-2';
            if (lineLower.includes('error') || lineLower.includes('fatal') || lineLower.includes('severe') || lineLower.includes('fail')) {
              lineClass = 'text-red-600 bg-red-950/10 border-l border-red-500/50 pl-2';
            } else if (lineLower.includes('warn') || lineLower.includes('warning')) {
              lineClass = 'text-amber-400 bg-amber-950/10 border-l border-amber-500/50 pl-2';
            } else if (lineLower.includes('info')) {
              lineClass = 'text-emerald-450/90 pl-2';
            } else if (lineLower.includes('debug')) {
              lineClass = 'text-slate-500 pl-2';
            }
            return (
              <div key={idx} className={`${lineClass} py-0.5 hover:bg-gray-100 transition-all rounded`}>
                <span className="text-gray-650 select-none mr-3 text-[10px] w-6 inline-block text-right">{idx + 1}</span>
                <span>{line}</span>
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-500 py-8 italic">
            {rawLines.length === 0 ? '[No log statements recorded for this container]' : '[No logs matches the filter query]'}
          </div>
        )}
      </div>
    </div>
  );
}

function TopologyMap({ yamlStr, activeServiceName, onSelectService, currentHealth, deploymentId }: {
  yamlStr: string;
  activeServiceName: string | null;
  onSelectService: (name: string) => void;
  currentHealth: ServiceHealthCheck[] | null;
  deploymentId: string;
}) {
  const services = React.useMemo(() => {
    try {
      return parseYamlServices(yamlStr);
    } catch (e) {
      return {};
    }
  }, [yamlStr]);

  const serviceNames = Object.keys(services);

  const levels = React.useMemo(() => {
    const lvls: Record<string, number> = {};
    for (const name of serviceNames) {
      lvls[name] = 0;
    }
    
    // Resolve levels using topological ordering algorithm
    for (let iter = 0; iter < serviceNames.length; iter++) {
      let changed = false;
      for (const name of serviceNames) {
        const svc = services[name];
        if (svc.depends_on) {
          for (const dep of svc.depends_on) {
            if (services[dep]) {
              const newLevel = lvls[dep] + 1;
              if (newLevel > lvls[name]) {
                lvls[name] = newLevel;
                changed = true;
              }
            }
          }
        }
      }
      if (!changed) break;
    }
    return lvls;
  }, [services, serviceNames]);

  const maxLevel = React.useMemo(() => {
    const vals = Object.values(levels);
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [levels]);

  const nodesByLevel = React.useMemo(() => {
    const groups: Record<number, string[]> = {};
    for (const name of serviceNames) {
      const lvl = levels[name];
      if (!groups[lvl]) {
        groups[lvl] = [];
      }
      groups[lvl].push(name);
    }
    return groups;
  }, [levels, serviceNames]);

  const coords = React.useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    const width = 800;
    const height = 300;
    const marginX = 100;
    const marginY = 60;
    
    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const names = nodesByLevel[lvl] || [];
      const n = names.length;
      const x = maxLevel === 0 ? width / 2 : marginX + (lvl * (width - 2 * marginX)) / maxLevel;
      
      names.forEach((name, idx) => {
        const y = n === 1 ? height / 2 : marginY + (idx * (height - 2 * marginY)) / (n - 1);
        pos[name] = { x, y };
      });
    }
    return pos;
  }, [levels, maxLevel, nodesByLevel]);

  const edges = React.useMemo(() => {
    const list: Array<{ from: string; to: string; active: boolean }> = [];
    for (const name of serviceNames) {
      const svc = services[name];
      if (svc.depends_on) {
        for (const dep of svc.depends_on) {
          if (services[dep]) {
            const isActive = activeServiceName === null || activeServiceName === name || activeServiceName === dep;
            list.push({ from: name, to: dep, active: isActive });
          }
        }
      }
    }
    return list;
  }, [services, serviceNames, activeServiceName]);

  if (serviceNames.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm font-mono border border-dashed border-[var(--card-border)] rounded-2xl">
        Failed to parse services topology.
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--card-border)] p-6 rounded-2xl flex flex-col gap-6 relative min-h-[360px] overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flow {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .animate-flow {
          animation: flow 1.2s linear infinite;
        }
      `}} />

      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-[var(--primary)] animate-pulse" />
          Interactive Service Topology Map
        </h4>
        <span className="text-[10px] text-gray-500 font-mono">
          Click nodes to filter logs and stats
        </span>
      </div>

      <div className="relative w-full h-[300px] bg-gray-50/40 rounded-2xl border border-[var(--card-border)]/50 overflow-hidden">
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none" 
          viewBox="0 0 800 300" 
          preserveAspectRatio="none"
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#1e293b" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#3b82f6" />
            </marker>
          </defs>

          {edges.map((edge, idx) => {
            const x1 = coords[edge.from]?.x || 0;
            const y1 = coords[edge.from]?.y || 0;
            const x2 = coords[edge.to]?.x || 0;
            const y2 = coords[edge.to]?.y || 0;
            
            let sx = x1;
            let sy = y1;
            let ex = x2;
            let ey = y2;
            
            const CARD_HALF_WIDTH = 70;
            
            if (x2 < x1) {
              sx = x1 - CARD_HALF_WIDTH;
              ex = x2 + CARD_HALF_WIDTH + 6;
            } else if (x2 > x1) {
              sx = x1 + CARD_HALF_WIDTH;
              ex = x2 - CARD_HALF_WIDTH - 6;
            }

            const cx1 = sx + (ex - sx) * 0.5;
            const cy1 = sy;
            const cx2 = sx + (ex - sx) * 0.5;
            const cy2 = ey;
            const d = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`;

            return (
              <React.Fragment key={idx}>
                <path
                  d={d}
                  fill="none"
                  stroke={edge.active ? '#1d4ed8' : '#0f172a'}
                  strokeWidth={edge.active ? 3.5 : 2}
                  strokeOpacity={edge.active ? 0.3 : 0.2}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={edge.active ? '#3b82f6' : '#1e293b'}
                  strokeWidth={edge.active ? 1.5 : 1}
                  strokeOpacity={edge.active ? 0.8 : 0.3}
                  markerEnd={edge.active ? 'url(#arrow-active)' : 'url(#arrow)'}
                />
                {edge.active && (
                  <path
                    d={d}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    strokeDasharray="6 18"
                    strokeOpacity={0.8}
                    className="animate-flow"
                  />
                )}
              </React.Fragment>
            );
          })}
        </svg>

        {serviceNames.map((name) => {
          const svc = services[name];
          const isSelected = name === activeServiceName;
          const pos = coords[name] || { x: 400, y: 150 };
          const health = currentHealth?.find(hc => hc.serviceName === name) || null;

          return (
            <div 
              key={name}
              style={{
                position: 'absolute',
                left: `${(pos.x / 800) * 100}%`,
                top: `${(pos.y / 300) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <TopologyNode 
                name={name}
                type={svc.type}
                isSelected={isSelected}
                onClick={() => onSelectService(name)}
                health={health}
                deploymentId={deploymentId}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopologyNode({ 
  name, 
  type,
  isSelected, 
  onClick, 
  health,
  deploymentId
}: {
  name: string;
  type: string;
  isSelected: boolean;
  onClick: () => void;
  health: ServiceHealthCheck | null;
  deploymentId: string;
}) {
  const { data: stats } = useQuery({
    queryKey: ['containerStats', deploymentId, name],
    queryFn: () => apiClient.getContainerStats(deploymentId, name),
    refetchInterval: 5000,
  });
  
  const isOnline = stats?.online || false;
  
  let haloClass = '';
  let statusText = 'unknown';
  let badgeClass = 'text-gray-500 bg-gray-500/10 border-gray-500/20';
  
  if (health) {
    if (health.status === 'healthy') {
      statusText = 'healthy';
      badgeClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      haloClass = 'shadow-[0_0_12px_rgba(16,185,129,0.2)] border-emerald-500/30';
    } else if (health.status === 'unhealthy') {
      statusText = 'unhealthy';
      badgeClass = 'text-red-600 bg-red-500/10 border-red-500/20 animate-pulse';
      haloClass = 'shadow-[0_0_15px_rgba(239,68,68,0.3)] border-red-500/40';
    } else {
      statusText = health.status;
      badgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      haloClass = 'shadow-[0_0_12px_rgba(245,158,11,0.2)] border-amber-500/30';
    }
  } else if (isOnline) {
    statusText = 'running';
    badgeClass = 'text-[var(--primary)] bg-blue-500/10 border-blue-500/20';
    haloClass = 'shadow-[0_0_12px_rgba(59,130,246,0.2)] border-blue-500/30';
  } else {
    statusText = 'offline';
    badgeClass = 'text-gray-500 bg-gray-650/10 border-gray-650/20';
    haloClass = 'border-slate-800/40 opacity-75';
  }

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-2xl border flex flex-col items-center gap-0.5 min-w-[130px] max-w-[140px] text-center backdrop-blur-md transition-all ${
        isSelected 
          ? 'bg-blue-50 border-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.3)] text-gray-900 scale-105 z-10' 
          : `bg-[var(--card)]/80 hover:bg-gray-50 hover:border-blue-200 text-slate-600 ${haloClass}`
      }`}
    >
      <span className="font-semibold text-xs truncate max-w-full tracking-wide">{name}</span>
      <span className="text-[8px] text-gray-500 font-mono uppercase tracking-wider">{type}</span>
      <span className={`text-[7px] font-extrabold uppercase tracking-widest mt-1.5 px-1.5 py-0.5 rounded border ${badgeClass}`}>
        {statusText}
      </span>
    </button>
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
    <div className="bg-gray-50 border border-[var(--card-border)] rounded-2xl shadow-xl overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Rocket className={`w-4.5 h-4.5 text-[var(--primary)] ${deploymentStatus === 'deploying' ? 'animate-pulse' : ''}`} />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
              {deploymentStatus === 'deploying' ? 'Stack Rollout in Progress' : 'Rollout Stepper Sequence'}
            </h3>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              Current Status: <span className={`uppercase font-bold ${
                deploymentStatus === 'healthy' || deploymentStatus === 'active'
                  ? 'text-emerald-400'
                  : deploymentStatus === 'deploying'
                  ? 'text-[var(--primary)] animate-pulse'
                  : 'text-red-600'
              }`}>{deploymentStatus}</span>
            </p>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-500 transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="p-5 border-t border-[var(--card-border)]/60 space-y-4 bg-[var(--card)]/20">
          <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-white">
            {steps.map((s) => {
              const status = getStepStatus(s.id);
              let color = 'bg-gray-100 border-gray-200 text-gray-500';
              let DotIcon = Clock;

              if (status === 'completed') {
                color = 'bg-emerald-500/10 border-emerald-500 text-emerald-400';
                DotIcon = CheckCircle2;
              } else if (status === 'active') {
                color = 'bg-blue-500/10 border-[var(--primary)] text-[var(--primary)] animate-pulse';
                DotIcon = RefreshCw;
              } else if (status === 'failed') {
                color = 'bg-red-500/10 border-red-500 text-red-600';
                DotIcon = XCircle;
              }

              const StepIcon = DotIcon;

              return (
                <div key={s.id} className="flex gap-4 items-start pl-1 relative">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10 ${color}`}>
                    <StepIcon className={`w-4 h-4 ${status === 'active' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="space-y-0.5 pt-1">
                    <h4 className="font-semibold text-xs text-gray-900">{s.label}</h4>
                    <p className="text-[11px] text-gray-500">{s.desc}</p>
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

export default function DeploymentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'config' | 'history' | 'logs' | 'environment'>('dashboard');
  
  const [newName, setNewName] = React.useState('');
  const [yamlContent, setYamlContent] = React.useState(BOILERPLATE_SPEC);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedService, setSelectedService] = React.useState<string | null>(null);
  const [editingEnv, setEditingEnv] = React.useState<Record<string, string>>({});
  const [newEnvKey, setNewEnvKey] = React.useState('');
  const [newEnvVal, setNewEnvVal] = React.useState('');

  // Queries
  const { data: deployments, isLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: apiClient.getDeployments,
    refetchInterval: 5000,
  });

  const { data: currentVersions } = useQuery({
    queryKey: ['deploymentVersions', id],
    queryFn: () => id ? apiClient.getDeploymentVersions(id) : Promise.resolve([]),
    enabled: !!id,
    refetchInterval: activeTab === 'history' ? 5000 : false,
  });

  const { data: currentEvents } = useQuery({
    queryKey: ['deploymentEvents', id],
    queryFn: () => id ? apiClient.getDeploymentEvents(id) : Promise.resolve([]),
    enabled: !!id,
    refetchInterval: activeTab === 'logs' ? 5000 : false,
  });

  const { data: currentHealth } = useQuery({
    queryKey: ['deploymentHealth', id],
    queryFn: () => id ? apiClient.getServiceHealthChecks(id) : Promise.resolve([]),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const selectedDeployment = React.useMemo(() => {
    return deployments?.find(d => d.id === id) || null;
  }, [deployments, id]);

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
  }, [id, serviceNames.length]);

  // Sync edited yaml when switching selected deployment
  React.useEffect(() => {
    if (selectedDeployment) {
      setYamlContent(selectedDeployment.deploymentSpec);
    }
  }, [id, selectedDeployment]);

  // Load environment variables for the active service
  React.useEffect(() => {
    if (selectedDeployment && selectedService) {
      try {
        const parsedEnv = parseYamlEnvironment(yamlContent, selectedService);
        setEditingEnv(parsedEnv);
      } catch (e) {
        setEditingEnv({});
      }
      setNewEnvKey('');
      setNewEnvVal('');
    }
  }, [selectedService, yamlContent, activeTab, selectedDeployment]);

  const handleEnvValueChange = (key: string, value: string) => {
    setEditingEnv(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleEnvDelete = (key: string) => {
    setEditingEnv(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleEnvAdd = () => {
    if (!newEnvKey.trim()) return;
    setEditingEnv(prev => ({
      ...prev,
      [newEnvKey.trim()]: newEnvVal
    }));
    setNewEnvKey('');
    setNewEnvVal('');
  };

  const handleEnvSave = () => {
    if (!selectedDeployment || !selectedService) return;
    
    try {
      const updatedYaml = updateYamlEnvironment(yamlContent, selectedService, editingEnv);
      setYamlContent(updatedYaml);
      
      saveMutation.mutate({
        id: selectedDeployment.id,
        name: selectedDeployment.name,
        yaml: updatedYaml
      }, {
        onSuccess: () => {
          deployMutation.mutate(selectedDeployment.id);
        }
      });
    } catch (err: any) {
      alert('Failed to update environment spec: ' + err.message);
    }
  };

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
      queryClient.invalidateQueries({ queryKey: ['deploymentEvents', id] });
      queryClient.invalidateQueries({ queryKey: ['deploymentVersions', id] });
      alert('Rollback triggered successfully!');
    },
    onError: (err: any) => {
      alert('Rollback failed: ' + err.message);
    }
  });

  const checkHealthMutation = useMutation({
    mutationFn: (id: string) => apiClient.triggerHealthCheck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deploymentHealth', id] });
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    }
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => apiClient.pause(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      alert('Deployment stack paused successfully.');
    },
    onError: (err: any) => {
      alert('Pause failed: ' + err.message);
    }
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => apiClient.resume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      alert('Deployment stack resumed successfully.');
    },
    onError: (err: any) => {
      alert('Resume failed: ' + err.message);
    }
  });

  const restartMutation = useMutation({
    mutationFn: (id: string) => apiClient.restart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      alert('Deployment stack restarted successfully.');
    },
    onError: (err: any) => {
      alert('Restart failed: ' + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteDeployment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      router.push('/deployments');
      alert('Deployment stack deleted successfully.');
    },
    onError: (err: any) => {
      alert('Deletion failed: ' + err.message);
    }
  });

  const filteredDeployments = React.useMemo(() => {
    if (!deployments) return [];
    return deployments.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [deployments, searchQuery]);

  // Removed broken useEffect

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
      <button onClick={() => router.push('/deployments')} className="flex items-center gap-2 text-gray-500 hover:text-[var(--primary)] transition-colors text-sm font-semibold mb-2">
        <ArrowLeft className="w-4 h-4" /> Back to Deployments
      </button>
      

      {/* Main Panel Layout */}
      {/* Right Side: Stack Detail Panel or Creation Form */}
        <div>
          {selectedDeployment ? (
            <div className="bg-gray-50 border border-[var(--card-border)] rounded-2xl shadow-xl overflow-hidden">
              
              {/* Stack Header Info */}
              <div className="p-6 border-b border-[var(--card-border)] bg-[var(--card)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{selectedDeployment.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                      selectedDeployment.status === 'healthy' 
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                        : selectedDeployment.status === 'deploying'
                        ? 'text-[var(--primary)] bg-blue-500/10 border-blue-500/20 animate-pulse'
                        : selectedDeployment.status === 'paused'
                        ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    }`}>
                      {selectedDeployment.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{selectedDeployment.description || 'No description configured'}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => checkHealthMutation.mutate(selectedDeployment.id)}
                    disabled={checkHealthMutation.isPending}
                    className="p-2 border border-[var(--card-border)] bg-[var(--background)] text-gray-500 hover:text-gray-800 rounded-2xl transition-colors inline-flex items-center justify-center"
                    title="Refresh Health Status"
                  >
                    <RefreshCw className={`w-4 h-4 ${checkHealthMutation.isPending ? 'animate-spin' : ''}`} />
                  </button>

                  {/* Pause / Resume button */}
                  {selectedDeployment.status === 'paused' ? (
                    <button
                      onClick={() => resumeMutation.mutate(selectedDeployment.id)}
                      disabled={resumeMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-500 text-gray-900 px-3.5 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                      title="Resume stack containers"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => pauseMutation.mutate(selectedDeployment.id)}
                      disabled={pauseMutation.isPending}
                      className="bg-amber-600 hover:bg-amber-500 text-gray-900 px-3.5 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                      title="Pause stack containers"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      Pause
                    </button>
                  )}

                  {/* Restart button */}
                  <button
                    onClick={() => restartMutation.mutate(selectedDeployment.id)}
                    disabled={restartMutation.isPending}
                    className="bg-white hover:bg-[#2e3b56] text-gray-800 border border-gray-300 px-3.5 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                    title="Restart all stack containers"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${restartMutation.isPending ? 'animate-spin' : ''}`} />
                    Restart
                  </button>
                  
                  <button
                    onClick={() => deployMutation.mutate(selectedDeployment.id)}
                    disabled={deployMutation.isPending}
                    className="bg-blue-600 hover:bg-[var(--primary)] text-gray-900 rounded-full px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Deploy Rollout
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => {
                      if (confirm(`ARE YOU ABSOLUTELY SURE you want to delete the stack "${selectedDeployment.name}"?\nThis will stop all running containers and delete all history and configuration.`)) {
                        deleteMutation.mutate(selectedDeployment.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="bg-red-950/40 border border-red-500/20 text-red-600 hover:bg-red-500 hover:text-[var(--primary)] p-2 rounded-2xl transition-all inline-flex items-center justify-center"
                    title="Delete Stack Entirely"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-[var(--card-border)] bg-[var(--card)]/20 px-6">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: Activity },
                  { id: 'config', label: 'Specification', icon: Save },
                  { id: 'environment', label: 'Environment', icon: Sliders },
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
                          ? 'border-[var(--primary)] text-[var(--primary)]' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
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
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Main Content Column (Left) */}
                    <div className="xl:col-span-8 space-y-6">
                      
                      {/* Top Stats Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[var(--background)]/40 border border-[var(--card-border)] p-4 rounded-2xl space-y-1 shadow-sm">
                          <span className="text-[10px] uppercase font-bold text-gray-500">Last Deployed</span>
                          <p className="text-sm font-semibold text-gray-800">
                            {selectedDeployment.deployedAt ? new Date(selectedDeployment.deployedAt).toLocaleString() : 'Never'}
                          </p>
                        </div>
                        <div className="bg-[var(--background)]/40 border border-[var(--card-border)] p-4 rounded-2xl space-y-1 shadow-sm">
                          <span className="text-[10px] uppercase font-bold text-gray-500">Deployed By</span>
                          <p className="text-sm font-semibold text-gray-800 font-mono">
                            {selectedDeployment.deployedBy || '--'}
                          </p>
                        </div>
                      </div>

                      {/* Interactive Topology map */}
                      <TopologyMap 
                        yamlStr={selectedDeployment.deploymentSpec} 
                        activeServiceName={selectedService} 
                        onSelectService={(name) => setSelectedService(name)} 
                        currentHealth={currentHealth || null}
                        deploymentId={selectedDeployment.id}
                      />

                      {/* Logs Console */}
                      {selectedService && (
                        <div className="pt-2">
                          <ServiceLogsTerminal 
                            deploymentId={selectedDeployment.id} 
                            serviceName={selectedService} 
                          />
                        </div>
                      )}
                    </div>

                    {/* Side Panel Column (Right) */}
                    <div className="xl:col-span-4 space-y-6">
                      {/* Rollout Stepper (always shown, collapsible) */}
                      <RolloutStepper 
                        deploymentStatus={selectedDeployment.status} 
                        events={currentEvents || []} 
                      />

                      {/* Service Metrics Card Grid (Vertical) */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 pl-1">Selected Service Metrics</h4>
                        <div className="flex flex-col gap-3">
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
                            <div className="p-8 text-center text-gray-500 text-xs font-mono border border-dashed border-[var(--card-border)] rounded-2xl">
                              No services detected.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Health Metrics Summary */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 pl-1">Health Probes</h4>
                        <div className="border border-[var(--card-border)] rounded-2xl overflow-hidden divide-y divide-[var(--card-border)]/60 bg-[var(--background)]/20 shadow-sm">
                          {currentHealth && currentHealth.length > 0 ? (
                            currentHealth.map((hc) => {
                              let healthBadge = 'text-gray-500 bg-gray-100 border-gray-200';
                              let HealthIcon = Info;
                              if (hc.status === 'healthy') {
                                healthBadge = 'text-emerald-500 bg-emerald-50 border-emerald-200';
                                HealthIcon = CheckCircle2;
                              } else if (hc.status === 'unhealthy') {
                                healthBadge = 'text-red-500 bg-red-50 border-red-200';
                                HealthIcon = XCircle;
                              }

                              return (
                                <div key={hc.id} className="p-3 flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h5 className="font-semibold text-xs text-gray-900 truncate">{hc.serviceName}</h5>
                                    <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
                                      <span>Chk: {hc.checkCount}</span>
                                      {hc.responseTimeMs && <span>{hc.responseTimeMs}ms</span>}
                                    </div>
                                  </div>
                                  <span className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border ${healthBadge}`}>
                                    <HealthIcon className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 text-center text-gray-500 text-xs">
                              No health reports.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Environment variables Tab */}
                {activeTab === 'environment' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-4">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Environment Configuration</h4>
                        <p className="text-xs text-gray-500">Manage environment variables for containers in this deployment stack.</p>
                      </div>
                      <button
                        onClick={handleEnvSave}
                        disabled={saveMutation.isPending || deployMutation.isPending}
                        className="bg-blue-600 hover:bg-[var(--primary)] text-gray-900 rounded-full px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                      >
                        <Save className="w-4 h-4" />
                        {saveMutation.isPending || deployMutation.isPending ? 'Applying...' : 'Apply & Redeploy'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* Service Selector List */}
                      <div className="md:col-span-4 bg-[var(--card)]/40 border border-[var(--card-border)] rounded-2xl overflow-hidden">
                        <div className="p-3 bg-[var(--card)]/80 border-b border-[var(--card-border)]">
                          <span className="text-[10px] uppercase font-bold text-gray-500 font-mono">Select Service</span>
                        </div>
                        <div className="divide-y divide-[#1e293b]/60">
                          {serviceNames.map((name) => {
                            const isSelected = name === selectedService;
                            return (
                              <button
                                key={name}
                                onClick={() => setSelectedService(name)}
                                className={`w-full text-left px-4 py-3 text-xs font-semibold transition-all ${
                                  isSelected 
                                    ? 'bg-blue-600/10 text-[var(--primary)] border-l-2 border-blue-500' 
                                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50/30'
                                }`}
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Variables Editor */}
                      <div className="md:col-span-8 space-y-4">
                        <div className="bg-[var(--background)]/30 border border-[var(--card-border)] rounded-2xl p-4 space-y-4">
                          <h5 className="text-xs font-bold text-gray-700 font-mono">Service: <span className="text-[var(--primary)]">{selectedService || '--'}</span></h5>
                          
                          {/* Variables List */}
                          <div className="space-y-3">
                            {selectedService && Object.keys(editingEnv).length > 0 ? (
                              Object.entries(editingEnv).map(([key, val]) => (
                                <div key={key} className="flex items-center gap-3 bg-[var(--background)]/50 border border-[var(--card-border)]/40 p-2.5 rounded-full">
                                  <span className="font-mono text-xs text-gray-500 font-semibold min-w-[150px] truncate" title={key}>
                                    {key}
                                  </span>
                                  <input
                                    type="text"
                                    value={val}
                                    onChange={(e) => handleEnvValueChange(key, e.target.value)}
                                    className="flex-1 bg-gray-50 border border-[var(--card-border)] rounded-full px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                                  />
                                  <button
                                    onClick={() => handleEnvDelete(key)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-500/10 rounded-full transition-all"
                                    title="Delete Variable"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="p-8 text-center text-gray-500 text-xs font-mono border border-dashed border-[var(--card-border)] rounded-2xl">
                                {selectedService 
                                  ? 'No environment variables configured for this service.'
                                  : 'Select a service from the list to view environment variables.'
                                }
                              </div>
                            )}
                          </div>

                          {/* Add Variable Form */}
                          {selectedService && (
                            <div className="border-t border-[var(--card-border)]/60 pt-4 space-y-3">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Add Environment Variable</span>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                  type="text"
                                  placeholder="VARIABLE_KEY"
                                  value={newEnvKey}
                                  onChange={(e) => setNewEnvKey(e.target.value)}
                                  className="flex-1 bg-gray-50 border border-[var(--card-border)] rounded-full px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-blue-500 transition-colors font-mono uppercase"
                                />
                                <input
                                  type="text"
                                  placeholder="variable_value"
                                  value={newEnvVal}
                                  onChange={(e) => setNewEnvVal(e.target.value)}
                                  className="flex-1 bg-gray-50 border border-[var(--card-border)] rounded-full px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                                />
                                <button
                                  onClick={handleEnvAdd}
                                  className="bg-white hover:bg-blue-600 text-gray-700 hover:text-[var(--primary)] px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1.5 font-mono">
                          <Info className="w-3.5 h-3.5 text-[var(--primary)]" />
                          Applying changes updates the YAML spec on the backend and triggers a rolling rollout.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Configuration YAML Tab */}
                {activeTab === 'config' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-mono">deployment.yml configuration</span>
                      <button
                        onClick={() => saveMutation.mutate({ 
                          id: selectedDeployment.id, 
                          name: selectedDeployment.name, 
                          yaml: yamlContent 
                        })}
                        disabled={saveMutation.isPending}
                        className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-[var(--primary)] px-3.5 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all"
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
                          className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-2xl p-4 text-xs font-mono text-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="lg:col-span-4 bg-[var(--card)]/40 border border-[var(--card-border)] p-4 rounded-2xl space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Spec Schema Guide</h4>
                        <div className="space-y-3 text-xs">
                          <div>
                            <span className="font-mono font-semibold text-[var(--primary)]">version</span>
                            <p className="text-gray-500 text-[11px] mt-0.5">Schema version. Set to <code className="font-mono text-gray-800">1</code>.</p>
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-[var(--primary)]">deployment</span>
                            <p className="text-gray-500 text-[11px] mt-0.5">Contains stack metadata (<code className="font-mono text-gray-800">name</code> and <code className="font-mono text-gray-800">description</code>).</p>
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-[var(--primary)]">services</span>
                            <p className="text-gray-500 text-[11px] mt-0.5">Defines the containers to run. Each service must specify:</p>
                            <ul className="list-disc pl-4 text-gray-500 text-[10px] mt-1 space-y-1">
                              <li><code className="font-mono text-gray-700">artifact</code>: Package reference (e.g. <code className="font-mono text-gray-500">service@latest</code>).</li>
                              <li><code className="font-mono text-gray-700">type</code>: Run mode (<code className="font-mono text-gray-500">binary</code>, <code className="font-mono text-gray-500">jar</code>, <code className="font-mono text-gray-500">python-app</code>, <code className="font-mono text-gray-500">docker</code>).</li>
                              <li><code className="font-mono text-gray-700">ports</code>: Host ports mappings list.</li>
                              <li><code className="font-mono text-gray-700">healthCheck</code>: Probing intervals and commands.</li>
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
                    <div className="border border-[var(--card-border)] rounded-2xl overflow-hidden bg-[var(--background)]/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--card-border)] text-gray-500 font-semibold bg-[var(--card)]/40">
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
                              
                              let statusClass = 'text-gray-500 bg-gray-50 border-gray-200';
                              if (v.status === 'active') statusClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                              if (v.status === 'failed') statusClass = 'text-red-600 bg-red-500/10 border-red-500/20';
                              if (v.status === 'rolled_back') statusClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';

                              let resolvedMap: Record<string, string> = {};
                              try {
                                resolvedMap = JSON.parse(v.artifactVersions);
                              } catch {}

                              return (
                                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="py-3.5 px-4 font-mono font-semibold text-gray-800">
                                    v{v.versionNumber}
                                  </td>
                                  <td className="py-3.5 px-4 text-gray-500">
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
                                        className="inline-flex items-center gap-1 text-[11px] bg-amber-950/20 border border-amber-500/20 hover:bg-amber-500 hover:text-[var(--primary)] px-2.5 py-1 rounded-full text-amber-400 transition-all font-semibold"
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
                    <div className="border border-[var(--card-border)] rounded-2xl overflow-hidden bg-[var(--background)]/20 max-h-[50vh] overflow-y-auto">
                      <div className="divide-y divide-[#1e293b]/60">
                        {sortedEvents && sortedEvents.length > 0 ? (
                          sortedEvents.map((evt) => {
                            let icon = Clock;
                            let color = 'text-[var(--primary)] bg-blue-500/10';
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
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                                  <LogIcon className="w-4 h-4" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 font-mono">
                                      {evt.eventType}
                                    </span>
                                    <span className="text-gray-600 text-[10px]">•</span>
                                    <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-300/40">
                                      {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : ''}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700">{evt.message}</p>
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
            <div className="p-12 text-center text-gray-500 text-sm flex flex-col items-center justify-center gap-3">
              <Rocket className="w-12 h-12 text-gray-400" />
              <p>Deployment stack not found.</p>
            </div>
          )}
        </div>
    </div>
  );
}
