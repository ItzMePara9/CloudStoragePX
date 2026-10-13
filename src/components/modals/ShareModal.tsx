import React, { useState } from 'react';
import { Share2, Lock, Clock, Download, Copy, Check, X } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { FileItem } from '../../types';

interface ShareModalProps {
  isOpen: boolean;
  file: FileItem | null;
  onClose: () => void;
}

export function ShareModal({ isOpen, file, onClose }: ShareModalProps) {
  const { success, error: toastError } = useToast();
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [downloadLimit, setDownloadLimit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !file) return null;

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await api.createShare({
        fileId: file.id,
        password: hasPassword ? password : '',
        expiresInHours: expiresInHours === 'never' ? undefined : parseInt(expiresInHours, 10),
        downloadLimit: downloadLimit ? parseInt(downloadLimit, 10) : undefined,
      });

      const token = res.share.share_token || (res.share as any).shareToken;
      const fullUrl = `${window.location.origin}/s/${token}`;
      setGeneratedLink(fullUrl);
      success('Secure share link created');
    } catch (err: any) {
      toastError(err.message || 'Failed to create share link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-white">Share File</h3>
              <p className="text-xs text-slate-400 truncate max-w-[260px]">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {generatedLink ? (
          <div className="mt-5 space-y-4">
            <div className="p-3.5 bg-slate-900 border border-slate-700/80 rounded-xl space-y-2">
              <label className="text-xs font-medium text-slate-400">Public Share URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="w-full bg-transparent text-xs text-indigo-300 font-mono select-all focus:outline-hidden"
                />
                <button
                  onClick={copyToClipboard}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shrink-0"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p>• Link is unguessable and protected by server authorization.</p>
              {hasPassword && <p>• Password protection is enabled.</p>}
              {expiresInHours !== 'never' && <p>• Expires in {expiresInHours} hours.</p>}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateShare} className="mt-5 space-y-4">
            {/* Expiration */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Link Expiration
              </label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="1">1 Hour</option>
                <option value="24">24 Hours (1 Day)</option>
                <option value="168">7 Days (1 Week)</option>
                <option value="720">30 Days</option>
                <option value="never">Never Expire</option>
              </select>
            </div>

            {/* Password Protection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPassword}
                  onChange={(e) => setHasPassword(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  Protect with Password
                </span>
              </label>
              {hasPassword && (
                <input
                  type="password"
                  placeholder="Enter a secret password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={hasPassword}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              )}
            </div>

            {/* Download Limit */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1.5">
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                Max Downloads (Optional)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited downloads"
                value={downloadLimit}
                onChange={(e) => setDownloadLimit(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (hasPassword && !password.trim())}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-colors shadow-sm whitespace-nowrap"
              >
                {isSubmitting ? 'Creating Link...' : 'Create Share Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
