import React from 'react';
import { Home, AlertCircle } from 'lucide-react';

export function NotFoundPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-white">Page Not Found</h2>
      <p className="text-xs text-slate-400 max-w-sm">
        The requested storage route or item could not be located on this server.
      </p>
      <button
        onClick={() => onNavigate('/dashboard')}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
      >
        <Home className="w-4 h-4" />
        Return to Dashboard
      </button>
    </div>
  );
}
