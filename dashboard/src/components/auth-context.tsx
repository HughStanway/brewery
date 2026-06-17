'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/api/client';

interface User {
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkUserAuth = async () => {
    try {
      const data = await apiClient.getCurrentUser();
      setUser(data);
      if (pathname === '/login') {
        router.replace('/');
      }
    } catch (error) {
      setUser(null);
      if (pathname !== '/login') {
        router.replace('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUserAuth();
  }, [pathname]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiClient.login(username, password);
      setUser(data);
      router.replace('/');
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.logout();
    } catch (e) {
      // Ignore errors on logout
    } finally {
      setUser(null);
      setIsLoading(false);
      router.replace('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-mono text-sm animate-pulse">Authenticating session...</p>
      </div>
    );
  }

  // Prevent flash of authenticated content if not logged in
  if (!user && pathname !== '/login') {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
