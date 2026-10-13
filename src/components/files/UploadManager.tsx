import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useUpload } from '../../context/UploadContext';
import { formatBytes } from '../../utils/format';

export function UploadManager() {
  const { tasks, cancelTask, clearCompleted, isUploading } = useUpload();
  const [isExpanded, setIsExpanded] = useState(true);

  if (tasks.length === 0) return null;

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length;

  return (
    <div className="fixed bottom-5 right-5 z-40 w-80 md:w-96 bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in slide-in-from-bottom-5 duration-200">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <UploadCloud className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-white">
            {isUploading ? `Uploading ${completedCount}/${totalCount}` : 'Uploads Finished'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {!isUploading && (
            <button
              onClick={clearCompleted}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
          {tasks.map((task) => (
            <div key={task.id} className="p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-200 truncate">{task.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatBytes(task.size)}
                  </span>
                  {task.status === 'uploading' && (
                    <button
                      onClick={() => cancelTask(task.id)}
                      className="text-slate-400 hover:text-rose-400 p-0.5"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {task.status === 'error' && (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 rounded-full ${
                    task.status === 'error'
                      ? 'bg-rose-500'
                      : task.status === 'completed'
                      ? 'bg-emerald-500'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>

              {task.error && (
                <p className="text-[11px] text-rose-400 truncate">{task.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
