import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Clock,
  Star,
  Share2,
  Trash2,
  PieChart,
  Users,
  Settings,
  ShieldCheck,
  Activity,
  HardDrive,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatBytes } from '../../utils/format';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ currentPath, onNavigate, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { user, branding, logout } = useAuth();

  const mainNav = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Files', path: '/files', icon: FolderOpen },
    { label: 'Recent', path: '/recent', icon: Clock },
    { label: 'Favorites', path: '/favorites', icon: Star },
    { label: 'Shared Links', path: '/shared', icon: Share2 },
    { label: 'Trash', path: '/trash', icon: Trash2 },
    { label: 'Storage Analytics', path: '/storage', icon: PieChart },
  ];

  const adminNav = [
    { label: 'User Accounts', path: '/admin/users', icon: Users },
    { label: 'Owner Settings', path: '/admin/settings', icon: Settings },
    { label: 'Audit Logs', path: '/admin/logs', icon: ShieldCheck },
    { label: 'System Health', path: '/admin/health', icon: Activity },
  ];

  const isAdminOrOwner = user?.role === 'owner' || user?.role === 'admin';
  const used = user?.storage_used || 0;
  const quota = user?.storage_quota || 1;
  const usagePercent = Math.min(100, Math.round((used / quota) * 100));

  return (
    <aside
      className={`relative flex flex-col h-screen border-r border-slate-800/80 bg-[#0b0f19] text-slate-300 transition-all duration-200 select-none z-30 shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 shrink-0">
        <button
          onClick={() => onNavigate('/dashboard')}
          className="flex items-center gap-3 text-left overflow-hidden group"
        >
          <img
            src={branding?.logoUrl || '/logo.png'}
            alt="CloudStoragePX"
            className="w-9 h-9 rounded-xl object-contain shrink-0 shadow-xs border border-indigo-500/20"
          />
          {!isCollapsed && (
            <div className="truncate">
              <span className="font-bold text-sm text-white tracking-tight block">
                {branding?.appName || 'CloudStoragePX'}
              </span>
              <span className="text-[11px] text-slate-400 truncate block">
                {branding?.tagline || 'Your Cloud. Your Control.'}
              </span>
            </div>
          )}
        </button>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Section */}
        <div>
          {!isCollapsed && (
            <p className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Storage
            </p>
          )}
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Administration Section (If permitted) */}
        {isAdminOrOwner && (
          <div>
            {!isCollapsed && (
              <p className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Management
              </p>
            )}
            <nav className="space-y-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => onNavigate(item.path)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Storage Quota Gauge (When not collapsed) */}
      {!isCollapsed && (
        <div className="p-3 mx-3 mb-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              Storage Used
            </span>
            <span className="font-mono tabular-nums text-slate-400">{usagePercent}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                usagePercent > 90
                  ? 'bg-rose-500'
                  : usagePercent > 75
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
            <span>{formatBytes(used)}</span>
            <span>{formatBytes(quota)}</span>
          </div>
        </div>
      )}

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 shrink-0">
        <div className={`flex items-center justify-between ${isCollapsed ? 'flex-col gap-2' : ''}`}>
          <button
            onClick={() => onNavigate('/settings')}
            className={`flex items-center gap-2.5 text-left truncate hover:opacity-80 transition-opacity ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold text-xs flex items-center justify-center shrink-0">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <span className="text-xs font-semibold text-white truncate block">
                  {user?.username}
                </span>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                  {user?.role}
                </span>
              </div>
            )}
          </button>

          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
