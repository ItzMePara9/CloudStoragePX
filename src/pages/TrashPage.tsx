import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, RotateCw } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { FileItem, FolderItem } from '../types';
import { Header } from '../components/layout/Header';
import { FileCard } from '../components/files/FileCard';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';

export function TrashPage() {
  const { success, error: toastError } = useToast();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEmptyTrashConfirmOpen, setIsEmptyTrashConfirmOpen] = useState(false);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);

  const loadTrash = async () => {
    try {
      setIsLoading(true);
      const res = await api.getTrash();
      setFolders(res.folders);
      setFiles(res.files);
    } catch (err: any) {
      toastError(err.message || 'Failed to load trash');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const handleEmptyTrash = async () => {
    try {
      const res = await api.emptyTrash();
      success(`Emptied trash (${res.deletedCount} files purged)`);
      setIsEmptyTrashConfirmOpen(false);
      loadTrash();
    } catch (err: any) {
      toastError(err.message || 'Failed to empty trash');
    }
  };

  const handleRestore = async (id: string, type: 'file' | 'folder') => {
    try {
      await api.restore(id, type);
      success(`Restored ${type}`);
      loadTrash();
    } catch (err: any) {
      toastError(err.message || 'Failed to restore item');
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    try {
      await api.permanentDelete(permanentDeleteTarget.id, permanentDeleteTarget.type);
      success(`Permanently deleted ${permanentDeleteTarget.type}`);
      setPermanentDeleteTarget(null);
      loadTrash();
    } catch (err: any) {
      toastError(err.message || 'Failed to permanently delete item');
    }
  };

  const hasItems = folders.length > 0 || files.length > 0;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Trash" onRefresh={loadTrash} />

      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto w-full flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Items in trash remain encrypted in your vault until permanently deleted or restored
          </p>
          <div className="flex items-center gap-2">
            {hasItems && (
              <button
                onClick={() => setIsEmptyTrashConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Empty Trash
              </button>
            )}
            <button
              onClick={loadTrash}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 bg-slate-900/60 rounded-2xl border border-slate-800/80" />
            ))}
          </div>
        ) : !hasItems ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
            <Trash2 className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">Trash is empty</h3>
            <p className="text-xs text-slate-400">
              Items you delete from "My Files" will appear here for 30 days before permanent cleanup.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {folders.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Folders in Trash ({folders.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {folders.map((folder) => (
                    <FileCard
                      key={folder.id}
                      item={folder}
                      type="folder"
                      isSelected={false}
                      onSelect={() => {}}
                      onClick={() => {}}
                      isTrashView={true}
                      onRestore={() => handleRestore(folder.id, 'folder')}
                      onPermanentDelete={() =>
                        setPermanentDeleteTarget({ id: folder.id, name: folder.name, type: 'folder' })
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Files in Trash ({files.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {files.map((file) => (
                    <FileCard
                      key={file.id}
                      item={file}
                      type="file"
                      isSelected={false}
                      onSelect={() => {}}
                      onClick={() => {}}
                      isTrashView={true}
                      onRestore={() => handleRestore(file.id, 'file')}
                      onPermanentDelete={() =>
                        setPermanentDeleteTarget({ id: file.id, name: file.name, type: 'file' })
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty Trash Confirmation */}
      <ConfirmDialog
        isOpen={isEmptyTrashConfirmOpen}
        title="Empty Trash Bin"
        message="Are you sure you want to permanently delete all items in your trash bin? This will shred and remove all encrypted files from the vault and cannot be undone."
        confirmLabel="Purge Everything"
        isDestructive={true}
        onCancel={() => setIsEmptyTrashConfirmOpen(false)}
        onConfirm={handleEmptyTrash}
      />

      {/* Permanent Delete Item Confirmation */}
      {permanentDeleteTarget && (
        <ConfirmDialog
          isOpen={true}
          title={`Permanently Delete ${permanentDeleteTarget.type === 'folder' ? 'Folder' : 'File'}`}
          message={`Are you sure you want to permanently delete "${permanentDeleteTarget.name}"? This file will be unrecoverable.`}
          confirmLabel="Delete Permanently"
          isDestructive={true}
          onCancel={() => setPermanentDeleteTarget(null)}
          onConfirm={handlePermanentDelete}
        />
      )}
    </div>
  );
}
