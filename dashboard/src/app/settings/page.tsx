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
  Edit2
} from 'lucide-react';

export default function SettingsPage() {
  const { user: currentUser, logout } = useAuth();
  const queryClient = useQueryClient();

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

  // Fetch users
  const { 
    data: users, 
    isLoading, 
    error: fetchError 
  } = useQuery({
    queryKey: ['users'],
    queryFn: apiClient.getUsers,
    refetchInterval: 5000,
    enabled: currentUser?.role === 'ADMIN',
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
      
      // If we deleted our own logged-in user account, log out immediately
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

  // Guard: Restrict non-admin users
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-8 bg-red-950/10 border border-red-500/20 rounded-2xl flex flex-col gap-4 max-w-2xl mx-auto mt-12">
        <div className="flex items-center gap-3 text-red-600">
          <ShieldAlert className="w-8 h-8" />
          <h2 className="text-xl font-bold">Access Denied</h2>
        </div>
        <p className="text-sm text-red-600/80 font-semibold leading-relaxed">
          You do not have the required permissions to access this page. User management features are strictly reserved for Administrator roles.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-mono text-sm animate-pulse">Loading users state...</p>
      </div>
    );
  }

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
    if (name === currentUser.username) {
      confirmMsg = `WARNING: You are deleting your own logged-in user account. You will be logged out immediately. Proceed?`;
    }
    if (confirm(confirmMsg)) {
      setErrorMsg(null);
      // Save user reference to check in onSuccess
      setSelectedUser(users?.find(u => u.id === id));
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gray-50 border border-[var(--card-border)] rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-[var(--primary)] rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">User Management</h2>
            <p className="text-sm text-gray-500 mt-1">Configure account access, credentials, and security roles.</p>
          </div>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setIsCreateOpen(true);
          }}
          className="bg-blue-600 hover:bg-[var(--primary)] text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Create New User
        </button>
      </div>

      {/* Status Notifications */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold animate-shake">
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

      {/* Users List Table */}
      <div className="p-6 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-gray-500 font-bold text-xs uppercase tracking-wider">
                <th className="pb-4">Username</th>
                <th className="pb-4">Security Role</th>
                <th className="pb-4">Created At</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)] text-sm">
              {users && users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
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
                      {/* Edit Username Button */}
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

                      {/* Change Role Button */}
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

                      {/* Reset Password Button */}
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

                      {/* Delete Button */}
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
                  <td colSpan={4} className="py-8 text-center text-gray-500 font-mono text-sm">
                    No users registered in system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
