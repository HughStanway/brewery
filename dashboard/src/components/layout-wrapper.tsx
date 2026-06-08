'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, 
  Hammer, 
  Package, 
  GitFork, 
  RefreshCw,
  Settings,
  Activity,
  Terminal,
  BookOpen
} from 'lucide-react';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutGrid },
    { name: 'Builds', href: '/builds', icon: Hammer },
    { name: 'Artifact Registry', href: '/artifacts', icon: Package },
    { name: 'Dependencies', href: '/dependencies', icon: GitFork },
    { name: 'Cascade Rebuilds', href: '/cascade', icon: RefreshCw },
    { name: 'Documentation', href: '/docs', icon: BookOpen },
  ];

  return (
    <div className="flex min-h-screen bg-[#0b0f19]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1e293b] bg-[#0d1325] flex flex-col z-20">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[#1e293b]">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-wide block">BREWERY</span>
            <span className="text-[10px] text-blue-500 font-semibold tracking-wider uppercase block -mt-1">Build & Deploy</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner' 
                    : 'text-gray-400 hover:bg-[#151d30] hover:text-gray-200 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-200'
                }`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#1e293b] bg-[#0b0f19]/40 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
            <span className="pulse-dot"></span>
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest">Emulator Active</span>
          </div>
          <div className="text-[11px] text-gray-500 px-2 font-mono">
            Platform: v0.1.0
          </div>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#1e293b] bg-[#0d1325]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-500" />
            <h1 className="text-sm font-semibold text-gray-300 font-mono">
              {pathname === '/' ? 'dashboard' : pathname.substring(1).replace(/\//g, ' / ')}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
              dev mode
            </span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
