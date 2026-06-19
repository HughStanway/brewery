'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuth } from '@/components/auth-context';
import { 
  UserPlus, 
  Trash2, 
  Key, 
  UserCheck, 
  Users, 
  ShieldAlert, 
  CheckCircle,
  X,
  XCircle,
  Edit2,
  User,
  Server,
  Settings,
  Shield,
  Cpu,
  HardDrive,
  Activity,
  Sliders
} from 'lucide-react';

export default function SettingsPage() {
  const { user: currentUser, logout } = useAuth();
  const queryClient = useQueryClient();

  // Active Tab state: profile, system, users
  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'users'>(
    currentUser?.role === 'ADMIN' ? 'users' : 'profile'
  );

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isUsernameOpen, setIsUsernameOpen] = useState(false);

  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('USER');

  // Notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch users (enabled only for ADMINs)
  const { 
    data: users, 
    isLoading: isUsersLoading, 
    error: fetchError 
  } = useQuery({
    queryKey: ['users'],
    queryFn: apiClient.getUsers,
    refetchInterval: 5000,
    enabled: currentUser?.role === 'ADMIN',
  });

  // Fetch system config (available to all logged-in users)
  const {
    data: systemConfig,
    isLoading: isSystemLoading,
  } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: apiClient.getSystemConfig,
    enabled: !!currentUser,
  });

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: apiClient.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMsg('User created successfully');
      setIsCreateOpen(false);
      setUsername('');
      setPassword('');
      setRole('USER');
      clearMessagesAfterDelay();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create user');
    }
  });

  // Update Username Mutation
  const updateUsernameMutation = useMutation({
    mutationFn: ({ id, username }: { id: string; username: string }) => 
      apiClient.updateUsername(id, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMsg('Username updated successfully');
      setIsUsernameOpen(false);
      setNewUsername('');
      clearMessagesAfterDelay();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update username');
    }
  });

  // Update Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => 
      apiClient.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMsg('User role updated successfully');
      setIsRoleOpen(false);
      clearMessagesAfterDelay();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update user role');
    }
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => 
      apiClient.resetUserPassword(id, password),
    onSuccess: () => {
      setSuccessMsg('User password reset successfully');
      setIsResetOpen(false);
      setNewPassword('');
      clearMessagesAfterDelay();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to reset user password');
    }
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteUser,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMsg('User deleted successfully');
      clearMessagesAfterDelay();
      
      if (selectedUser && selectedUser.id === variables) {
        logout();
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to delete user');
    }
  });

  const clearMessagesAfterDelay = () => {
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    createMutation.mutate({ username, password, role });
  };

  const handleUpdateUsername = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (selectedUser) {
      updateUsernameMutation.mutate({ id: selectedUser.id, username: newUsername });
    }
  };

  const handleUpdateRole = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (selectedUser) {
      updateRoleMutation.mutate({ id: selectedUser.id, role: newRole });
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (selectedUser) {
      resetPasswordMutation.mutate({ id: selectedUser.id, password: newPassword });
    }
  };

  const handleDelete = (id: string, name: string) => {
    let confirmMsg = `Are you sure you want to delete user "${name}"?`;
    if (name === currentUser?.username) {
      confirmMsg = `WARNING: You are deleting your own logged-in user account. You will be logged out immediately. Proceed?`;
    }
    if (confirm(confirmMsg)) {
      setErrorMsg(null);
      setSelectedUser(users?.find(u => u.id === id));
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gray-50 border border-[var(--card-border)] rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-[var(--primary)] rounded-2xl">
            <Settings className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">System Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Configure profile details, inspect system configs, and manage accounts.</p>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-2 p-1.5 bg-gray-200/60 w-fit rounded-2xl border border-gray-300">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profile'
              ? 'bg-white text-blue-600 shadow border border-gray-200/80 scale-[1.02]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
          }`}
        >
          <User className="w-4 h-4" />
          My Profile
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'system'
              ? 'bg-white text-blue-600 shadow border border-gray-200/80 scale-[1.02]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
          }`}
        >
          <Server className="w-4 h-4" />
          System Configuration
        </button>

        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-white text-blue-600 shadow border border-gray-200/80 scale-[1.02]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
            }`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>
        )}
      </div>

      {/* Status Notifications */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold animate-bounce">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-bold">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB CONTENT: PROFILE */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl shadow-xl border border-slate-700 relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute right-0 bottom-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute left-10 top-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>

            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
              <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-2xl font-black shadow-lg border-2 border-white/20">
                {currentUser?.username?.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-center sm:text-left space-y-1.5">
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <h3 className="text-2xl font-black tracking-tight">{currentUser?.username}</h3>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    currentUser?.role === 'ADMIN' 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {currentUser?.role} Account
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {currentUser?.role === 'ADMIN' 
                    ? 'Superuser permissions: allowed to read, write, build, deploy, and administer users.' 
                    : 'Developer permissions: allowed to run builds and deploy stacks to target environments.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border border-[var(--card-border)] rounded-2xl shadow-sm space-y-4">
            <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
              <Shield className="w-5 h-5 text-blue-500" />
              Credentials & Security
            </h4>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                Your credentials are secured with salted BCrypt hashing.
              </p>
              {currentUser?.role === 'ADMIN' ? (
                <p className="text-xs text-blue-600 font-bold">
                  As an Administrator, you can update your own username, password, or security role under the <strong>User Management</strong> tab.
                </p>
              ) : (
                <p className="text-xs text-amber-600/90 font-bold">
                  To change your account name, reset your password, or request Administrator permissions, please contact your systems administrator.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SYSTEM CONFIGURATIONS */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {isSystemLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 font-mono text-xs animate-pulse">Fetching environment config...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Build Settings Card */}
              <div className="p-6 bg-white border border-[var(--card-border)] rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">Build Engine Limits</h3>
                  </div>
                  <hr className="border-gray-100" />
                  <div className="space-y-3 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Max Concurrent Builds</span>
                      <span className="text-gray-900 font-bold font-mono">{systemConfig?.maxConcurrentBuilds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Build Timeout Limit</span>
                      <span className="text-gray-900 font-bold font-mono">{systemConfig?.buildTimeoutSeconds}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Allocated Build Memory</span>
                      <span className="text-gray-900 font-bold font-mono uppercase">{systemConfig?.containerMemory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Allocated Build CPUs</span>
                      <span className="text-gray-900 font-bold font-mono">{systemConfig?.containerCpus} Core(s)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Docker Environment Card */}
              <div className="p-6 bg-white border border-[var(--card-border)] rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
                      <Activity className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">Docker Daemon Sidecar</h3>
                  </div>
                  <hr className="border-gray-100" />
                  <div className="space-y-3 text-xs font-semibold">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500">Docker Host URL</span>
                      <span className="text-gray-900 font-bold font-mono break-all bg-gray-50 p-2 rounded border border-gray-100">{systemConfig?.dockerHost}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-500">BuildKit Acceleration</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        systemConfig?.buildkitEnabled 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {systemConfig?.buildkitEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registry Store Card */}
              <div className="p-6 bg-white border border-[var(--card-border)] rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">Registry Store</h3>
                  </div>
                  <hr className="border-gray-100" />
                  <div className="space-y-3 text-xs font-semibold">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500">Storage Base Path</span>
                      <span className="text-gray-900 font-bold font-mono break-all bg-gray-50 p-2 rounded border border-gray-100">{systemConfig?.artifactStorePath}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-500">Artifact Retention Policy</span>
                      <span className="text-gray-900 font-black font-mono">{systemConfig?.artifactRetentionDays} Days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Profile Info */}
              <div className="p-6 bg-white border border-[var(--card-border)] rounded-2xl shadow-sm hover:shadow-md transition-all md:col-span-2 lg:col-span-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-500" />
                      Active Profiles
                    </h3>
                    <p className="text-xs text-gray-500 font-semibold">Active runtime environments loaded by the Spring Container.</p>
                  </div>
                  <div className="flex gap-2">
                    {systemConfig?.activeProfiles && systemConfig.activeProfiles.length > 0 ? (
                      systemConfig.activeProfiles.map((p: string) => (
                        <span 
                          key={p} 
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            p === 'dev' 
                              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-full text-[10px] font-bold">
                        default (production)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: USER MANAGEMENT (ADMIN ONLY) */}
      {activeTab === 'users' && currentUser?.role === 'ADMIN' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-gray-50 p-4 border border-gray-200 rounded-xl">
            <span className="text-xs font-semibold text-gray-500">Perform user creation, deletions, password resets, and role assignments.</span>
            <button
              onClick={() => {
                setErrorMsg(null);
                setIsCreateOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create New User
            </button>
          </div>

          <div className="p-6 bg-white border border-[var(--card-border)] rounded-2xl shadow-sm">
            {isUsersLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[20vh] gap-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-mono text-xs">Loading user registry...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-wider">
                      <th className="pb-4">Username</th>
                      <th className="pb-4">Security Role</th>
                      <th className="pb-4">Created At</th>
                      <th className="pb-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {users && users.length > 0 ? (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 font-bold text-gray-900">{u.username}</td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              u.role === 'ADMIN' 
                                ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-4 text-xs font-mono text-gray-500">
                            {u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setNewUsername(u.username);
                                setErrorMsg(null);
                                setIsUsernameOpen(true);
                              }}
                              className="p-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-gray-600 hover:text-blue-600 rounded-lg transition-colors inline-flex items-center justify-center shadow-sm"
                              title="Edit Username"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setNewRole(u.role);
                                setErrorMsg(null);
                                setIsRoleOpen(true);
                              }}
                              className="p-2 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-200 text-gray-600 hover:text-purple-600 rounded-lg transition-colors inline-flex items-center justify-center shadow-sm"
                              title="Change Role"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setErrorMsg(null);
                                setIsResetOpen(true);
                              }}
                              className="p-2 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-200 text-gray-600 hover:text-amber-600 rounded-lg transition-colors inline-flex items-center justify-center shadow-sm"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(u.id, u.username)}
                              className="p-2 bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 text-red-600 hover:text-white rounded-lg transition-colors inline-flex items-center justify-center shadow-sm"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500 font-mono text-xs">
                          No users registered in the system.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-zoomIn">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">Create New User Account</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-2xl px-4 py-3 text-sm text-gray-900 outline-none transition-all font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter initial password"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-2xl px-4 py-3 text-sm text-gray-900 outline-none transition-all font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Security Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-2xl px-4 py-3 text-sm text-gray-900 outline-none transition-all font-bold"
                >
                  <option value="USER">USER (Developer/Operator)</option>
                  <option value="ADMIN">ADMIN (Full Access)</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE USERNAME MODAL */}
      {isUsernameOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-zoomIn">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">Update Username</h3>
              <button onClick={() => setIsUsernameOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUsername} className="p-6 space-y-4">
              <p className="text-xs text-gray-500 font-semibold">
                Changing username for <span className="font-bold text-gray-800">"{selectedUser.username}"</span>:
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-2xl px-4 py-3 text-sm text-gray-900 outline-none transition-all font-semibold"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUsernameOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUsernameMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow disabled:opacity-50"
                >
                  {updateUsernameMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE ROLE MODAL */}
      {isRoleOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-zoomIn">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">Update Security Role</h3>
              <button onClick={() => setIsRoleOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateRole} className="p-6 space-y-4">
              <p className="text-xs text-gray-500 font-semibold">
                Modifying permissions for user <span className="font-bold text-gray-800">"{selectedUser.username}"</span>:
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Security Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-2xl px-4 py-3 text-sm text-gray-900 outline-none transition-all font-bold"
                >
                  <option value="USER">USER (Developer/Operator)</option>
                  <option value="ADMIN">ADMIN (Full Access)</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRoleOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateRoleMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow disabled:opacity-50"
                >
                  {updateRoleMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-zoomIn">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">Reset Account Password</h3>
              <button onClick={() => setIsResetOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-xs text-gray-500 font-semibold">
                Setting a new credentials password for user <span className="font-bold text-gray-800">"{selectedUser.username}"</span>:
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-2xl px-4 py-3 text-sm text-gray-900 outline-none transition-all font-semibold"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow disabled:opacity-50"
                >
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
