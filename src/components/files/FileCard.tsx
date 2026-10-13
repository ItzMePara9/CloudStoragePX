import React from 'react';
import {
  Folder,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  FileCode,
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
import { formatBytes, formatTimeAgo } from '../../utils/format';

export function getFileCategoryIcon(mimeType: string, name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return { icon: Image, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  }
  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext)) {
    return { icon: Video, color: 'text-purple-400', bg: 'bg-purple-500/10' };
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(ext)) {
    return { icon: Music, color: 'text-pink-400', bg: 'bg-pink-500/10' };
  }
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    ['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)
  ) {
    return { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' };
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return { icon: Archive, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  }
  return { icon: FileCode, color: 'text-indigo-400', bg: 'bg-indigo-500/10' };
}

interface FileCardProps {
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

export function FileCard({
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
}: FileCardProps) {
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
      className={`group relative rounded-2xl p-4 border transition-all duration-150 cursor-pointer select-none ${
        isSelected
          ? 'bg-indigo-950/40 border-indigo-500/60 shadow-indigo-500/10 shadow-lg ring-1 ring-indigo-500'
          : 'bg-[#0f172a]/70 hover:bg-[#131d35] border-slate-800/80 hover:border-slate-700/80 shadow-xs'
      }`}
    >
      {/* Top action row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-slate-700 bg-slate-900/60 opacity-0 group-hover:opacity-100 hover:border-indigo-400'
          }`}
        >
          {isSelected && (
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
            </svg>
          )}
        </div>

        <div className="flex items-center gap-1">
          {file && onStar && !isTrashView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStar();
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                file.is_favorite
                  ? 'text-amber-400'
                  : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-200'
              }`}
              title="Toggle Favorite"
            >
              <Star className={`w-4 h-4 ${file.is_favorite ? 'fill-amber-400' : ''}`} />
            </button>
          )}

          {/* More options menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Actions"
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

      {/* Center Icon or Preview Thumbnail */}
      <div className="flex items-center justify-center h-20 mb-3">
        {file && file.mime_type.startsWith('image/') ? (
          <img
            src={`/api/files/${file.id}/preview`}
            alt={file.name}
            className="h-full max-w-full object-cover rounded-xl border border-slate-800 shadow-xs"
            loading="lazy"
          />
        ) : (
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${fileIconInfo.bg}`}>
            <Icon className={`w-7 h-7 ${fileIconInfo.color}`} />
          </div>
        )}
      </div>

      {/* Info bottom */}
      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-white truncate" title={item.name}>
          {item.name}
        </h4>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
          <span>{file ? formatBytes(file.size) : 'Folder'}</span>
          <span>{formatTimeAgo(file ? file.updated_at : item.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
