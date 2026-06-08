'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  RefreshCw, 
  XOctagon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play,
  Calendar,
  Layers,
  Terminal,
  AlertTriangle,
  GitBranch
} from 'lucide-react';

export default function CascadeDetailsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const chainId = params.id as string;

  // Fetch chain details
  const { data: chain, isLoading, error } = useQuery({
    queryKey: ['cascadeChain', chainId],
    queryFn: () => apiClient.getCascadeChain(chainId),
    refetchInterval: (query) => {
      // Poll only if status is running
      const data = query.state.data;
      return data?.status === 'running' ? 2000 : false;
    }
  });

  // Cancel chain mutation
  const cancelMutation = useMutation({
    mutationFn: () => apiClient.cancelCascade(chainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cascadeChain', chainId] });
      queryClient.invalidateQueries({ queryKey: ['cascadeChains'] });
    }
  });

  // Fetch all builds to validate build links
  const { data: builds } = useQuery({
    queryKey: ['builds'],
    queryFn: apiClient.getBuilds,
  });

  const existingBuildIds = React.useMemo(() => {
    return new Set((builds || []).map((b: any) => b.id));
  }, [builds]);

  const renderBuildLink = (buildId: string) => {
    if (!buildId) return <span className="text-gray-500 font-mono text-xs">—</span>;
    
    const displayId = `${buildId.substring(0, 8)}...`;
    
    if (!builds) {
      return (
        <span className="text-gray-400 font-mono text-xs" title={buildId}>
          {displayId}
        </span>
      );
    }

    const isValid = existingBuildIds.has(buildId);
    if (isValid) {
      return (
        <Link 
          href={`/builds/${buildId}`}
          className="text-blue-500 hover:text-blue-400 hover:underline font-mono font-semibold text-xs"
          title={buildId}
        >
          {displayId}
        </Link>
      );
    } else {
      return (
        <span 
          className="text-gray-500 font-mono text-xs" 
          title={`${buildId} (Manual or untracked build)`}
        >
          {displayId} <span className="text-[10px] text-gray-500 font-sans italic font-normal">(manual)</span>
        </span>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-mono text-sm animate-pulse">Loading rebuild timeline...</p>
      </div>
    );
  }

  if (error || !chain) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-2xl max-w-2xl mx-auto mt-12 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-red-400">Failed to load rebuild chain</h2>
        <p className="text-sm text-red-300/80">The requested cascade rebuild run `{chainId}` does not exist.</p>
        <Link 
          href="/cascade" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Cascade Rebuilds
        </Link>
      </div>
    );
  }

  let statusBg = 'bg-zinc-800 text-zinc-400 border-zinc-700/50';
  let statusIcon = Clock;
  if (chain.status === 'completed') {
    statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    statusIcon = CheckCircle2;
  }
  if (chain.status === 'completed_with_errors') {
    statusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    statusIcon = AlertTriangle;
  }
  if (chain.status === 'running') {
    statusBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse';
    statusIcon = Play;
  }
  if (chain.status === 'cancelled') {
    statusBg = 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30';
    statusIcon = XOctagon;
  }

  const StatusIcon = statusIcon;
  const tasks = chain.tasks || [];

  return (
    <div className="space-y-6">
      {/* Back & Cancel */}
      <div className="flex items-center justify-between">
        <Link 
          href="/cascade"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cascade Rebuilds
        </Link>

        {chain.status === 'running' && (
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/20 hover:bg-red-600 border border-red-500/20 hover:border-transparent text-red-400 hover:text-white rounded-xl text-xs font-semibold transition-all shadow"
          >
            <XOctagon className="w-4 h-4" />
            Cancel Cascade Session
          </button>
        )}
      </div>

      {/* Grid: Header Properties card & Tasks Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Properties Sidebar */}
        <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-6 self-start">
          <div className="space-y-2 border-b border-[#1e293b] pb-4">
            <span className="text-[10px] text-gray-500 font-mono block">CASCADE SESSION</span>
            <h3 className="text-base font-bold text-white font-mono">{chain.chainId || chain.id}</h3>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBg} mt-2`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {chain.status}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">Trigger Type</span>
              {chain.trigger_type || chain.triggerType ? (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase mt-1 ${
                  (chain.trigger_type || chain.triggerType) === 'New version publication'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                }`}>
                  {chain.trigger_type || chain.triggerType}
                </span>
              ) : (
                <span className="text-gray-500 block mt-1">—</span>
              )}
            </div>

            {/* Trigger Artifact */}
            <div>
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">Trigger Artifact</span>
              {chain.root_artifact_name || chain.rootArtifactName ? (
                <Link 
                  href={`/artifacts/${chain.root_artifact_name || chain.rootArtifactName}/${chain.root_artifact_version || chain.rootArtifactVersion}`}
                  className="font-semibold text-blue-500 hover:text-blue-400 hover:underline block mt-1 font-mono"
                >
                  {chain.root_artifact_name || chain.rootArtifactName}@{chain.root_artifact_version || chain.rootArtifactVersion}
                </Link>
              ) : (
                <span className="text-gray-500 block mt-1">—</span>
              )}
            </div>

            {/* Triggering Build */}
            <div>
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">Triggering Build</span>
              {(() => {
                const bId = chain.build_id || chain.buildId;
                if (!bId) {
                  return <span className="text-gray-500 italic block mt-1">Manual upload (no build pipeline available)</span>;
                }
                if (!builds) {
                  return <span className="text-gray-400 font-mono block mt-1">{bId}</span>;
                }
                if (existingBuildIds.has(bId)) {
                  return (
                    <Link 
                      href={`/builds/${bId}`}
                      className="text-blue-500 hover:text-blue-400 hover:underline font-mono font-semibold block mt-1 truncate"
                      title={bId}
                    >
                      {bId}
                    </Link>
                  );
                } else {
                  return <span className="text-gray-500 italic block mt-1" title={bId}>Manual upload (no build pipeline available)</span>;
                }
              })()}
            </div>

            <div>
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">Root Trigger Cause</span>
              <p className="font-medium text-white block leading-relaxed bg-black/30 p-2.5 rounded-lg border border-[#1e293b] mt-1">
                {chain.root_cause || chain.rootCause}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">Traversal Depth Limit</span>
              <span className="font-medium text-white block">{chain.depth} levels deep</span>
            </div>

            <div>
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">Tasks Scheduled</span>
              <span className="font-semibold text-blue-400 font-mono text-sm block mt-0.5">
                {chain.task_count || chain.taskCount || tasks.length} tasks
              </span>
            </div>

            <div>
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">Started At</span>
              <span className="font-medium text-white block">
                {chain.started_at || chain.startedAt ? new Date(chain.started_at || chain.startedAt || '').toLocaleString() : '--'}
              </span>
            </div>

            {(chain.completed_at || chain.completedAt) && (
              <div>
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Finished At</span>
                <span className="font-medium text-white block">
                  {new Date(chain.completed_at || chain.completedAt || '').toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Trigger Source & Tasks timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Trigger Source Card */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-500 animate-pulse" />
              Trigger Source Event
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Origin Artifact</span>
                {chain.root_artifact_name || chain.rootArtifactName ? (
                  <Link 
                    href={`/artifacts/${chain.root_artifact_name || chain.rootArtifactName}/${chain.root_artifact_version || chain.rootArtifactVersion}`}
                    className="font-bold text-blue-500 hover:text-blue-400 hover:underline block text-sm font-mono mt-0.5"
                  >
                    {chain.root_artifact_name || chain.rootArtifactName}@{chain.root_artifact_version || chain.rootArtifactVersion}
                  </Link>
                ) : (
                  <span className="text-gray-400 block mt-0.5">—</span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Triggering Build ID</span>
                <div className="mt-0.5 block truncate">
                  {(() => {
                    const bId = chain.build_id || chain.buildId;
                    if (!bId) {
                      return <span className="text-gray-500 italic block">Manual upload (no build pipeline available)</span>;
                    }
                    if (!builds) {
                      return <span className="text-gray-400 font-mono block">{bId}</span>;
                    }
                    if (existingBuildIds.has(bId)) {
                      return (
                        <Link 
                          href={`/builds/${bId}`}
                          className="text-blue-500 hover:text-blue-400 hover:underline font-mono font-semibold block truncate"
                          title={bId}
                        >
                          {bId}
                        </Link>
                      );
                    } else {
                      return <span className="text-gray-500 italic block" title={bId}>Manual upload (no build pipeline available)</span>;
                    }
                  })()}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Trigger Reason</span>
                <span className="font-medium text-white block mt-0.5 truncate" title={chain.root_cause || chain.rootCause}>
                  {chain.root_cause || chain.rootCause}
                </span>
              </div>
            </div>
          </div>

          {/* Tasks Timeline Table */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Task Resolution Execution Path
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1e293b] text-gray-400 font-medium">
                    <th className="py-2.5 px-3">Dependent Artifact</th>
                    <th className="py-2.5 px-3 font-mono">Task ID</th>
                    <th className="py-2.5 px-3 font-mono">Build ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Trigger Reason</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Attempted At</th>
                    <th className="py-2.5 px-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length > 0 ? (
                    tasks.map((task: any, index: number) => {
                      let tStatusBg = 'bg-zinc-800 text-zinc-400 border-zinc-700/50';
                      let tIcon = Clock;
                      
                      if (task.status === 'completed' || task.status === 'success') {
                        tStatusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        tIcon = CheckCircle2;
                      }
                      if (task.status === 'failed' || task.status === 'error') {
                        tStatusBg = 'bg-red-500/10 text-red-400 border-red-500/20';
                        tIcon = XCircle;
                      }
                      if (task.status === 'building') {
                        tStatusBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse';
                        tIcon = Play;
                      }
                      if (task.status === 'pending') {
                        tStatusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                        tIcon = Clock;
                      }
                      if (task.status === 'skipped') {
                        tStatusBg = 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30';
                        tIcon = XOctagon;
                      }

                      const TIcon = tIcon;
                      const artName = task.artifact_name || task.artifactName || 'unknown';
                      const artVer = task.artifact_version || task.artifactVersion || '';

                      return (
                        <React.Fragment key={task.task_id || task.taskId || index}>
                          <tr className="border-b border-[#1e293b]/60 hover:bg-[#151d30]/20 transition-colors">
                            <td className="py-3.5 px-3 font-semibold text-white">
                              {artName !== 'unknown' && artVer ? (
                                <Link 
                                  href={`/artifacts/${artName}/${artVer}`}
                                  className="text-blue-500 hover:text-blue-400 hover:underline"
                                >
                                  {artName}@{artVer}
                                </Link>
                              ) : (
                                <span>{artName} {artVer && `@${artVer}`}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 font-mono text-gray-400 text-xs" title={task.task_id || task.taskId}>
                              {(task.task_id || task.taskId || '').substring(0, 8)}...
                            </td>
                            <td className="py-3.5 px-3">
                              {renderBuildLink(task.build_id || task.buildId)}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${tStatusBg}`}>
                                <TIcon className="w-3 h-3" />
                                {task.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-gray-300 max-w-[150px] truncate" title={task.reason}>
                              {task.reason}
                            </td>
                            <td className="py-3.5 px-3 font-mono text-gray-400 font-semibold">
                              P{task.priority}
                            </td>
                            <td className="py-3.5 px-3 text-gray-400 font-mono text-[11px]">
                              {task.attempted_at || task.attemptedAt ? new Date(task.attempted_at || task.attemptedAt || '').toLocaleTimeString() : '--'}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              {(task.build_id || task.buildId) && (
                                <Link 
                                  href={`/builds/${task.build_id || task.buildId}`}
                                  className="p-1.5 bg-[#1e293b] hover:bg-blue-600 rounded-lg text-gray-400 hover:text-white transition-all inline-flex items-center justify-center"
                                  title="View Pipeline Run"
                                >
                                  <Terminal className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </td>
                          </tr>
                          
                          {/* Task Error Message Row */}
                          {(task.error_message || task.errorMessage) && (
                            <tr className="bg-red-950/5 border-b border-[#1e293b]/60">
                              <td colSpan={8} className="py-2.5 px-3 text-red-400 font-mono text-[11px] leading-relaxed">
                                <span className="font-bold uppercase tracking-wider block mb-0.5">Task Failure:</span>
                                {task.error_message || task.errorMessage}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 font-mono text-xs">
                        No tasks resolved for this cascade run.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
