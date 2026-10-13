import React, { useRef } from 'react';
import {
  Search,
  Upload,
  FolderPlus,
  Sun,
  Moon,
  Menu,
  Shield,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUpload } from '../../context/UploadContext';

interface HeaderProps {
  title?: string;
  onSearchChange?: (term: string) => void;
  searchValue?: string;
  onOpenNewFolder?: () => void;
  currentFolderId?: string | null;
  onToggleMobileMenu?: () => void;
  onRefresh?: () => void;
}

export function Header({
  title = 'My Files',
  onSearchChange,
  searchValue = '',
  onOpenNewFolder,
  currentFolderId,
  onToggleMobileMenu,
  onRefresh,
}: HeaderProps) {
  const { isDark, setTheme } = useTheme();
  const { uploadFiles } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files, currentFolderId, onRefresh);
      e.target.value = '';
    }
  };

  return (
    <header className="h-16 px-4 md:px-6 border-b border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-20 shrink-0">
      {/* Zone 1: Mobile toggle + Page Title */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-base font-semibold text-white tracking-tight whitespace-nowrap">
          {title}
        </h1>
      </div>

      {/* Zone 2: Search */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search files and folders..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />

        {onOpenNewFolder && (
          <button
            onClick={onOpenNewFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">New Folder</span>
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-xs whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>

        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} theme`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
