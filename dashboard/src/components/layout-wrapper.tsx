'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { 
  LayoutGrid, 
  Hammer, 
  Package, 
  GitFork, 
  RefreshCw,
  Settings,
  Activity,
  Terminal,
  BookOpen,
  Rocket
} from 'lucide-react';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutGrid },
    { name: 'Builds', href: '/builds', icon: Hammer },
    { name: 'Artifact Registry', href: '/artifacts', icon: Package },
    { name: 'Dependencies', href: '/dependencies', icon: GitFork },
    { name: 'Cascade Rebuilds', href: '/cascade', icon: RefreshCw },
    { name: 'Deployments', href: '/deployments', icon: Rocket },
    { name: 'Documentation', href: '/docs', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-[var(--card-border)] bg-[var(--card)] flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-8 h-full">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg text-gray-900 tracking-tight">BREWERY</span>
          </div>

          {/* Horizontal Nav Links */}
          <nav className="hidden xl:flex h-full items-center space-x-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 h-full px-3 border-b-2 text-sm font-semibold transition-all ${
                    isActive 
                      ? 'border-[var(--primary)] text-[var(--primary)]' 
                      : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--primary)]' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                {user.username} ({user.role})
              </span>
              <button
                onClick={logout}
                className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 px-3 py-1.5 rounded-full transition-all duration-200 shadow-sm active:scale-95"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
