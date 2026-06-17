'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/auth-context';
import { Activity, Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-2xl p-8 md:p-10 space-y-8">
        
        {/* Header/Brand */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300">
            <Activity className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">BREWERY</h1>
            <p className="text-sm text-gray-500 mt-1.5 font-medium">
              Supply Chain & Deployment Platform
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-semibold animate-shake">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter your username"
                className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:bg-white rounded-2xl pl-12 pr-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all font-semibold shadow-sm"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter your password"
                className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:bg-white rounded-2xl pl-12 pr-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all font-semibold shadow-sm"
              />
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-[var(--primary)] text-white font-bold py-4 px-6 rounded-2xl text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing In...
              </>
            ) : (
              'Sign In to Platform'
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-mono">
            Default credentials: <span className="font-bold text-gray-500">admin / admin</span>
          </p>
        </div>
      </div>
    </div>
  );
}
