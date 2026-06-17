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
import { compareVersions } from '@/utils/semver';

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
      // Sort versions descending (newest / latest first)
      versions.sort((a, b) => {
        const aLatest = a.isLatest || (a as any).is_latest;
        const bLatest = b.isLatest || (b as any).is_latest;
        if (aLatest && !bLatest) return -1;
        if (!aLatest && bLatest) return 1;

        const semverCompare = compareVersions(b.version, a.version);
        if (semverCompare !== 0) return semverCompare;

        const aTime = a.createdAt;
        const bTime = b.createdAt;
        if (aTime && bTime) {
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        }
        return b.id.localeCompare(a.id);
      });
      
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
        <p className="text-gray-500 font-mono text-sm animate-pulse">Scanning registry store...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Package className="w-6 h-6 text-[var(--primary)]" />
          Artifact Registry
        </h2>
        <p className="text-sm text-gray-500">View and manage compiled packages, library builds, and release metadata.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search artifacts by name or repo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-2xl pl-10 pr-4 py-2 text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            <span className="text-xs text-gray-500 flex items-center gap-1 font-semibold uppercase mr-2">
              <Tag className="w-3.5 h-3.5" /> Filter Tag:
            </span>
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-3 py-1 rounded-2xl text-xs font-semibold tracking-wider transition-all ${
                selectedTag === 'all' 
                  ? 'bg-[var(--primary)] text-white rounded-full' 
                  : 'bg-[var(--background)] border border-[var(--card-border)] text-gray-500 hover:text-gray-800'
              }`}
            >
              ALL
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-2xl text-xs font-semibold tracking-wider transition-all ${
                  selectedTag === tag 
                    ? 'bg-[var(--primary)] text-white rounded-full' 
                    : 'bg-[var(--background)] border border-[var(--card-border)] text-gray-500 hover:text-gray-800'
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
              className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl flex flex-col justify-between hover:border-blue-500/30 transition-all duration-300 group"
            >
              <div className="space-y-4">
                {/* Title & Type */}
                <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500/10 text-[var(--primary)] rounded-lg group-hover:scale-110 transition-transform">
                      <Package className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 group-hover:text-[var(--primary)] transition-colors">
                      {group.name}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold tracking-wider uppercase border border-gray-200 rounded-full">
                    {group.artifactType}
                  </span>
                </div>

                {/* Info List */}
                <div className="space-y-2.5 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>Versions Registered:</span>
                    <span className="font-semibold text-gray-900 font-mono bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                      {group.versionsCount} versions
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Latest Version:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-900 font-mono">
                        {group.latestVersion}
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded border border-emerald-200 uppercase tracking-wider">
                        Latest
                      </span>
                    </div>
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
              <div className="pt-6 mt-4 border-t border-[var(--card-border)]">
                <Link 
                  href={`/artifacts/${group.name}/${group.latestVersion}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--background)] hover:bg-blue-600 border border-[var(--card-border)] hover:border-transparent rounded-2xl text-xs font-semibold text-gray-700 hover:text-[var(--primary)] transition-all shadow"
                >
                  View Details
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-12 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl text-center text-gray-500 font-mono text-sm shadow-xl">
            No artifacts found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
