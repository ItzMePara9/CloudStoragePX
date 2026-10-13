import React, { useState, useEffect, useRef } from 'react';
import { Edit3, X } from 'lucide-react';

interface RenameModalProps {
  isOpen: boolean;
  currentName: string;
  type: 'file' | 'folder';
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
}

export function RenameModal({ isOpen, currentName, type, onClose, onRename }: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setError(null);
      setIsSubmitting(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Select base name without extension for files
          if (type === 'file' && currentName.includes('.')) {
            const dotIdx = currentName.lastIndexOf('.');
            inputRef.current.setSelectionRange(0, dotIdx);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isOpen, currentName, type]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    if (name.trim() === currentName) {
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onRename(name.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to rename');
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
              <Edit3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold tracking-tight text-white">
              Rename {type === 'folder' ? 'Folder' : 'File'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">New Name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-colors shadow-sm whitespace-nowrap"
            >
              {isSubmitting ? 'Saving...' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
