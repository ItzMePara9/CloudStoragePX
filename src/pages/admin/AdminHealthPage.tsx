import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Cpu,
  Clock,
  HardDrive,
  ShieldCheck,
  Users,
  RotateCw,
} from 'lucide-react';
import { api } from '../../api/client';
import { SystemHealth } from '../../types';
import { formatBytes } from '../../utils/format';
import { Header } from '../../components/layout/Header';

export function AdminHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHealth = async () => {
    try {
      setIsLoading(true);
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="System Health" onRefresh={loadHealth} />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Runtime Telemetry & Health Diagnostics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time operational status of Node process, memory, SQLite engine, and encrypted vault storage.
            </p>
          </div>
          <button
            onClick={loadHealth}
            className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-900/60 rounded-2xl border border-slate-800" />
            ))}
          </div>
        ) : health ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Server Process */}
            <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-indigo-400" />
                  Node Runtime
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 rounded-md">
                  HEALTHY
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Node Version:</span>
                  <span className="font-mono text-white">{health.system.nodeVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">OS Architecture:</span>
                  <span className="font-mono text-white">{health.system.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Process Uptime:</span>
                  <span className="font-mono text-white tabular-nums">
                    {formatUptime(health.system.uptimeSeconds)}
                  </span>
                </div>
              </div>
            </div>

            {/* Memory & Compute */}
            <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  Memory & CPU
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {health.system.cpuCount} Cores
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Process RSS Memory:</span>
                  <span className="font-mono text-white tabular-nums">
                    {formatBytes(health.system.memoryRssBytes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">V8 Heap Allocation:</span>
                  <span className="font-mono text-white tabular-nums">
                    {formatBytes(health.system.memoryHeapUsedBytes)} / {formatBytes(health.system.memoryHeapTotalBytes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">System Free RAM:</span>
                  <span className="font-mono text-white tabular-nums">
                    {formatBytes(health.system.systemFreeMemoryBytes)}
                  </span>
                </div>
              </div>
            </div>

            {/* Storage Vault On-Disk */}
            <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-indigo-400" />
                  Encrypted Vault Disk
                </span>
                <span className="text-xs text-emerald-400 font-medium">AES-256-GCM</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Encrypted Disk Files:</span>
                  <span className="font-mono text-white tabular-nums">
                    {health.storage.vaultFileCount} files
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vault Physical Size:</span>
                  <span className="font-mono text-white tabular-nums">
                    {formatBytes(health.storage.vaultEncryptedBytes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SQLite Database Size:</span>
                  <span className="font-mono text-white tabular-nums">
                    {formatBytes(health.storage.databaseSizeBytes)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptography Stack */}
            <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Crypto Verification
                </span>
                <span className="text-xs text-emerald-400 font-medium">VERIFIED</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Payload Encryption</span>
                  <span className="font-mono text-slate-200">
                    {health.storage.encryptionAlgorithm}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Credential Hashing</span>
                  <span className="font-mono text-slate-200">
                    {health.storage.hashingAlgorithm}
                  </span>
                </div>
              </div>
            </div>

            {/* Users & Sessions */}
            <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  User Sessions
                </span>
                <span className="text-xs text-slate-400">Auth Pool</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Registered Users:</span>
                  <span className="font-mono text-white tabular-nums">
                    {health.users.totalUsers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Non-Suspended:</span>
                  <span className="font-mono text-white tabular-nums">
                    {health.users.activeUsers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Authenticated Sessions:</span>
                  <span className="font-mono text-white tabular-nums">
                    {health.users.activeSessions}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
