import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useToast } from './ToastContext';
import { UploadTask } from '../types';

interface UploadContextType {
  tasks: UploadTask[];
  uploadFiles: (files: FileList | File[], folderId?: string | null, onCompleted?: () => void) => Promise<void>;
  cancelTask: (id: string) => void;
  clearCompleted: () => void;
  isUploading: boolean;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const { success, error: toastError } = useToast();

  const cancelTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          t.abortController?.abort();
          return { ...t, status: 'error', error: 'Upload cancelled by user' };
        }
        return t;
      })
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status === 'uploading' || t.status === 'pending'));
  }, []);

  const uploadFiles = useCallback(
    async (fileList: FileList | File[], folderId: string | null = null, onCompleted?: () => void) => {
      const filesArray = Array.from(fileList);
      if (filesArray.length === 0) return;

      const newTasks: UploadTask[] = filesArray.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending',
        abortController: new AbortController(),
      }));

      setTasks((prev) => [...prev, ...newTasks]);

      // Process each file
      for (const task of newTasks) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'uploading' } : t))
        );

        try {
          // If file is smaller than 4MB, use direct upload; otherwise chunked upload
          if (task.file.size <= 4 * 1024 * 1024) {
            await api.uploadDirect(task.file, folderId);
            setTasks((prev) =>
              prev.map((t) => (t.id === task.id ? { ...t, progress: 100, status: 'completed' } : t))
            );
          } else {
            await api.uploadChunked(
              task.file,
              folderId,
              (percent) => {
                setTasks((prev) =>
                  prev.map((t) => (t.id === task.id ? { ...t, progress: percent } : t))
                );
              },
              task.abortController?.signal
            );
            setTasks((prev) =>
              prev.map((t) => (t.id === task.id ? { ...t, progress: 100, status: 'completed' } : t))
            );
          }

          success(`Uploaded "${task.name}"`);
          if (onCompleted) onCompleted();
        } catch (err: any) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? { ...t, status: 'error', error: err.message || 'Upload failed' }
                : t
            )
          );
          toastError(`Failed to upload "${task.name}": ${err.message}`);
        }
      }
    },
    [success, toastError]
  );

  const isUploading = tasks.some((t) => t.status === 'uploading' || t.status === 'pending');

  return (
    <UploadContext.Provider
      value={{
        tasks,
        uploadFiles,
        cancelTask,
        clearCompleted,
        isUploading,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUpload must be used within UploadProvider');
  return ctx;
}
