import React, { useState, useEffect } from 'react';
import { Clock, Star, Download, RotateCw } from 'lucide-react';
import { api } from '../api/client';
import { FileItem } from '../types';
import { Header } from '../components/layout/Header';
import { FileCard } from '../components/files/FileCard';
import { FilePreviewModal } from '../components/modals/FilePreviewModal';

export function RecentPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const loadRecent = async () => {
    try {
      setIsLoading(true);
      const res = await api.getRecent();
      setFiles(res.files);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Recent Files" onRefresh={loadRecent} />

      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto w-full flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Files accessed or uploaded recently across all directories
          </p>
          <button
            onClick={loadRecent}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 bg-slate-900/60 rounded-2xl border border-slate-800/80" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
            <Clock className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No recent activity</h3>
            <p className="text-xs text-slate-400">
              Files you upload or view will appear here for fast access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {files.map((file) => (
              <FileCard
                key={file.id}
                item={file}
                type="file"
                isSelected={false}
                onSelect={() => {}}
                onClick={() => setPreviewFile(file)}
                onDownload={() => {
                  window.location.href = `/api/files/${file.id}/download`;
                }}
                onStar={async () => {
                  await api.toggleStar(file.id);
                  loadRecent();
                }}
                onTrash={async () => {
                  await api.trash(file.id, 'file');
                  loadRecent();
                }}
              />
            ))}
          </div>
        )}
      </div>

      <FilePreviewModal
        isOpen={!!previewFile}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onToggleStar={async (id) => {
          await api.toggleStar(id);
          loadRecent();
        }}
      />
    </div>
  );
}
