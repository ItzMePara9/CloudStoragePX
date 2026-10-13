import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, ShieldCheck, KeyRound } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface OAuthSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: 'google' | 'github';
  callbackUrl: string;
}

export function OAuthSetupModal({ isOpen, onClose, provider, callbackUrl }: OAuthSetupModalProps) {
  const { success } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isGoogle = provider === 'google';
  const providerName = isGoogle ? 'Google' : 'GitHub';
  const consoleUrl = isGoogle
    ? 'https://console.cloud.google.com/apis/credentials'
    : 'https://github.com/settings/developers';

  const copyUrl = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    success('Callback URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Configure {providerName} OAuth
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect your {providerName} developer credentials to enable one-click login.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-xs">
          {/* Step 1: Open Provider Dashboard */}
          <div className="space-y-1.5">
            <span className="font-semibold text-slate-900 dark:text-slate-200 block">
              1. Open {providerName} Developer Settings:
            </span>
            <a
              href={consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              <span>Go to {providerName} Developer Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Step 2: Callback URL */}
          <div className="space-y-1.5">
            <span className="font-semibold text-slate-900 dark:text-slate-200 block">
              2. Authorized Redirect / Callback URI:
            </span>
            <div className="flex items-center gap-2 p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <input
                type="text"
                readOnly
                value={callbackUrl}
                className="w-full bg-transparent text-[11px] text-slate-700 dark:text-slate-300 font-mono select-all focus:outline-hidden"
              />
              <button
                type="button"
                onClick={copyUrl}
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
                title="Copy callback URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Paste this exact URI into the {isGoogle ? 'Authorized redirect URIs' : 'Authorization callback URL'} field.
            </p>
          </div>

          {/* Step 3: Environment Variables */}
          <div className="space-y-1.5">
            <span className="font-semibold text-slate-900 dark:text-slate-200 block">
              3. Configure Environment Variables in <code>.env</code>:
            </span>
            <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1 border border-slate-800">
              {isGoogle ? (
                <>
                  <div>GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"</div>
                  <div>GOOGLE_CLIENT_SECRET="your_google_client_secret"</div>
                </>
              ) : (
                <>
                  <div>GITHUB_CLIENT_ID="your_github_client_id"</div>
                  <div>GITHUB_CLIENT_SECRET="your_github_client_secret"</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Client secrets are kept securely on the server
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
