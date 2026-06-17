'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, Build } from '@/api/client';
import Link from 'next/link';
import { 
  Hammer, 
  Terminal, 
  RotateCw, 
  XOctagon, 
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Play
} from 'lucide-react';

export default function BuildsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const { data: builds, isLoading, error } = useQuery({
    queryKey: ['builds'],
    queryFn: apiClient.getBuilds,
    refetchInterval: 5000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => apiClient.retryBuild(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builds'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.cancelBuild(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builds'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  const filteredBuilds = React.useMemo(() => {
    if (!builds) return [];
    const filtered = builds.filter(b => {
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesSearch = 
        b.repository.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.commit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const aTime = a.startedAt || a.createdAt;
      const bTime = b.startedAt || b.createdAt;
      if (aTime && bTime) {
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }
      if (aTime) return 1;
      if (bTime) return -1;
      return b.id.localeCompare(a.id);
    });
  }, [builds, statusFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-mono text-sm animate-pulse">Fetching pipelines...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Hammer className="w-6 h-6 text-[var(--primary)]" />
            Build Executions
          </h2>
          <p className="text-sm text-gray-500">Manage, run, and view progress of pipeline executions.</p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by repo, commit, or build ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-2xl pl-10 pr-4 py-2 text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {['all', 'pending', 'building', 'success', 'failed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-all ${
                statusFilter === status 
                  ? 'bg-[var(--primary)] text-white rounded-full shadow-md shadow-blue-500/20' 
                  : 'bg-[var(--background)] border border-[var(--card-border)] text-gray-500 hover:text-gray-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Builds Table */}
      <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-gray-500 font-medium">
                <th className="py-3 px-4 text-xs tracking-wider uppercase">Build ID</th>
                <th className="py-3 px-4 text-xs tracking-wider uppercase">Repository</th>
                <th className="py-3 px-4 text-xs tracking-wider uppercase">Branch / Commit</th>
                <th className="py-3 px-4 text-xs tracking-wider uppercase">Status</th>
                <th className="py-3 px-4 text-xs tracking-wider uppercase">Started At</th>
                <th className="py-3 px-4 text-xs tracking-wider uppercase">Duration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBuilds.length > 0 ? (
                filteredBuilds.map((build) => {
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
                    <tr 
                      key={build.id} 
                      className="border-b border-[var(--card-border)] hover:bg-gray-100 transition-colors"
                    >
                      <td className="py-4 px-4 font-mono text-xs font-semibold text-gray-700">
                        {build.id.substring(0, 8)}...
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-900">
                        {build.repository}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-xs text-gray-700">{build.branch}</div>
                        <div className="text-[11px] font-mono text-gray-500">{build.commit.substring(0, 12)}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBg}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {build.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-500">
                        {build.startedAt ? new Date(build.startedAt).toLocaleString() : '--'}
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-gray-500">
                        {build.durationSeconds ? `${build.durationSeconds}s` : '--'}
                      </td>
                      <td className="py-4 px-4 text-right flex items-center justify-end gap-2">
                        {/* Cancel Button */}
                        {(build.status === 'building' || build.status === 'pending') && (
                          <button
                            onClick={() => cancelMutation.mutate(build.id)}
                            disabled={cancelMutation.isPending}
                            className="p-2 bg-red-950/20 border border-red-500/20 text-red-600 hover:bg-red-500 hover:text-[var(--primary)] rounded-lg transition-colors inline-flex items-center justify-center"
                            title="Cancel Build"
                          >
                            <XOctagon className="w-4 h-4" />
                          </button>
                        )}
                        {/* Retry Button */}
                        {(build.status === 'success' || build.status === 'failed' || build.status === 'cancelled') && (
                          <button
                            onClick={() => retryMutation.mutate(build.id)}
                            disabled={retryMutation.isPending}
                            className="p-2 bg-gray-100 hover:bg-blue-600 border border-[var(--card-border)] text-[var(--primary)] hover:text-[var(--primary)] rounded-lg transition-colors inline-flex items-center justify-center"
                            title="Retry Build"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                        )}
                        {/* View Logs */}
                        <Link 
                          href={`/builds/${build.id}`}
                          className="p-2 bg-white hover:bg-blue-600 text-gray-500 hover:text-[var(--primary)] rounded-lg transition-all inline-flex items-center justify-center"
                          title="View Logs"
                        >
                          <Terminal className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 font-mono text-xs">
                    No builds match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
