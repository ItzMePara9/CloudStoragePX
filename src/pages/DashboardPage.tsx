import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Folder,
  FileText,
  Upload,
  FolderPlus,
  ArrowUpRight,
  Clock,
  Sparkles,
  Image,
  Video,
  Music,
  Archive,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUpload } from '../context/UploadContext';
import { StorageStats, FileItem } from '../types';
import { formatBytes, formatDate } from '../utils/format';
import { Header } from '../components/layout/Header';
import { FileCard } from '../components/files/FileCard';
import { FilePreviewModal } from '../components/modals/FilePreviewModal';
import { NewFolderModal } from '../components/modals/NewFolderModal';

interface DashboardPageProps {
  onNavigate: (path: string, folderId?: string | null) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user } = useAuth();
  const { uploadFiles } = useUpload();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<FileItem | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files, null, loadStats);
      e.target.value = '';
    }
  };

  const handleCreateFolder = async (name: string) => {
    await api.createFolder(name, null);
    loadStats();
  };

  const used = stats?.storageUsed || user?.storage_used || 0;
  const quota = stats?.storageQuota || user?.storage_quota || 1;
  const percent = Math.min(100, Math.round((used / quota) * 100));

  const categories = [
    { label: 'Images', icon: Image, color: 'text-emerald-400', bg: 'bg-emerald-500/10', data: stats?.breakdown.images },
    { label: 'Documents', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', data: stats?.breakdown.documents },
    { label: 'Videos', icon: Video, color: 'text-purple-400', bg: 'bg-purple-500/10', data: stats?.breakdown.videos },
    { label: 'Audio', icon: Music, color: 'text-pink-400', bg: 'bg-pink-500/10', data: stats?.breakdown.audio },
    { label: 'Archives', icon: Archive, color: 'text-amber-400', bg: 'bg-amber-500/10', data: stats?.breakdown.archives },
    { label: 'Others', icon: FileCode, color: 'text-indigo-400', bg: 'bg-indigo-500/10', data: stats?.breakdown.others },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard"
        onOpenNewFolder={() => setIsFolderModalOpen(true)}
        onRefresh={loadStats}
      />

      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>AES-256-GCM Authenticated Vault</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Welcome back, {user?.username}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 max-w-xl">
                Your private storage is protected with hardware-accelerated encryption at rest. Manage, stream, and share files with complete operational ownership.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Files
              </button>
              <button
                onClick={() => setIsFolderModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700/80 transition-colors"
              >
                <FolderPlus className="w-4 h-4 text-indigo-400" />
                New Folder
              </button>
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Storage Used */}
          <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Storage</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-white font-mono tabular-nums">
                {formatBytes(used)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                of {formatBytes(quota)} allocated quota ({percent}%)
              </p>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  percent > 90 ? 'bg-rose-500' : percent > 75 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Total Files */}
          <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Files</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-white font-mono tabular-nums">
                {stats?.totalFiles ?? 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Active files across all folders</p>
            </div>
          </div>

          {/* Total Folders */}
          <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Folders</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Folder className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-white font-mono tabular-nums">
                {stats?.totalFolders ?? 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Organized directory tree</p>
            </div>
          </div>

          {/* Trashed Items */}
          <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Trash Bin</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-white font-mono tabular-nums">
                {stats?.trashedCount ?? 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Items pending permanent purge</p>
            </div>
          </div>
        </div>

        {/* File Type Breakdown */}
        <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Storage Category Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time consumption across data formats
              </p>
            </div>
            <button
              onClick={() => onNavigate('/storage')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>View Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${c.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${c.color}`} />
                    </div>
                    <span className="text-xs font-medium text-slate-300">{c.label}</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white font-mono tabular-nums block">
                      {formatBytes(c.data?.bytes || 0)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {c.data?.count || 0} files
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Uploads Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Recent Uploads</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Your latest stored files ready for access
              </p>
            </div>
            <button
              onClick={() => onNavigate('/files')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>View All Files</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats?.recentUploads && stats.recentUploads.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {stats.recentUploads.map((file) => (
                <FileCard
                  key={file.id}
                  item={file}
                  type="file"
                  isSelected={false}
                  onSelect={() => {}}
                  onClick={() => setSelectedFileForPreview(file)}
                  onDownload={() => {
                    window.location.href = `/api/files/${file.id}/download`;
                  }}
                  onStar={async () => {
                    await api.toggleStar(file.id);
                    loadStats();
                  }}
                  onTrash={async () => {
                    await api.trash(file.id, 'file');
                    loadStats();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
              <FolderPlus className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-medium text-slate-300">No uploads yet</h4>
              <p className="text-xs text-slate-400">
                Upload your first file or drag and drop items anywhere to get started.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl"
              >
                Upload File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!selectedFileForPreview}
        file={selectedFileForPreview}
        onClose={() => setSelectedFileForPreview(null)}
        onToggleStar={async (id) => {
          await api.toggleStar(id);
          loadStats();
        }}
      />

      {/* New Folder Modal */}
      <NewFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreate={handleCreateFolder}
      />
    </div>
  );
}
