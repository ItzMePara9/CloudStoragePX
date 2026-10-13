import React, { useState, useEffect } from 'react';
import { Star, RotateCw } from 'lucide-react';
import { api } from '../api/client';
import { FileItem } from '../types';
import { Header } from '../components/layout/Header';
import { FileCard } from '../components/files/FileCard';
import { FilePreviewModal } from '../components/modals/FilePreviewModal';

export function FavoritesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const res = await api.getFavorites();
      setFiles(res.files);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Favorites" onRefresh={loadFavorites} />

      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto w-full flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Files starred for quick access and priority reference
          </p>
          <button
            onClick={loadFavorites}
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
            <Star className="w-10 h-10 text-amber-500/40 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No favorite files</h3>
            <p className="text-xs text-slate-400">
              Click the star icon on any file to bookmark it here for quick access.
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
                  loadFavorites();
                }}
                onTrash={async () => {
                  await api.trash(file.id, 'file');
                  loadFavorites();
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
          loadFavorites();
        }}
      />
    </div>
  );
}
