import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { UploadManager } from '../files/UploadManager';
import { useUpload } from '../../context/UploadContext';
import { UploadCloud } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  currentFolderId?: string | null;
  onRefresh?: () => void;
}

export function AppLayout({
  children,
  currentPath,
  onNavigate,
  currentFolderId,
  onRefresh,
}: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { uploadFiles } = useUpload();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if leaving main target
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files, currentFolderId, onRefresh);
    }
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          currentPath={currentPath}
          onNavigate={(p) => {
            onNavigate(p);
            setIsMobileMenuOpen(false);
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="w-64 h-full" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              currentPath={currentPath}
              onNavigate={(p) => {
                onNavigate(p);
                setIsMobileMenuOpen(false);
              }}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Drag and Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-indigo-950/80 backdrop-blur-xs border-2 border-dashed border-indigo-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="p-6 rounded-3xl bg-slate-900 border border-indigo-500/30 text-center space-y-3 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center animate-bounce">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-white">Drop files to upload</h3>
            <p className="text-xs text-slate-400">
              Files will be automatically encrypted and securely stored in your vault.
            </p>
          </div>
        </div>
      )}

      {/* Floating Upload Progress Manager */}
      <UploadManager />
    </div>
  );
}
