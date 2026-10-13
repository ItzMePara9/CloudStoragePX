import React, { useState, useEffect } from 'react';
import { Folder, FolderInput, X, Home } from 'lucide-react';
import { api } from '../../api/client';
import { FolderItem } from '../../types';

interface MoveModalProps {
  isOpen: boolean;
  itemId: string;
  itemName: string;
  type: 'file' | 'folder';
  currentFolderId: string | null;
  onClose: () => void;
  onMoved: () => void;
}

export function MoveModal({
  isOpen,
  itemId,
  itemName,
  type,
  currentFolderId,
  onClose,
  onMoved,
}: MoveModalProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(null);
      setError(null);
      loadFolders();
    }
  }, [isOpen]);

  const loadFolders = async () => {
    try {
      setIsLoading(true);
      // Retrieve user's root folder list
      const res = await api.listFiles();
      // Filter out self if moving a folder
      const validFolders = res.folders.filter((f) => type !== 'folder' || f.id !== itemId);
      setFolders(validFolders);
    } catch (err: any) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleMove = async () => {
    if (selectedFolderId === currentFolderId) {
      onClose();
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await api.move(itemId, selectedFolderId, type);
      onMoved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-white">Move Item</h3>
              <p className="text-xs text-slate-400 truncate max-w-[260px]">{itemName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-2 max-h-60 overflow-y-auto pr-1">
          <p className="text-xs font-medium text-slate-400 mb-2">Select Destination Directory:</p>

          {/* Root option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
              selectedFolderId === null
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-sm font-medium">Root (My Files)</span>
          </button>

          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-500">Loading directories...</div>
          ) : (
            folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFolderId(f.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                  selectedFolderId === f.id
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-sm font-medium truncate">{f.name}</span>
              </button>
            ))
          )}
        </div>

        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-colors shadow-sm whitespace-nowrap"
          >
            {isSubmitting ? 'Moving...' : 'Move Here'}
          </button>
        </div>
      </div>
    </div>
  );
}
