import React, { useState, useEffect } from 'react';
import {
  PieChart,
  HardDrive,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  FileCode,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { api } from '../api/client';
import { StorageStats } from '../types';
import { formatBytes } from '../utils/format';
import { Header } from '../components/layout/Header';

export function StorageAnalyticsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const used = stats?.storageUsed || 0;
  const quota = stats?.storageQuota || 1;
  const percent = stats?.usagePercent || 0;

  const categories = [
    { label: 'Images', icon: Image, color: 'bg-emerald-500', textColor: 'text-emerald-400', count: stats?.breakdown.images.count || 0, bytes: stats?.breakdown.images.bytes || 0 },
    { label: 'Documents', icon: FileText, color: 'bg-blue-500', textColor: 'text-blue-400', count: stats?.breakdown.documents.count || 0, bytes: stats?.breakdown.documents.bytes || 0 },
    { label: 'Videos', icon: Video, color: 'bg-purple-500', textColor: 'text-purple-400', count: stats?.breakdown.videos.count || 0, bytes: stats?.breakdown.videos.bytes || 0 },
    { label: 'Audio', icon: Music, color: 'bg-pink-500', textColor: 'text-pink-400', count: stats?.breakdown.audio.count || 0, bytes: stats?.breakdown.audio.bytes || 0 },
    { label: 'Archives', icon: Archive, color: 'bg-amber-500', textColor: 'text-amber-400', count: stats?.breakdown.archives.count || 0, bytes: stats?.breakdown.archives.bytes || 0 },
    { label: 'Others', icon: FileCode, color: 'bg-indigo-500', textColor: 'text-indigo-400', count: stats?.breakdown.others.count || 0, bytes: stats?.breakdown.others.bytes || 0 },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Storage Analytics" onRefresh={loadStats} />

      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full flex-1">
        {/* Main Quota Gauge */}
        <div className="p-6 md:p-8 bg-[#0f172a]/90 border border-slate-800 rounded-3xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4" />
                Quota Allocation
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
                {formatBytes(used)} Used of {formatBytes(quota)}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
                {percent}%
              </span>
              <p className="text-xs text-slate-400">Total capacity utilized</p>
            </div>
          </div>

          {/* Segmented multi-color storage bar */}
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
            {categories.map((c) => {
              if (!used || !c.bytes) return null;
              const catPercent = (c.bytes / used) * 100;
              return (
                <div
                  key={c.label}
                  className={`h-full ${c.color} transition-all duration-300`}
                  style={{ width: `${catPercent}%` }}
                  title={`${c.label}: ${formatBytes(c.bytes)}`}
                />
              );
            })}
          </div>

          {/* Clean Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="flex items-center gap-2 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
                  <span className="text-slate-300 font-medium">{c.label}</span>
                  <span className="text-slate-500 font-mono tabular-nums">
                    {used > 0 ? Math.round((c.bytes / used) * 100) : 0}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Storage Breakdown by File Format</h3>
            <button
              onClick={loadStats}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  className="px-6 py-4 flex items-center justify-between text-xs hover:bg-slate-850/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">{c.label}</span>
                      <span className="text-slate-400 text-[11px] font-mono tabular-nums">
                        {c.count} items stored
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-white tabular-nums block">
                      {formatBytes(c.bytes)}
                    </span>
                    <span className="text-slate-400 text-[11px] font-mono tabular-nums">
                      {c.count > 0 ? formatBytes(Math.round(c.bytes / c.count)) : '0 B'} avg size
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cleanup Callout */}
        {stats && stats.trashedCount > 0 && (
          <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-amber-200">
                  {stats.trashedCount} items in Trash Bin
                </h4>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Items in your trash continue to count against your storage quota until permanently purged.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/trash')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition-colors shrink-0"
            >
              View Trash
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
