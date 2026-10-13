import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  FileText,
  Upload,
  FolderPlus,
  LayoutGrid,
  List,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Trash2,
  Download,
  Share2,
  HardDrive,
  Home,
  CheckSquare,
  Square,
  RotateCw,
} from 'lucide-react';
import { api } from '../api/client';
import { useUpload } from '../context/UploadContext';
import { useToast } from '../context/ToastContext';
import { FileItem, FolderItem } from '../types';
import { Header } from '../components/layout/Header';
import { FileCard } from '../components/files/FileCard';
import { FileRow } from '../components/files/FileRow';
import { FilePreviewModal } from '../components/modals/FilePreviewModal';
import { NewFolderModal } from '../components/modals/NewFolderModal';
import { RenameModal } from '../components/modals/RenameModal';
import { MoveModal } from '../components/modals/MoveModal';
import { ShareModal } from '../components/modals/ShareModal';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';

interface FilesPageProps {
  initialFolderId?: string | null;
}

export function FilesPage({ initialFolderId = null }: FilesPageProps) {
  const { uploadFiles } = useUpload();
  const { success, error: toastError } = useToast();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'size' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Multi-selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.listFiles({
        folderId: currentFolderId,
        search: searchQuery,
        sort: sortField,
        order: sortOrder,
        filter: categoryFilter,
      });

      setFolders(res.folders);
      setFiles(res.files);
      setBreadcrumbs(res.breadcrumbs);
      setSelectedIds(new Set());
    } catch (err: any) {
      toastError(err.message || 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId, searchQuery, sortField, sortOrder, categoryFilter, toastError]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUploadInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files, currentFolderId, loadFiles);
      e.target.value = '';
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = [...folders.map((f) => f.id), ...files.map((f) => f.id)];
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleBatchTrash = async () => {
    try {
      for (const id of selectedIds) {
        const isF = folders.some((f) => f.id === id);
        await api.trash(id, isF ? 'folder' : 'file');
      }
      success(`Moved ${selectedIds.size} item(s) to trash`);
      loadFiles();
    } catch (err: any) {
      toastError(err.message || 'Batch trash operation failed');
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="My Files"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewFolder={() => setIsFolderModalOpen(true)}
        currentFolderId={currentFolderId}
        onRefresh={loadFiles}
      />

      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Navigation & Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs text-slate-400 py-1">
            <button
              onClick={() => setCurrentFolderId(null)}
              className="flex items-center gap-1 hover:text-white transition-colors shrink-0"
            >
              <Home className="w-3.5 h-3.5 text-indigo-400" />
              <span>Root</span>
            </button>
            {breadcrumbs.map((bc, idx) => {
              if (idx === 0) return null; // Root already shown
              return (
                <React.Fragment key={bc.id || idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    onClick={() => setCurrentFolderId(bc.id)}
                    className={`shrink-0 hover:text-white transition-colors truncate max-w-[120px] sm:max-w-xs ${
                      idx === breadcrumbs.length - 1 ? 'font-semibold text-white' : ''
                    }`}
                  >
                    {bc.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Multi-select indicator */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-xs text-indigo-200">
                <span>{selectedIds.size} selected</span>
                <button
                  onClick={handleBatchTrash}
                  className="hover:text-rose-400 p-0.5 transition-colors"
                  title="Move selected to trash"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="document">Documents</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="archive">Archives</option>
            </select>

            {/* Sort Order */}
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-') as [any, any];
                setSortField(f);
                setSortOrder(o);
              }}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="size-desc">Largest Size</option>
              <option value="size-asc">Smallest Size</option>
            </select>

            {/* View switcher (Grid vs List) */}
            <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={loadFiles}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content View */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-pulse">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-36 bg-slate-900/60 rounded-2xl border border-slate-800/80" />
            ))}
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-850 rounded-3xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <FolderPlus className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">This folder is empty</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Drag and drop files here to upload, or use the actions below.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleUploadInput}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Files
              </button>
              <button
                onClick={() => setIsFolderModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700/80"
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
                New Folder
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-6">
            {/* Folders Section */}
            {folders.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Folders ({folders.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {folders.map((folder) => (
                    <FileCard
                      key={folder.id}
                      item={folder}
                      type="folder"
                      isSelected={selectedIds.has(folder.id)}
                      onSelect={() => toggleSelect(folder.id)}
                      onClick={() => setCurrentFolderId(folder.id)}
                      onRename={() => setRenameTarget({ id: folder.id, name: folder.name, type: 'folder' })}
                      onMove={() => setMoveTarget({ id: folder.id, name: folder.name, type: 'folder' })}
                      onTrash={() => setDeleteConfirmTarget({ id: folder.id, name: folder.name, type: 'folder' })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Files Section */}
            {files.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Files ({files.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {files.map((file) => (
                    <FileCard
                      key={file.id}
                      item={file}
                      type="file"
                      isSelected={selectedIds.has(file.id)}
                      onSelect={() => toggleSelect(file.id)}
                      onClick={() => setPreviewFile(file)}
                      onDownload={() => {
                        window.location.href = `/api/files/${file.id}/download`;
                      }}
                      onShare={() => setShareFile(file)}
                      onRename={() => setRenameTarget({ id: file.id, name: file.name, type: 'file' })}
                      onMove={() => setMoveTarget({ id: file.id, name: file.name, type: 'file' })}
                      onStar={async () => {
                        await api.toggleStar(file.id);
                        loadFiles();
                      }}
                      onTrash={() => setDeleteConfirmTarget({ id: file.id, name: file.name, type: 'file' })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* List View */
          <div className="space-y-1">
            <div className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <button onClick={selectAll} className="text-slate-400 hover:text-white">
                  {selectedIds.size > 0 && selectedIds.size === (folders.length + files.length) ? (
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
                <span>Name</span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <span className="w-24 text-right">Size</span>
                <span className="w-36 text-right">Modified</span>
              </div>
              <span className="w-10 text-right">Actions</span>
            </div>

            {folders.map((folder) => (
              <FileRow
                key={folder.id}
                item={folder}
                type="folder"
                isSelected={selectedIds.has(folder.id)}
                onSelect={() => toggleSelect(folder.id)}
                onClick={() => setCurrentFolderId(folder.id)}
                onRename={() => setRenameTarget({ id: folder.id, name: folder.name, type: 'folder' })}
                onMove={() => setMoveTarget({ id: folder.id, name: folder.name, type: 'folder' })}
                onTrash={() => setDeleteConfirmTarget({ id: folder.id, name: folder.name, type: 'folder' })}
              />
            ))}

            {files.map((file) => (
              <FileRow
                key={file.id}
                item={file}
                type="file"
                isSelected={selectedIds.has(file.id)}
                onSelect={() => toggleSelect(file.id)}
                onClick={() => setPreviewFile(file)}
                onDownload={() => {
                  window.location.href = `/api/files/${file.id}/download`;
                }}
                onShare={() => setShareFile(file)}
                onRename={() => setRenameTarget({ id: file.id, name: file.name, type: 'file' })}
                onMove={() => setMoveTarget({ id: file.id, name: file.name, type: 'file' })}
                onStar={async () => {
                  await api.toggleStar(file.id);
                  loadFiles();
                }}
                onTrash={() => setDeleteConfirmTarget({ id: file.id, name: file.name, type: 'file' })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreate={async (name) => {
          await api.createFolder(name, currentFolderId);
          loadFiles();
        }}
      />

      <FilePreviewModal
        isOpen={!!previewFile}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onToggleStar={async (id) => {
          await api.toggleStar(id);
          loadFiles();
        }}
      />

      {renameTarget && (
        <RenameModal
          isOpen={true}
          currentName={renameTarget.name}
          type={renameTarget.type}
          onClose={() => setRenameTarget(null)}
          onRename={async (newName) => {
            await api.rename(renameTarget.id, newName, renameTarget.type);
            loadFiles();
          }}
        />
      )}

      {moveTarget && (
        <MoveModal
          isOpen={true}
          itemId={moveTarget.id}
          itemName={moveTarget.name}
          type={moveTarget.type}
          currentFolderId={currentFolderId}
          onClose={() => setMoveTarget(null)}
          onMoved={loadFiles}
        />
      )}

      <ShareModal
        isOpen={!!shareFile}
        file={shareFile}
        onClose={() => setShareFile(null)}
      />

      {deleteConfirmTarget && (
        <ConfirmDialog
          isOpen={true}
          title={`Move ${deleteConfirmTarget.type === 'folder' ? 'Folder' : 'File'} to Trash`}
          message={`Are you sure you want to move "${deleteConfirmTarget.name}" to the trash? You can restore it later.`}
          confirmLabel="Move to Trash"
          isDestructive={true}
          onCancel={() => setDeleteConfirmTarget(null)}
          onConfirm={async () => {
            await api.trash(deleteConfirmTarget.id, deleteConfirmTarget.type);
            setDeleteConfirmTarget(null);
            loadFiles();
          }}
        />
      )}
    </div>
  );
}
