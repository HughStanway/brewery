'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, Artifact } from '@/api/client';
import Link from 'next/link';
import { 
  Package, 
  Search, 
  Tag, 
  Calendar, 
  Database,
  ArrowRight,
  GitBranch
} from 'lucide-react';

export default function ArtifactsPage() {
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedTag, setSelectedTag] = React.useState<string>('all');

  const { data: artifacts, isLoading, error } = useQuery({
    queryKey: ['artifacts'],
    queryFn: apiClient.getArtifacts,
    refetchInterval: 5000,
  });

  // Group flat artifacts list by name
  const groupedArtifacts = React.useMemo(() => {
    if (!artifacts) return [];
    
    const groups: Record<string, Artifact[]> = {};
    artifacts.forEach((art) => {
      if (!groups[art.name]) {
        groups[art.name] = [];
      }
      groups[art.name].push(art);
    });

    return Object.keys(groups).map((name) => {
      const versions = groups[name];
      // Sort by version (ideally semver, but simple sort works or sort by createdAt)
      versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const latest = versions[0];
      const tags = Array.from(new Set(versions.flatMap(v => v.tags || [])));
      
      let repo = 'N/A';
      if (latest.metadata) {
        try {
          const parsedMeta = JSON.parse(latest.metadata);
          if (parsedMeta.repository) repo = parsedMeta.repository;
        } catch {
          // ignore
        }
      }

      return {
        name,
        versionsCount: versions.length,
        latestVersion: latest.version,
        artifactType: latest.artifactType,
        tags,
        createdAt: latest.createdAt,
        repository: repo,
        latestArtifact: latest
      };
    });
  }, [artifacts]);

  // Extract all unique tags
  const allTags = React.useMemo(() => {
    if (!artifacts) return [];
    return Array.from(new Set(artifacts.flatMap(a => a.tags || [])));
  }, [artifacts]);

  const filteredGroups = React.useMemo(() => {
    return groupedArtifacts.filter(g => {
      const matchesSearch = 
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.repository.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag === 'all' || g.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [groupedArtifacts, searchQuery, selectedTag]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-mono text-sm animate-pulse">Scanning registry store...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-500" />
          Artifact Registry
        </h2>
        <p className="text-sm text-gray-400">View and manage compiled packages, library builds, and release metadata.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-[#131b2e] border border-[#1e293b] rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search artifacts by name or repo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            <span className="text-xs text-gray-500 flex items-center gap-1 font-semibold uppercase mr-2">
              <Tag className="w-3.5 h-3.5" /> Filter Tag:
            </span>
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold tracking-wider transition-all ${
                selectedTag === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-[#0b0f19] border border-[#1e293b] text-gray-400 hover:text-gray-200'
              }`}
            >
              ALL
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold tracking-wider transition-all ${
                  selectedTag === tag 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-[#0b0f19] border border-[#1e293b] text-gray-400 hover:text-gray-200'
                }`}
              >
                {tag.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <div 
              key={group.name} 
              className="p-6 bg-[#131b2e] border border-[#1e293b] rounded-2xl shadow-xl flex flex-col justify-between hover:border-blue-500/30 transition-all duration-300 group"
            >
              <div className="space-y-4">
                {/* Title & Type */}
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                      <Package className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                      {group.name}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase border border-zinc-700/50 rounded-full">
                    {group.artifactType}
                  </span>
                </div>

                {/* Info List */}
                <div className="space-y-2.5 text-xs text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>Versions Registered:</span>
                    <span className="font-semibold text-white font-mono bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                      {group.versionsCount} versions
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Latest Version:</span>
                    <span className="font-semibold text-white font-mono">
                      {group.latestVersion}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span>Repository Location:</span>
                    <span className="font-mono text-gray-500 block break-all text-[11px]">
                      {group.repository}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {group.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {group.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-bold rounded-lg uppercase tracking-wider"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-6 mt-4 border-t border-[#1e293b]">
                <Link 
                  href={`/artifacts/${group.name}/${group.latestVersion}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#0b0f19] hover:bg-blue-600 border border-[#1e293b] hover:border-transparent rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-all shadow"
                >
                  View Details
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-12 bg-[#131b2e] border border-[#1e293b] rounded-2xl text-center text-gray-500 font-mono text-sm shadow-xl">
            No artifacts found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
