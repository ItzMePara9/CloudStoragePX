import React, { useState, useEffect } from 'react';
import { Share2, Lock, Clock, Download, Copy, Trash2, Check, RotateCw, ExternalLink } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { ShareItem } from '../types';
import { formatBytes, formatDate } from '../utils/format';
import { Header } from '../components/layout/Header';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';

export function SharedPage() {
  const { success, error: toastError } = useToast();
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ShareItem | null>(null);

  const loadShares = async () => {
    try {
      setIsLoading(true);
      const res = await api.listShares();
      setShares(res.shares);
    } catch (err: any) {
      toastError(err.message || 'Failed to load shared links');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShares();
  }, []);

  const copyShareLink = (token: string, id: string) => {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    success('Share link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await api.revokeShare(revokeTarget.id);
      success('Share link revoked successfully');
      setRevokeTarget(null);
      loadShares();
    } catch (err: any) {
      toastError(err.message || 'Failed to revoke link');
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Shared Links" onRefresh={loadShares} />

      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto w-full flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Active public share links you have created with unguessable tokens
          </p>
          <button
            onClick={loadShares}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-900/60 rounded-2xl border border-slate-800/80" />
            ))}
          </div>
        ) : shares.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
            <Share2 className="w-10 h-10 text-indigo-500/40 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No active shared links</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven't shared any files yet. Select a file from "My Files" and click "Share Link" to create one.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 bg-[#0f172a]/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/60">
              <span className="col-span-5">File & Security</span>
              <span className="col-span-3">Expiration</span>
              <span className="col-span-2 text-right">Downloads</span>
              <span className="col-span-2 text-right">Manage</span>
            </div>

            {shares.map((share) => (
              <div
                key={share.id}
                className="grid grid-cols-12 items-center px-5 py-3.5 text-xs text-slate-300 hover:bg-slate-850/50 transition-colors"
              >
                {/* File info + Security */}
                <div className="col-span-5 flex items-center gap-3 min-w-0 pr-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-white truncate block">{share.file_name}</span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                      <span>{formatBytes(share.file_size)}</span>
                      {share.has_password && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1 text-amber-400">
                            <Lock className="w-3 h-3" /> Password Protected
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expiration */}
                <div className="col-span-3 text-slate-400 font-mono text-[11px]">
                  {share.expires_at ? (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      {formatDate(share.expires_at)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Never expires</span>
                  )}
                </div>

                {/* Download counts */}
                <div className="col-span-2 text-right font-mono text-slate-300 tabular-nums">
                  {share.download_count}
                  {share.download_limit ? ` / ${share.download_limit}` : ' (unlimited)'}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => copyShareLink(share.share_token, share.id)}
                    className="p-1.5 bg-slate-900 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-lg transition-colors border border-slate-700/80"
                    title="Copy Public Link"
                  >
                    {copiedId === share.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <a
                    href={`/s/${share.share_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700/80"
                    title="Open Download Page"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => setRevokeTarget(share)}
                    className="p-1.5 bg-slate-900 hover:bg-rose-600 hover:text-white text-slate-300 rounded-lg transition-colors border border-slate-700/80"
                    title="Revoke Link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {revokeTarget && (
        <ConfirmDialog
          isOpen={true}
          title="Revoke Share Link"
          message={`Are you sure you want to revoke the share link for "${revokeTarget.file_name}"? Anyone with this link will no longer be able to access the file.`}
          confirmLabel="Revoke Link"
          isDestructive={true}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={handleRevoke}
        />
      )}
    </div>
  );
}
