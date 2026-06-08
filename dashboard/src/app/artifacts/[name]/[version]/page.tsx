'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { compareVersions } from '@/utils/semver';
import { 
  ArrowLeft, 
  Package, 
  Tag, 
  Download, 
  GitBranch, 
  Code,
  Calendar,
  Database,
  Trash2,
  Plus,
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ArtifactDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const name = params.name as string;
  const version = params.version as string;

  const [newTag, setNewTag] = React.useState('');
  const [showRawJson, setShowRawJson] = React.useState(false);

  // Fetch specific artifact metadata
  const { data: metadata, isLoading: isMetaLoading, error: metaError } = useQuery({
    queryKey: ['artifact', name, version],
    queryFn: () => apiClient.getArtifact(name, version),
  });

  // Fetch list of versions
  const { data: versionsResponse, isLoading: isVersionsLoading } = useQuery({
    queryKey: ['artifactVersions', name],
    queryFn: () => apiClient.getArtifactVersions(name),
  });

  // Fetch all builds to validate build links
  const { data: builds } = useQuery({
    queryKey: ['builds'],
    queryFn: apiClient.getBuilds,
  });

  const existingBuildIds = React.useMemo(() => {
    return new Set((builds || []).map((b: any) => b.id));
  }, [builds]);

  // Extract versions list and sort them descending (latest first)
  const versionsList = React.useMemo(() => {
    const raw = versionsResponse?.versions || [];
    return [...raw].sort((a: any, b: any) => {
      const aLatest = a.isLatest || a.is_latest;
      const bLatest = b.isLatest || b.is_latest;
      if (aLatest && !bLatest) return -1;
      if (!aLatest && bLatest) return 1;

      const semverCompare = compareVersions(b.version, a.version);
      if (semverCompare !== 0) return semverCompare;

      const aTime = a.createdAt || a.created_at;
      const bTime = b.createdAt || b.created_at;
      if (aTime && bTime) {
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }
      return 0;
    });
  }, [versionsResponse]);

  const renderBuildLink = (buildId: string, full: boolean = false) => {
    if (!buildId) return <span className="text-gray-500 italic">Manual or untracked build</span>;
    
    const displayId = full ? buildId : `${buildId.substring(0, 8)}...`;
    
    if (!builds) {
      return (
        <span className="text-gray-400 font-mono" title={buildId}>
          {displayId}
        </span>
      );
    }

    const isValid = existingBuildIds.has(buildId);
    if (isValid) {
      return (
        <Link 
          href={`/builds/${buildId}`}
          className="text-blue-500 hover:text-blue-400 hover:underline font-mono font-semibold"
          title={buildId}
          onClick={(e) => e.stopPropagation()}
        >
          {displayId}
        </Link>
      );
    } else {
      return (
        <span 
          className="text-gray-500 font-mono" 
          title={`${buildId} (Manual or untracked build)`}
        >
          {displayId} <span className="text-[10px] text-gray-500 font-sans italic font-normal">(manual)</span>
        </span>
      );
    }
  };

  // Fetch dependency graph for the active version to inspect resolved versions
  const { data: depGraphData } = useQuery({
    queryKey: ['dependencyGraph', name, version],
    queryFn: () => apiClient.getDependencyGraph(name, version, 1, 'forward'),
  });

  const resolvedVersionsMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (!depGraphData || !depGraphData.graph || !depGraphData.graph.edges) {
      return map;
    }
    depGraphData.graph.edges.forEach((edge: any) => {
      const parts = edge.to.split('@');
      if (parts.length >= 2) {
        const depName = parts[0];
        const resolvedVer = parts[1];
        map.set(depName, resolvedVer);
      }
    });
    return map;
  }, [depGraphData]);

  // Mutations for Tagging
  const addTagMutation = useMutation({
    mutationFn: (tag: string) => apiClient.addTag(name, version, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifact', name, version] });
      queryClient.invalidateQueries({ queryKey: ['artifacts'] });
      setNewTag('');
    }
  });

  const removeTagMutation = useMutation({
    mutationFn: (tag: string) => apiClient.removeTag(name, version, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifact', name, version] });
      queryClient.invalidateQueries({ queryKey: ['artifacts'] });
    }
  });

  const deleteArtifactMutation = useMutation({
    mutationFn: () => apiClient.deleteArtifact(name, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifactVersions', name] });
      queryClient.invalidateQueries({ queryKey: ['artifacts'] });
      router.push('/artifacts');
    },
    onError: (err: any) => {
      alert(`Failed to delete artifact: ${err.message}`);
    }
  });

  const handleDeleteClick = () => {
    if (window.confirm(`Are you sure you want to permanently delete artifact ${name} version ${version}? This action cannot be undone and will clean up all associated records.`)) {
      deleteArtifactMutation.mutate();
    }
  };

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim()) {
      addTagMutation.mutate(newTag.trim().toLowerCase());
    }
  };

  const isLoading = isMetaLoading || isVersionsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-mono text-sm animate-pulse">Retrieving artifact metadata...</p>
      </div>
    );
  }

  if (metaError || !metadata) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-2xl max-w-2xl mx-auto mt-12 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-red-400">Failed to load artifact</h2>
        <p className="text-sm text-red-300/80">The requested artifact `{name}@{version}` was not found in the registry.</p>
        <Link 
          href="/artifacts" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Artifacts Registry
        </Link>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // versionsList hook has been moved to the top of the component to satisfy Rules of Hooks

  const downloadUrl = `/api/registry/artifacts/${name}/${version}/download`;

  const currentVersionDetails = versionsList.find((v: any) => v.version === version);
  const isLatest = currentVersionDetails?.is_latest || currentVersionDetails?.isLatest;
  const isDeprecated = !!(currentVersionDetails?.deprecated_at || currentVersionDetails?.deprecatedAt);

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {metadata.name}
              {isLatest && (
                <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/25 uppercase tracking-wider">
                  Latest Version
                </span>
              )}
              {isDeprecated && (
                <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] font-bold rounded-lg border border-amber-500/25 uppercase tracking-wider">
                  Deprecated Version
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-400 mt-1">Inspecting release package metadata and dependencies.</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <a 
            href={downloadUrl}
            download
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
          <button
            onClick={handleDeleteClick}
            disabled={deleteArtifactMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-rose-950/40 hover:bg-rose-600/80 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-rose-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete Version
          </button>
        </div>
      </div>

      {/* Main Grid: Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Properties & Version List */}
        <div className="space-y-6">
          
          {/* Metadata properties */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              Properties
            </h3>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Package Name</span>
                <span className="font-bold text-white block text-sm">{metadata.name}</span>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Active Version</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-white font-semibold">{metadata.version}</span>
                  {isLatest && (
                    <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[9px] font-bold rounded border border-emerald-500/25 uppercase tracking-wider">
                      Latest
                    </span>
                  )}
                  {isDeprecated && (
                    <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[9px] font-bold rounded border border-amber-500/25 uppercase tracking-wider">
                      Deprecated
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">File Size</span>
                <span className="font-medium text-white block">{metadata.file_size_bytes ? formatBytes(metadata.file_size_bytes) : 'N/A'}</span>
              </div>

              {metadata.checksums?.sha256 && (
                <div>
                  <span className="text-[10px] text-gray-500 font-semibold block uppercase">SHA-256 Checksum</span>
                  <span className="font-mono text-gray-400 block break-all text-[11px] bg-black/35 p-2 rounded-lg border border-[#1e293b] mt-1 select-all">
                    {metadata.checksums.sha256}
                  </span>
                </div>
              )}

              <div>
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Registered At</span>
                <span className="font-medium text-white block">{metadata.built_at ? new Date(metadata.built_at).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Versions Swapper list */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3">
              Version History ({versionsList.length})
            </h3>
            
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {versionsList.map((ver: any) => {
                const isCurrent = ver.version === version;
                const verIsLatest = ver.is_latest || ver.isLatest;
                const verIsDeprecated = !!(ver.deprecated_at || ver.deprecatedAt);
                return (
                  <div
                    key={ver.version}
                    onClick={() => router.push(`/artifacts/${name}/${ver.version}`)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                      isCurrent 
                        ? 'bg-blue-600/10 border-blue-500/20 text-blue-400 font-bold' 
                        : 'border-transparent text-gray-400 hover:bg-[#151d30] hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="truncate">{ver.version}</span>
                      {verIsLatest && (
                        <span className="px-1 py-0.2 bg-emerald-500/15 text-emerald-400 text-[8px] font-bold rounded border border-emerald-500/25 uppercase tracking-wider shrink-0">
                          latest
                        </span>
                      )}
                      {verIsDeprecated && (
                        <span className="px-1 py-0.2 bg-amber-500/15 text-amber-400 text-[8px] font-bold rounded border border-amber-500/25 uppercase tracking-wider shrink-0">
                          deprecated
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(ver.build_id || ver.buildId) && (
                        <span className="text-[10px]" onClick={(e) => e.stopPropagation()}>
                          {renderBuildLink(ver.build_id || ver.buildId, false)}
                        </span>
                      )}
                      <ChevronRight className={`w-4 h-4 ${isCurrent ? 'text-blue-400' : 'text-gray-600'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Build Origin, Tags, Dependencies, Raw JSON */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Build Origin (Git details) */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Build Source Integrity
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Git Repository</span>
                <span className="font-mono text-gray-300 block break-all">{metadata.repository || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Git Branch</span>
                <span className="font-mono text-gray-300 block flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5 text-gray-500" />
                  {metadata.branch || 'main'}
                </span>
              </div>
              <div className="space-y-1 md:col-span-2">
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Commit SHA</span>
                <span className="font-mono text-gray-300 block break-all select-all">{metadata.commit || 'N/A'}</span>
              </div>
              <div className="space-y-1 md:col-span-2">
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Build Pipeline Link</span>
                <div className="block truncate">
                  {renderBuildLink(metadata.build_id, true)}
                </div>
              </div>
            </div>
          </div>

          {/* Tags Manager */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-violet-500" />
              Tags Management
            </h3>

            <div className="space-y-4">
              {/* Existing Tags */}
              <div className="flex flex-wrap gap-2">
                {metadata.tags && metadata.tags.length > 0 ? (
                  metadata.tags.map((tag: string) => (
                    <span 
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold rounded-xl text-xs uppercase"
                    >
                      {tag}
                      <button
                        onClick={() => removeTagMutation.mutate(tag)}
                        disabled={removeTagMutation.isPending}
                        className="text-violet-500 hover:text-red-400 transition-colors"
                        title="Delete Tag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-xs italic">No tags associated with this artifact version yet.</span>
                )}
              </div>

              {/* Tag Adder Form */}
              <form onSubmit={handleAddTagSubmit} className="flex gap-2 items-center max-w-sm">
                <input
                  type="text"
                  placeholder="Enter new tag name..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="flex-1 bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={addTagMutation.isPending || !newTag.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>
            </div>
          </div>

          {/* Dependencies List */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3">
              Dependencies ({metadata.dependencies?.length || 0})
            </h3>

            {metadata.dependencies && metadata.dependencies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1e293b] text-gray-400 font-medium">
                      <th className="py-2.5 px-3">Dependency Name</th>
                      <th className="py-2.5 px-3 font-mono">Range Constraint</th>
                      <th className="py-2.5 px-3 font-mono">Resolved Version</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metadata.dependencies.map((dep: any, index: number) => {
                      const resolvedVer = resolvedVersionsMap.get(dep.name);
                      return (
                        <tr 
                          key={index} 
                          className="border-b border-[#1e293b]/60 hover:bg-[#151d30]/20 transition-colors"
                        >
                          <td className="py-3 px-3 font-semibold text-white">
                            {dep.name}
                          </td>
                          <td className="py-3 px-3 font-mono text-gray-300">
                            {dep.version_range}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-blue-400">
                            {resolvedVer ? resolvedVer : (dep.resolved_version || 'pending resolution...')}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                              resolvedVer 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {resolvedVer ? 'resolved' : 'pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-zinc-950/20 border border-zinc-800/40 rounded-xl text-center text-xs text-gray-500 font-mono">
                No external dependencies defined for this artifact.
              </div>
            )}
          </div>

          {/* Expandable Raw JSON Viewer */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center justify-between w-full text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3"
            >
              <span>Raw Metadata JSON Explorer</span>
              {showRawJson ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showRawJson && (
              <div className="p-4 bg-black/60 border border-[#1e293b] rounded-xl overflow-x-auto font-mono text-[11px] text-blue-400 leading-relaxed select-all">
                <pre>{JSON.stringify(metadata, null, 2)}</pre>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
