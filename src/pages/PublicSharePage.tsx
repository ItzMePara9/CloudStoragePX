import React, { useState, useEffect } from 'react';
import {
  Download,
  Lock,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Image,
  Video,
  Music,
} from 'lucide-react';
import { formatBytes, formatDate } from '../utils/format';

export function PublicSharePage({ shareToken }: { shareToken: string }) {
  const [shareData, setShareData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShareInfo() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/shares/public/${shareToken}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'This shared file was not found or has expired.');
        }
        const data = await res.json();
        setShareData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (shareToken) {
      fetchShareInfo();
    }
  }, [shareToken]);

  const handleDownload = () => {
    let url = `/api/shares/public/${shareToken}/download`;
    if (shareData?.requiresPassword && password) {
      url += `?password=${encodeURIComponent(password)}`;
    }
    window.location.href = url;
  };

  const previewUrl =
    shareData?.requiresPassword && password
      ? `/api/shares/public/${shareToken}/preview?password=${encodeURIComponent(password)}`
      : `/api/shares/public/${shareToken}/preview`;

  const isImage = shareData?.mimeType?.startsWith('image/');
  const isVideo = shareData?.mimeType?.startsWith('video/');
  const isAudio = shareData?.mimeType?.startsWith('audio/');

  return (
    <div className="min-h-screen w-screen bg-[#0b0f19] text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="mb-6 flex items-center gap-3">
        <img
          src="/logo.png"
          alt="CloudStoragePX"
          className="w-10 h-10 rounded-xl object-contain border border-indigo-500/30"
        />
        <div>
          <span className="font-bold text-base text-white tracking-tight block">
            CloudStoragePX
          </span>
          <span className="text-xs text-slate-400 block">Secure Shared File</span>
        </div>
      </div>

      <div className="w-full max-w-xl bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Retrieving file metadata from vault...
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white">Unavailable Link</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info */}
            <div className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-white truncate" title={shareData.fileName}>
                  {shareData.fileName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5 tabular-nums">
                  <span>{formatBytes(shareData.fileSize)}</span>
                  {shareData.expiresAt && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        Expires {formatDate(shareData.expiresAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Password input if protected */}
            {shareData.requiresPassword && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                <label className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  This file is password-protected
                </label>
                <input
                  type="password"
                  placeholder="Enter the access password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}

            {/* Inline Preview if supported and unlocked */}
            {(!shareData.requiresPassword || password) && (
              <div className="rounded-2xl overflow-hidden bg-black/40 border border-slate-800 flex items-center justify-center max-h-64">
                {isImage && (
                  <img
                    src={previewUrl}
                    alt={shareData.fileName}
                    className="max-h-64 object-contain"
                  />
                )}
                {isVideo && (
                  <video src={previewUrl} controls className="max-h-64 w-full" />
                )}
                {isAudio && (
                  <audio src={previewUrl} controls className="w-full p-4" />
                )}
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={shareData.requiresPassword && !password}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>

            <div className="pt-2 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Encrypted with AES-256-GCM. Streamed and verified securely.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
