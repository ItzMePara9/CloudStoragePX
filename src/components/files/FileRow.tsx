import React from 'react';
import {
  Folder,
  Star,
  MoreVertical,
  Download,
  Share2,
  Edit3,
  FolderInput,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { FileItem, FolderItem } from '../../types';
import { formatBytes, formatDate } from '../../utils/format';
import { getFileCategoryIcon } from './FileCard';

interface FileRowProps {
  item: FileItem | FolderItem;
  type: 'file' | 'folder';
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onStar?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  isTrashView?: boolean;
}

export function FileRow({
  item,
  type,
  isSelected,
  onSelect,
  onClick,
  onDownload,
  onShare,
  onRename,
  onMove,
  onStar,
  onTrash,
  onRestore,
  onPermanentDelete,
  isTrashView = false,
}: FileRowProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isFolder = type === 'folder';
  const file = isFolder ? null : (item as FileItem);
  const fileIconInfo = file
    ? getFileCategoryIcon(file.mime_type, file.name)
    : { icon: Folder, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  const Icon = fileIconInfo.icon;

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between px-4 py-2.5 rounded-xl border transition-colors cursor-pointer select-none text-xs ${
        isSelected
          ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
          : 'bg-[#0f172a]/50 hover:bg-[#131d35] border-slate-850 hover:border-slate-800 text-slate-300'
      }`}
    >
      {/* Checkbox + Icon + Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
            isSelected
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-slate-700 bg-slate-900/60 opacity-0 group-hover:opacity-100 hover:border-indigo-400'
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
              <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
            </svg>
          )}
        </div>

        <div className={`p-1.5 rounded-lg shrink-0 ${fileIconInfo.bg}`}>
          <Icon className={`w-4 h-4 ${fileIconInfo.color}`} />
        </div>

        <span className="font-medium text-white truncate max-w-sm sm:max-w-md">{item.name}</span>
      </div>

      {/* Type & Size */}
      <div className="hidden md:flex items-center gap-6 text-slate-400 font-mono tabular-nums shrink-0">
        <span className="w-24 text-right truncate">
          {file ? formatBytes(file.size) : 'Folder'}
        </span>
        <span className="w-36 text-right truncate">
          {formatDate(file ? file.updated_at : item.updated_at)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 ml-4">
        {file && onStar && !isTrashView && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStar();
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              file.is_favorite
                ? 'text-amber-400'
                : 'text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-300'
            }`}
            title="Toggle Favorite"
          >
            <Star className={`w-3.5 h-3.5 ${file.is_favorite ? 'fill-amber-400' : ''}`} />
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-30 divide-y divide-slate-800/80 animate-in zoom-in-95 duration-100"
            >
              {!isTrashView ? (
                <>
                  <div className="space-y-0.5">
                    {file && onDownload && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDownload();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        Download
                      </button>
                    )}
                    {file && onShare && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onShare();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left"
                      >
                        <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                        Share Link
                      </button>
                    )}
                  </div>
                  <div className="py-0.5 space-y-0.5">
                    {onRename && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onRename();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        Rename
                      </button>
                    )}
                    {onMove && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onMove();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left"
                      >
                        <FolderInput className="w-3.5 h-3.5 text-slate-400" />
                        Move
                      </button>
                    )}
                  </div>
                  {onTrash && (
                    <div className="pt-0.5">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onTrash();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Move to Trash
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-0.5">
                  {onRestore && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onRestore();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors text-left"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                  )}
                  {onPermanentDelete && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onPermanentDelete();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Permanently
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
