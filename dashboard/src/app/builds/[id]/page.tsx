'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Terminal, 
  RotateCw, 
  XOctagon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play,
  Calendar,
  Code,
  GitBranch,
  FileCode,
  Package,
  Layers
} from 'lucide-react';

export default function BuildDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const buildId = params.id as string;

  const { data: build, isLoading, error } = useQuery({
    queryKey: ['build', buildId],
    queryFn: () => apiClient.getBuild(buildId),
    refetchInterval: (query) => {
      // Poll only if building or pending
      const data = query.state.data;
      return data?.status === 'building' || data?.status === 'pending' ? 2000 : false;
    }
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => apiClient.retryBuild(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['build', buildId] });
      queryClient.invalidateQueries({ queryKey: ['builds'] });
      // Go to new build details if it creates a new ID, else reload
      router.refresh();
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.cancelBuild(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['build', buildId] });
      queryClient.invalidateQueries({ queryKey: ['builds'] });
    }
  });

  // Fetch all artifacts to check if this build produced one
  const { data: artifacts } = useQuery({
    queryKey: ['artifacts'],
    queryFn: apiClient.getArtifacts,
  });

  const buildArtifact = React.useMemo(() => {
    if (!artifacts || !build) return null;
    return artifacts.find((a) => a.buildId === build.id);
  }, [artifacts, build]);

  // Fetch cascade chains to check if this build triggered one
  const { data: chains } = useQuery({
    queryKey: ['cascadeChains'],
    queryFn: apiClient.getCascadeChains,
  });

  const triggeredChain = React.useMemo(() => {
    if (!chains || !build) return null;
    return chains.find((c: any) => c.build_id === build.id || c.buildId === build.id);
  }, [chains, build]);

  // Fetch the dependency graph for the produced artifact to inspect its resolved dependencies
  const { data: graphData } = useQuery({
    queryKey: ['dependencyGraph', buildArtifact?.name, buildArtifact?.version],
    queryFn: () => apiClient.getDependencyGraph(buildArtifact!.name, buildArtifact!.version, 1, 'forward'),
    enabled: !!buildArtifact,
  });

  const outdatedDependencies = React.useMemo(() => {
    if (!artifacts || !graphData || !graphData.graph || !graphData.graph.nodes) {
      return [];
    }
    
    // Map of name -> latest version
    const latestVersions = new Map<string, string>();
    artifacts.forEach((a) => {
      if (a.isLatest) {
        latestVersions.set(a.name, a.version);
      }
    });

    const outdatedList: { name: string; currentVersion: string; latestVersion: string }[] = [];
    const nodes = graphData.graph.nodes;
    
    nodes.forEach((node: any) => {
      if (node.type === 'root') return;
      
      const latestVer = latestVersions.get(node.name);
      if (latestVer && node.version !== latestVer) {
        outdatedList.push({
          name: node.name,
          currentVersion: node.version,
          latestVersion: latestVer
        });
      }
    });
    
    return outdatedList;
  }, [artifacts, graphData]);

  const logEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom if building
  React.useEffect(() => {
    if (build?.status === 'building') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [build?.logs, build?.status]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-mono text-sm animate-pulse">Loading build metadata...</p>
      </div>
    );
  }

  if (error || !build) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-2xl max-w-2xl mx-auto mt-12 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-red-600">Failed to load build details</h2>
        <p className="text-sm text-red-600/80">The requested build was not found or is currently unreachable.</p>
        <Link 
          href="/builds" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Builds List
        </Link>
      </div>
    );
  }

  let statusBg = 'bg-gray-100 text-gray-600 border-gray-200';
  let statusIcon = Clock;
  if (build.status === 'success') {
    statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    statusIcon = CheckCircle2;
  }
  if (build.status === 'failed') {
    statusBg = 'bg-red-500/10 text-red-600 border-red-500/20';
    statusIcon = XCircle;
  }
  if (build.status === 'building') {
    statusBg = 'bg-blue-500/10 text-[var(--primary)] border-blue-500/20 animate-pulse';
    statusIcon = Play;
  }
  if (build.status === 'pending') {
    statusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    statusIcon = Clock;
  }
  if (build.status === 'cancelled') {
    statusBg = 'bg-gray-50 text-gray-600 border-gray-200';
    statusIcon = XOctagon;
  }

  const StatusIcon = statusIcon;

  return (
    <div className="space-y-6">
      {/* Back to Builds */}
      <div className="flex items-center justify-between">
        <Link 
          href="/builds"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Builds
        </Link>

        <div className="flex items-center gap-2">
          {/* Cancel Button */}
          {(build.status === 'building' || build.status === 'pending') && (
            <button
              onClick={() => cancelMutation.mutate(build.id)}
              disabled={cancelMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-950/20 hover:bg-red-600 border border-red-500/20 hover:border-transparent text-red-600 hover:text-[var(--primary)] rounded-2xl text-xs font-semibold transition-all shadow"
            >
              <XOctagon className="w-4 h-4" />
              Cancel Execution
            </button>
          )}
          {/* Retry Button */}
          {(build.status === 'success' || build.status === 'failed' || build.status === 'cancelled') && (
            <button
              onClick={() => retryMutation.mutate(build.id)}
              disabled={retryMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-[var(--primary)] text-white rounded-full rounded-2xl text-xs font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              <RotateCw className="w-4 h-4" />
              Re-run Pipeline
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Details Sidebar & Terminal Output */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Build Metadata Card */}
        <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-6 self-start">
          <div className="space-y-2 border-b border-[var(--card-border)] pb-4">
            <span className="text-[10px] text-gray-500 font-mono block">PIPELINE RUN</span>
            <h3 className="text-base font-bold text-gray-900 font-mono">{build.id}</h3>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBg} mt-2`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {build.status}
            </span>
          </div>

          <div className="space-y-4 text-sm">
            {/* Repository */}
            <div className="flex items-start gap-3">
              <Code className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] text-gray-500 font-semibold block uppercase">Repository</span>
                <span className="font-medium text-gray-900 block break-all">{build.repository}</span>
              </div>
            </div>

            {/* Branch */}
            <div className="flex items-start gap-3">
              <GitBranch className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] text-gray-500 font-semibold block uppercase">Branch</span>
                <span className="font-medium text-gray-900 block">{build.branch}</span>
              </div>
            </div>

            {/* Commit */}
            <div className="flex items-start gap-3">
              <FileCode className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] text-gray-500 font-semibold block uppercase">Commit Hash</span>
                <span className="font-mono text-xs text-gray-700 block break-all">{build.commit}</span>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] text-gray-500 font-semibold block uppercase">Duration</span>
                <span className="font-medium text-gray-900 block">{build.durationSeconds ? `${build.durationSeconds} seconds` : 'Running...'}</span>
              </div>
            </div>

            {/* Triggered Date */}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] text-gray-500 font-semibold block uppercase">Created At</span>
                <span className="font-medium text-gray-900 block">{new Date(build.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Produced Artifact */}
            {buildArtifact && (
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-[var(--primary)] mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] text-gray-500 font-semibold block uppercase">Produced Artifact</span>
                  <Link 
                    href={`/artifacts/${buildArtifact.name}/${buildArtifact.version}`}
                    className="text-[var(--primary)] hover:text-[var(--primary)] hover:underline font-semibold block text-xs"
                  >
                    {buildArtifact.name}@{buildArtifact.version}
                  </Link>
                </div>
              </div>
            )}

            {/* Triggered Rebuild Session */}
            {triggeredChain && (
              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] text-gray-500 font-semibold block uppercase">Rebuild Session</span>
                  <Link 
                    href={`/cascade/${triggeredChain.id || triggeredChain.chainId}`}
                    className="text-violet-500 hover:text-violet-400 hover:underline font-semibold block text-xs"
                  >
                    View Cascade Timeline
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Terminal Logs Output */}
        <div className="lg:col-span-2 flex flex-col p-6 bg-[var(--background)] border border-[var(--card-border)] rounded-2xl shadow-xl min-h-[60vh]">
          <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-4 mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[var(--primary)]" />
              Pipeline Terminal Logs
            </h3>
            {build.status === 'building' && (
              <span className="flex items-center gap-2 text-xs text-[var(--primary)] font-mono">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                Streaming Logs...
              </span>
            )}
          </div>

          {/* Outdated Dependencies Warning Box */}
          {outdatedDependencies.length > 0 && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                Outdated Dependencies Warning
              </div>
              <p className="text-xs text-gray-500">
                This build resolved dependencies that are no longer the latest version in the registry:
              </p>
              <div className="space-y-1 text-xs">
                {outdatedDependencies.map((dep, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-gray-900 font-semibold">{dep.name}</span>
                    <span className="text-gray-500">resolved:</span>
                    <span className="text-amber-500">{dep.currentVersion}</span>
                    <span className="text-gray-500">→ latest:</span>
                    <span className="text-emerald-400">{dep.latestVersion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs scroll area */}
          <div className="flex-1 bg-gray-50 border border-[var(--card-border)] rounded-2xl p-4 overflow-y-auto font-mono text-xs text-gray-700 leading-relaxed max-h-[500px]">
            {build.logs ? (
              <pre className="whitespace-pre-wrap select-text selection:bg-blue-500/30 selection:text-gray-900">
                {build.logs}
              </pre>
            ) : build.status === 'pending' ? (
              <div className="flex items-center justify-center h-full text-gray-500 italic py-12">
                Build is queued and waiting for an executor agent to pick up...
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 italic py-12">
                No logs generated for this execution.
              </div>
            )}
            
            {/* Error Message Block */}
            {build.errorMessage && (
              <div className="mt-4 p-3 bg-red-950/20 border border-red-500/20 rounded-lg text-red-600 font-mono text-xs">
                <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <XOctagon className="w-4 h-4 text-red-500" />
                  Terminal Exception
                </div>
                {build.errorMessage}
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
