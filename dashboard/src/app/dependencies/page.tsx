'use client';

import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { compareVersions } from '@/utils/semver';
import { 
  GitFork, 
  Search, 
  AlertTriangle, 
  Compass, 
  CheckCircle,
  Activity,
  Layers
} from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  version: string;
  versionRange?: string;
  children: TreeNode[];
}

function buildTree(nodes: any[], edges: any[], rootId: string, isForward: boolean): TreeNode | null {
  if (!nodes || nodes.length === 0) return null;

  const nodeMap = new Map<string, TreeNode>();
  nodes.forEach(n => {
    nodeMap.set(n.id, {
      id: n.id,
      name: n.name,
      version: n.version,
      children: []
    });
  });

  const root = nodeMap.get(rootId);
  if (!root) return null;

  edges.forEach(e => {
    const parentId = isForward ? e.from : e.to;
    const childId = isForward ? e.to : e.from;
    
    const parent = nodeMap.get(parentId);
    const child = nodeMap.get(childId);
    
    if (parent && child) {
      // Avoid adding duplicate children
      if (!parent.children.some(c => c.id === child.id)) {
        parent.children.push({
          ...child,
          versionRange: e.version_range
        });
      }
    }
  });

  return root;
}

export default function DependenciesPage() {
  const [activeTab, setActiveTab] = React.useState<'graph' | 'conflicts'>('graph');
  
  // Search parameters for graph traversal
  const [pkgName, setPkgName] = React.useState('');
  const [pkgVersion, setPkgVersion] = React.useState('');
  const [depth, setDepth] = React.useState(2);
  const [direction, setDirection] = React.useState<'forward' | 'reverse'>('forward');

  // Trigger state for search query
  const [searchParams, setSearchParams] = React.useState({
    name: '',
    version: '',
    depth: 2,
    direction: 'forward' as 'forward' | 'reverse'
  });

  // Fetch all artifacts to choose a default package
  const { data: artifacts, isLoading: isArtifactsLoading } = useQuery({
    queryKey: ['artifacts'],
    queryFn: apiClient.getArtifacts,
  });

  const uniqueArtifactNames = React.useMemo(() => {
    if (!artifacts) return [];
    const names = new Set(artifacts.map(a => a.name));
    return Array.from(names).sort();
  }, [artifacts]);

  const { data: pkgVersionsData } = useQuery({
    queryKey: ['artifactVersions', pkgName],
    queryFn: () => apiClient.getArtifactVersions(pkgName),
    enabled: !!pkgName && uniqueArtifactNames.includes(pkgName),
  });
  
  const pkgVersions = React.useMemo(() => {
    const raw = pkgVersionsData?.versions || [];
    return [...raw].sort((a: any, b: any) => {
      const aLatest = a.isLatest || a.is_latest;
      const bLatest = b.isLatest || b.is_latest;
      if (aLatest && !bLatest) return -1;
      if (!aLatest && bLatest) return 1;
      return compareVersions(b.version, a.version);
    });
  }, [pkgVersionsData]);

  React.useEffect(() => {
    if (pkgVersions.length > 0) {
      const latestVer = pkgVersionsData?.latest || pkgVersions[0].version;
      if (!pkgVersions.some(v => v.version === pkgVersion)) {
        setPkgVersion(latestVer);
      }
    }
  }, [pkgVersions, pkgVersionsData, pkgVersion]);

  // Set default package values dynamically based on registered artifacts
  React.useEffect(() => {
    if (artifacts && artifacts.length > 0 && !searchParams.name) {
      // Sort by creation or pick first registered artifact
      const first = artifacts[0];
      setPkgName(first.name);
      setPkgVersion(first.version);
      setSearchParams({
        name: first.name,
        version: first.version,
        depth: 2,
        direction: 'forward'
      });
    }
  }, [artifacts, searchParams.name]);

  // Fetch dependency graph
  const { 
    data: graphData, 
    isLoading: isGraphLoading, 
    error: graphError,
    refetch: refetchGraph
  } = useQuery({
    queryKey: ['dependencyGraph', searchParams],
    queryFn: () => apiClient.getDependencyGraph(
      searchParams.name, 
      searchParams.version, 
      searchParams.depth, 
      searchParams.direction
    ),
    enabled: activeTab === 'graph' && !!searchParams.name && !!searchParams.version
  });

  // Fetch active conflicts
  const { 
    data: conflicts, 
    isLoading: isConflictsLoading 
  } = useQuery({
    queryKey: ['conflicts'],
    queryFn: apiClient.getConflicts,
    enabled: activeTab === 'conflicts'
  });

  // Manual trigger resolver mutation
  const resolveMutation = useMutation({
    mutationFn: ({ name, version }: { name: string, version: string }) => 
      apiClient.resolveDependencies(name, version),
    onSuccess: () => {
      refetchGraph();
      alert('Dependency resolution run completed successfully!');
    },
    onError: (err) => {
      alert(`Resolution run failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pkgName.trim() && pkgVersion.trim()) {
      setSearchParams({
        name: pkgName.trim(),
        version: pkgVersion.trim(),
        depth,
        direction
      });
    }
  };

  // Build the hierarchical tree from flat graph response
  const rootNode = React.useMemo(() => {
    if (!graphData || !graphData.graph) return null;
    const { nodes, edges } = graphData.graph;
    const rootId = graphData.artifact;
    return buildTree(nodes, edges, rootId, searchParams.direction === 'forward');
  }, [graphData, searchParams.direction]);

  // Render dependency graph tree helper
  const renderGraphNodes = (node: TreeNode | null, level = 0, visited = new Set<string>()): React.ReactNode => {
    if (!node || visited.has(node.id)) return null;
    visited.add(node.id);

    const name = node.name;
    const ver = node.version;
    const range = node.versionRange ? `(constraint: ${node.versionRange})` : '';
    const children = node.children || [];

    return (
      <div key={`${node.id}-${level}`} className="space-y-1">
        <div 
          className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs hover:bg-[#1e293b]/40 border border-transparent hover:border-[#334155]/30 max-w-xl transition-all"
          style={{ paddingLeft: `${Math.max(12, level * 24)}px` }}
        >
          {level > 0 && (
            <span className="text-gray-600 font-mono select-none">└──</span>
          )}
          <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-semibold text-white font-mono">{name}</span>
          <span className="text-gray-400 font-mono">@{ver}</span>
          {range && <span className="text-amber-500 font-mono text-[10px] ml-1">{range}</span>}
        </div>
        
        {children.map((child: TreeNode) => renderGraphNodes(child, level + 1, new Set(visited)))}
      </div>
    );
  };

  const isInitialLoading = isArtifactsLoading || (isGraphLoading && !pkgName);

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-mono text-sm animate-pulse">Initializing dependency explorer...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <GitFork className="w-6 h-6 text-blue-500" />
          Dependency Intelligence
        </h2>
        <p className="text-sm text-gray-400">Traverse deep package dependencies, check reverse impact trees, and monitor version compatibility.</p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[#1e293b] gap-2">
        <button
          onClick={() => setActiveTab('graph')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'graph' 
              ? 'border-blue-500 text-blue-400 font-bold' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Graph Traversal
        </button>
        <button
          onClick={() => setActiveTab('conflicts')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'conflicts' 
              ? 'border-blue-500 text-blue-400 font-bold' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Active Conflicts
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'graph' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Query Form Sidebar */}
          <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-5 self-start">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3 flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-500" />
              Traversal Settings
            </h3>

            {artifacts && artifacts.length > 0 ? (
              <form onSubmit={handleSearchSubmit} className="space-y-4">
                {/* Package Name */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase block">Package Name</label>
                  <input
                    type="text"
                    list="dependency-package-names"
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <datalist id="dependency-package-names">
                    {uniqueArtifactNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                {/* Version */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase block">Target Version</label>
                  {pkgVersions && pkgVersions.length > 0 ? (
                    <select
                      value={pkgVersion}
                      onChange={(e) => setPkgVersion(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                      required
                    >
                      {pkgVersions.map((v: any) => (
                        <option key={v.version} value={v.version}>
                          {v.version} {v.is_latest || v.isLatest ? ' (latest)' : ''} {v.deprecated_at || v.deprecatedAt ? ' (deprecated)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={pkgVersion}
                      onChange={(e) => setPkgVersion(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 1.0.0"
                      required
                    />
                  )}
                </div>

                {/* Depth */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase block">Max Depth ({depth})</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={depth}
                    onChange={(e) => setDepth(Number(e.target.value))}
                    className="w-full h-1 bg-[#0b0f19] rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Direction */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase block">Directional Tree</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('forward')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                        direction === 'forward' 
                          ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                          : 'border-[#1e293b] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Forward (Deps)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('reverse')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                        direction === 'reverse' 
                          ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                          : 'border-[#1e293b] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Reverse (Dependents)
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-500/15"
                >
                  <Search className="w-4 h-4" /> Traverse Tree
                </button>
              </form>
            ) : (
              <div className="text-center py-6 text-gray-500 text-xs italic">
                Register an artifact first to start traversal queries.
              </div>
            )}

            {searchParams.name && (
              <div className="pt-4 border-t border-[#1e293b]">
                <button
                  onClick={() => resolveMutation.mutate({ name: searchParams.name, version: searchParams.version })}
                  disabled={resolveMutation.isPending}
                  className="w-full py-2 bg-[#151d30] hover:bg-[#1e293b] border border-[#1e293b] text-blue-400 hover:text-blue-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  title="Force registry resolving scheduler action"
                >
                  <Activity className="w-4.5 h-4.5 animate-pulse" />
                  Force Resolve Pipelines
                </button>
              </div>
            )}
          </div>

          {/* Graph Visualization Tree */}
          <div className="lg:col-span-2 p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl flex flex-col justify-between min-h-[50vh]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                <h3 className="text-sm font-bold text-white">
                  Result Tree: {searchParams.name ? `${searchParams.name}@${searchParams.version}` : 'No search queried'} ({searchParams.direction})
                </h3>
                <span className="text-[10px] text-gray-500 font-mono uppercase">Depth: {searchParams.depth}</span>
              </div>

              {isGraphLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-gray-500 font-mono">Drawing nodes...</span>
                </div>
              ) : graphError ? (
                <div className="p-4 bg-red-950/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-mono">
                  Failed to fetch dependency graph: {graphError.message}
                </div>
              ) : rootNode ? (
                <div className="p-4 bg-black/30 border border-[#1e293b]/60 rounded-xl space-y-1.5 overflow-x-auto min-h-60 max-h-[400px]">
                  {renderGraphNodes(rootNode)}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500 text-xs font-mono">
                  {artifacts && artifacts.length > 0 
                    ? "Enter traversal parameters on the sidebar and click Traverse."
                    : "No artifacts registered. Upload files to the registry to inspect dependency relations."}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Conflicts Tab View */
        <div className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Conflict Records
            </h3>
          </div>

          {isConflictsLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : conflicts && conflicts.length > 0 ? (
            <div className="space-y-4">
              {conflicts.map((conflict: any) => (
                <div 
                  key={conflict.id} 
                  className="p-5 bg-red-950/10 border border-red-500/10 rounded-2xl space-y-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-red-400 text-sm">
                      Package: {conflict.artifactName || 'unnamed'}@{conflict.artifactVersion || 'unknown'}
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      Detected: {new Date(conflict.detectedAt || Date.now()).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2 text-gray-300">
                    <p className="font-medium">Description:</p>
                    <p className="bg-black/25 p-3 rounded-lg border border-[#1e293b] font-mono text-[11px] text-red-300 leading-relaxed">
                      {conflict.conflictDescription}
                    </p>
                  </div>

                  {conflict.involvedArtifacts && conflict.involvedArtifacts.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium text-gray-300">Involved Packages:</p>
                      <div className="flex flex-wrap gap-2">
                        {conflict.involvedArtifacts.map((art: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700/50 rounded-md font-mono">
                            {art}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {conflict.suggestedResolutions && conflict.suggestedResolutions.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium text-emerald-400">Suggested Action Paths:</p>
                      <ul className="list-disc pl-5 space-y-1 text-gray-400">
                        {conflict.suggestedResolutions.map((res: string, i: number) => (
                          <li key={i}>{res}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-2 border border-[#1e293b] rounded-xl bg-black/10">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
              <p className="text-gray-400 font-semibold mt-1">No Active Conflicts</p>
              <p className="text-xs text-gray-500">The platform registry satisfies all version range bounds across all dependents.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
