'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import Link from 'next/link';
import { 
  Hammer, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert,
  Activity,
  Terminal
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function DashboardPage() {
  // Fetch dashboard stats
  const { 
    data: stats, 
    isLoading: isStatsLoading, 
    error: statsError 
  } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: apiClient.getDashboardStats,
    refetchInterval: 5000, // Poll every 5s
  });

  // Fetch builds
  const { 
    data: builds, 
    isLoading: isBuildsLoading 
  } = useQuery({
    queryKey: ['builds'],
    queryFn: apiClient.getBuilds,
    refetchInterval: 5000,
  });

  // Fetch conflicts
  const {
    data: conflicts,
    isLoading: isConflictsLoading
  } = useQuery({
    queryKey: ['conflicts'],
    queryFn: apiClient.getConflicts,
    refetchInterval: 5000,
  });

  const isLoading = isStatsLoading || isBuildsLoading;

  const sortedBuilds = React.useMemo(() => {
    if (!builds) return [];
    return [...builds].sort((a, b) => {
      const aTime = a.startedAt || a.createdAt;
      const bTime = b.startedAt || b.createdAt;
      if (aTime && bTime) {
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }
      if (aTime) return 1;
      if (bTime) return -1;
      return b.id.localeCompare(a.id);
    });
  }, [builds]);

  // Prepare chart data
  const chartData = React.useMemo(() => {
    if (!sortedBuilds || sortedBuilds.length === 0) return [];
    return [...sortedBuilds]
      .slice(0, 10)
      .reverse()
      .map((b, idx) => ({
        name: `Build #${idx + 1}`,
        duration: b.durationSeconds || 0,
        status: b.status,
        shortCommit: b.commit ? b.commit.substring(0, 7) : 'N/A'
      }));
  }, [sortedBuilds]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-mono text-sm animate-pulse">Fetching system state...</p>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-2xl flex flex-col gap-4 max-w-2xl mx-auto mt-12">
        <div className="flex items-center gap-3 text-red-600">
          <ShieldAlert className="w-6 h-6" />
          <h2 className="text-lg font-semibold">Failed to Connect to Platform</h2>
        </div>
        <p className="text-sm text-red-600/80 font-mono">
          Ensure the Brewery Spring Boot backend application is running on port 8080.
        </p>
        <div className="p-3 bg-gray-50 rounded-lg text-xs font-mono text-red-600 overflow-x-auto">
          {statsError instanceof Error ? statsError.message : 'Unknown connection error'}
        </div>
      </div>
    );
  }

  const recentBuilds = sortedBuilds.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-950/20 to-indigo-950/10 border border-[var(--card-border)] rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Build & Deployment Pipeline Status</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time telemetry and artifact build analysis pipelines.</p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--card-border)] px-4 py-2 rounded-2xl text-xs font-mono text-gray-500">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          System Health: <span className="text-emerald-400 font-semibold">NORMAL</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Builds */}
        <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl flex items-center justify-between shadow-xl transition-all duration-300 hover:border-blue-500/30 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Total Builds</span>
            <div className="text-2xl font-bold text-gray-900 font-mono">{stats?.totalBuilds ?? 0}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-[var(--primary)] group-hover:scale-110 transition-transform">
            <Hammer className="w-6 h-6" />
          </div>
        </div>

        {/* Total Artifacts */}
        <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl flex items-center justify-between shadow-xl transition-all duration-300 hover:border-blue-500/30 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Artifact Registry</span>
            <div className="text-2xl font-bold text-gray-900 font-mono">{stats?.totalArtifacts ?? 0}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl flex items-center justify-between shadow-xl transition-all duration-300 hover:border-emerald-500/30 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Build Success Rate</span>
            <div className="text-2xl font-bold text-gray-900 font-mono flex items-baseline gap-1">
              {stats?.successRate ?? 0}%
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Active Queue */}
        <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl flex items-center justify-between shadow-xl transition-all duration-300 hover:border-amber-500/30 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Active Queue</span>
            <div className="text-2xl font-bold text-gray-900 font-mono flex items-center gap-2">
              {stats?.queueCount ?? 0}
              {stats?.queueCount && stats.queueCount > 0 ? (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              ) : null}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Build History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recharts Duration History */}
        <div className="lg:col-span-2 p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Pipeline Execution Times (seconds)</h3>
            <span className="text-xs text-gray-500 font-mono">Last 10 executions</span>
          </div>

          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="shortCommit" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d1325', border: '1px solid #1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#3b82f6', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="duration" name="Duration (s)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorDuration)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 font-mono text-xs">
                No build executions recorded.
              </div>
            )}
          </div>
        </div>

        {/* Conflicts & Alerts Sidebar */}
        <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Registry Alerts
              </h3>
              {conflicts && conflicts.length > 0 && (
                <span className="px-2 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-bold rounded-full">
                  {conflicts.length} Active
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {conflicts && conflicts.length > 0 ? (
                conflicts.map((conflict) => (
                  <div 
                    key={conflict.id} 
                    className="p-3 bg-red-950/10 border border-red-500/20 rounded-2xl space-y-2 text-xs"
                  >
                    <div className="font-semibold text-red-600">
                      Conflict: {conflict.artifactName}@{conflict.artifactVersion}
                    </div>
                    <p className="text-gray-500 text-[11px] leading-relaxed">
                      {conflict.conflictDescription}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl text-center text-xs text-gray-500">
                  ✓ No dependency version conflicts detected in the registry.
                </div>
              )}
            </div>
          </div>

          <Link 
            href="/dependencies"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 hover:bg-white border border-[var(--card-border)] rounded-2xl text-xs font-semibold text-[var(--primary)] hover:text-blue-300 transition-colors"
          >
            Manage Dependency Graph
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Recent Build Runs Table */}
      <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Recent Build Executions</h3>
          <Link 
            href="/builds"
            className="text-xs text-[var(--primary)] hover:text-[var(--primary)] font-semibold flex items-center gap-1 hover:underline"
          >
            View All Builds
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-gray-500 font-medium">
                <th className="py-3 px-4 text-xs tracking-wider uppercase">Build ID</th>
                <th className="py-3 px-4 text-xs tracking-wider uppercase">Repository / Branch</th>
                <th className="py-3 px-4 text-xs tracking-wider uppercase font-mono">Commit</th>
                <th className="py-3 px-4 text-xs tracking-wider uppercase">Status</th>
                <th className="py-3 px-4 text-xs tracking-wider uppercase">Execution</th>
                <th className="py-3 px-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {recentBuilds.length > 0 ? (
                recentBuilds.map((build) => {
                  let statusBg = 'bg-gray-100 text-gray-600 border-gray-200';
                  if (build.status === 'success') statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  if (build.status === 'failed') statusBg = 'bg-red-500/10 text-red-600 border-red-500/20';
                  if (build.status === 'building') statusBg = 'bg-blue-500/10 text-[var(--primary)] border-blue-500/20 animate-pulse';
                  if (build.status === 'pending') statusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  if (build.status === 'cancelled') statusBg = 'bg-gray-50 text-gray-600 border-gray-200';

                  return (
                    <tr 
                      key={build.id} 
                      className="border-b border-[var(--card-border)] hover:bg-gray-100 transition-colors"
                    >
                      <td className="py-4 px-4 font-mono text-xs font-semibold text-gray-700">
                        {build.id.substring(0, 8)}...
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-gray-900 text-xs">{build.repository}</div>
                        <div className="text-gray-500 text-[11px] font-mono">{build.branch}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-gray-500">
                        {build.commit.substring(0, 10)}...
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBg}`}>
                          {build.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-500 font-mono">
                        {build.durationSeconds ? `${build.durationSeconds}s` : '--'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link 
                          href={`/builds/${build.id}`}
                          className="p-2 bg-white hover:bg-blue-600 rounded-lg text-gray-500 hover:text-[var(--primary)] transition-all inline-flex items-center justify-center"
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
                  <td colSpan={6} className="py-8 text-center text-gray-500 font-mono text-xs">
                    No builds found. Trigger a commit hook or build runner.
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
