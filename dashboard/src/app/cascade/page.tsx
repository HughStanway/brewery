'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, RebuildChain } from '@/api/client';
import Link from 'next/link';
import { 
  RefreshCw, 
  Play, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight,
  GitPullRequest,
  Search,
  Eye
} from 'lucide-react';

export default function CascadePage() {
  const queryClient = useQueryClient();
  
  // Trigger form state
  const [triggerName, setTriggerName] = React.useState('');
  const [triggerVersion, setTriggerVersion] = React.useState('');
  const [triggerReason, setTriggerReason] = React.useState('Manual upgrade verification');
  const [maxDepth, setMaxDepth] = React.useState(3);

  // Impact Dry-Run state
  const [impactName, setImpactName] = React.useState('');
  const [impactVersion, setImpactVersion] = React.useState('');
  const [impactData, setImpactData] = React.useState<any>(null);

  // Fetch chains
  const { data: chains, isLoading, error } = useQuery({
    queryKey: ['cascadeChains'],
    queryFn: apiClient.getCascadeChains,
    refetchInterval: 5000,
  });

  // Fetch all artifacts for autocomplete
  const { data: artifacts } = useQuery({
    queryKey: ['artifacts'],
    queryFn: apiClient.getArtifacts,
  });

  const uniqueArtifactNames = React.useMemo(() => {
    if (!artifacts) return [];
    const names = new Set(artifacts.map(a => a.name));
    return Array.from(names).sort();
  }, [artifacts]);

  // Trigger form versions
  const { data: triggerVersionsData } = useQuery({
    queryKey: ['artifactVersions', triggerName],
    queryFn: () => apiClient.getArtifactVersions(triggerName),
    enabled: !!triggerName && uniqueArtifactNames.includes(triggerName),
  });
  const triggerVersions = triggerVersionsData?.versions || [];

  React.useEffect(() => {
    if (triggerVersions.length > 0) {
      const latestVer = triggerVersionsData?.latest || triggerVersions[0].version;
      if (!triggerVersions.some(v => v.version === triggerVersion)) {
        setTriggerVersion(latestVer);
      }
    }
  }, [triggerVersions, triggerVersionsData, triggerVersion]);

  // Impact form versions
  const { data: impactVersionsData } = useQuery({
    queryKey: ['artifactVersions', impactName],
    queryFn: () => apiClient.getArtifactVersions(impactName),
    enabled: !!impactName && uniqueArtifactNames.includes(impactName),
  });
  const impactVersions = impactVersionsData?.versions || [];

  React.useEffect(() => {
    if (impactVersions.length > 0) {
      const latestVer = impactVersionsData?.latest || impactVersions[0].version;
      if (!impactVersions.some(v => v.version === impactVersion)) {
        setImpactVersion(latestVer);
      }
    }
  }, [impactVersions, impactVersionsData, impactVersion]);

  // Trigger cascade rebuild mutation
  const triggerMutation = useMutation({
    mutationFn: (args: { name: string, version: string, reason: string, depth: number }) => 
      apiClient.triggerCascade(args.name, args.version, args.reason, args.depth),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cascadeChains'] });
      alert(`Cascade Rebuild chain successfully initialized! Chain ID: ${data.chain_id || data.id || 'N/A'}`);
      setTriggerName('');
      setTriggerVersion('');
    },
    onError: (err) => {
      alert(`Trigger failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  // Compute impact dry-run mutation
  const impactMutation = useMutation({
    mutationFn: (args: { name: string, version: string }) => 
      apiClient.getCascadeImpact(args.name, args.version),
    onSuccess: (data) => {
      setImpactData(data);
    },
    onError: (err) => {
      alert(`Impact calculation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  const handleTriggerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (triggerName.trim() && triggerVersion.trim()) {
      triggerMutation.mutate({
        name: triggerName.trim(),
        version: triggerVersion.trim(),
        reason: triggerReason.trim(),
        depth: maxDepth
      });
    }
  };

  const handleImpactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (impactName.trim() && impactVersion.trim()) {
      impactMutation.mutate({
        name: impactName.trim(),
        version: impactVersion.trim()
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-mono text-sm animate-pulse">Scanning rebuild logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin-slow" />
          Cascade Rebuild Pipelines
        </h2>
        <p className="text-sm text-gray-400">Trigger, monitor, and audit recursive rebuild sessions propagation.</p>
      </div>

      {/* Grid: Actions Column & History List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column Forms */}
        <div className="space-y-6 lg:col-span-1">
          {/* Trigger Cascade Form */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3 flex items-center gap-2">
              <Play className="w-4.5 h-4.5 text-emerald-400" />
              Trigger Cascade
            </h3>

            <form onSubmit={handleTriggerSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Target Artifact</label>
                <input
                  type="text"
                  list="cascade-trigger-names"
                  placeholder="e.g. bcrypt"
                  value={triggerName}
                  onChange={(e) => setTriggerName(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
                <datalist id="cascade-trigger-names">
                  {uniqueArtifactNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Trigger Version</label>
                {triggerVersions && triggerVersions.length > 0 ? (
                  <select
                    value={triggerVersion}
                    onChange={(e) => setTriggerVersion(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                    required
                  >
                    {triggerVersions.map((v: any) => (
                      <option key={v.version} value={v.version}>
                        {v.version} {v.is_latest || v.isLatest ? ' (latest)' : ''} {v.deprecated_at || v.deprecatedAt ? ' (deprecated)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. 4.0.1"
                    value={triggerVersion}
                    onChange={(e) => setTriggerVersion(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    required
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Reason</label>
                <input
                  type="text"
                  value={triggerReason}
                  onChange={(e) => setTriggerReason(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Max Depth ({maxDepth})</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  className="w-full h-1 bg-[#0b0f19] rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={triggerMutation.isPending}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-500/15"
              >
                <RefreshCw className={`w-4 h-4 ${triggerMutation.isPending ? 'animate-spin' : ''}`} />
                Launch Pipeline Rebuild
              </button>
            </form>
          </div>

          {/* Dry Run Impact Preview Form */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3 flex items-center gap-2">
              <Eye className="w-4.5 h-4.5 text-violet-400" />
              Impact Preview (Dry-Run)
            </h3>

            <form onSubmit={handleImpactSubmit} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase block">Artifact Name</label>
                  <input
                    type="text"
                    list="cascade-impact-names"
                    placeholder="bcrypt"
                    value={impactName}
                    onChange={(e) => setImpactName(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <datalist id="cascade-impact-names">
                    {uniqueArtifactNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase block">Version</label>
                  {impactVersions && impactVersions.length > 0 ? (
                    <select
                      value={impactVersion}
                      onChange={(e) => setImpactVersion(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                      required
                    >
                      {impactVersions.map((v: any) => (
                        <option key={v.version} value={v.version}>
                          {v.version} {v.is_latest || v.isLatest ? ' (latest)' : ''} {v.deprecated_at || v.deprecatedAt ? ' (deprecated)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="4.0.1"
                      value={impactVersion}
                      onChange={(e) => setImpactVersion(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                      required
                    />
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={impactMutation.isPending}
                className="w-full py-2 bg-[#151d30] hover:bg-[#1e293b] border border-[#1e293b] text-blue-400 hover:text-blue-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1"
              >
                Calculate Impact Trace
              </button>
            </form>

            {/* Dry Run Results */}
            {impactData && (
              <div className="space-y-2 pt-2 text-xs border-t border-[#1e293b]/60">
                <div className="flex justify-between font-semibold text-white">
                  <span>Affected Dependents:</span>
                  <span className="text-violet-400 font-mono">
                    {impactData.total_affected ?? impactData.totalAffected ?? (impactData.affected_artifacts?.length || impactData.affectedArtifacts?.length || 0)} packages
                  </span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1.5 font-mono text-[11px] text-gray-400 pr-1">
                  {((impactData.affected_artifacts || impactData.affectedArtifacts || impactData.impactedArtifacts || []) as any[]).map((art: any, i: number) => {
                    const label = typeof art === 'string'
                      ? art
                      : (art.artifact_name || art.artifactName || 'unknown') + '@' + (art.artifact_version || art.artifactVersion || '');
                    return (
                      <div key={i} className="flex items-center gap-1 py-0.5 px-2 bg-black/35 rounded border border-[#1e293b]">
                        <GitPullRequest className="w-3 h-3 text-violet-400 shrink-0" />
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: History Grid */}
        <div className="lg:col-span-2 p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3">
            Rebuild Pipeline Audit History
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#1e293b] text-gray-400 font-medium">
                  <th className="py-3 px-4 text-xs tracking-wider uppercase">Chain ID</th>
                  <th className="py-3 px-4 text-xs tracking-wider uppercase">Status</th>
                  <th className="py-3 px-4 text-xs tracking-wider uppercase">Root Cause</th>
                  <th className="py-3 px-4 text-xs tracking-wider uppercase">Depth</th>
                  <th className="py-3 px-4 text-xs tracking-wider uppercase">Started At</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {chains && chains.length > 0 ? (
                  chains.map((chain: RebuildChain) => {
                    let statusBg = 'bg-zinc-800 text-zinc-400 border-zinc-700/50';
                    if (chain.status === 'completed') statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    if (chain.status === 'completed_with_errors') statusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    if (chain.status === 'cancelled') statusBg = 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30';
                    if (chain.status === 'running') statusBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse';

                    const chainIdVal = chain.chainId || chain.id || '';

                    return (
                      <tr 
                        key={chainIdVal} 
                        className="border-b border-[#1e293b]/60 hover:bg-[#151d30]/30 transition-colors"
                      >
                        <td className="py-4 px-4 font-mono text-xs font-semibold text-gray-300">
                          {chainIdVal.substring(0, 8)}...
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBg}`}>
                            {chain.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-white max-w-[200px] truncate" title={chain.rootCause}>
                          {chain.rootCause}
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-gray-300 font-mono">
                          d={chain.depth}
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-400 font-mono">
                          {chain.startedAt ? new Date(chain.startedAt).toLocaleString() : '--'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Link 
                            href={`/cascade/${chainIdVal}`}
                            className="p-2 bg-[#1e293b] hover:bg-blue-600 rounded-lg text-gray-400 hover:text-white transition-all inline-flex items-center justify-center"
                            title="Audit Tasks"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 font-mono text-xs">
                      No rebuild chains generated in this session.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
