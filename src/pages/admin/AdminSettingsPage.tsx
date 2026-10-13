import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Palette,
  HardDrive,
  Download,
  AlertTriangle,
  Save,
  RotateCw,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Header } from '../../components/layout/Header';

export function AdminSettingsPage() {
  const { refreshUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const res = await api.getSettings();
      setSettings(res.settings);
    } catch (err: any) {
      toastError(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.updateSettings(settings);
      success('System settings updated successfully');
      await refreshUser();
    } catch (err: any) {
      toastError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/admin/backup/create';
  };

  const defaultQuotaGB = settings['default_quota_bytes']
    ? (parseInt(settings['default_quota_bytes'], 10) / (1024 * 1024 * 1024)).toString()
    : '5';

  const maxUploadGB = settings['max_upload_size_bytes']
    ? (parseInt(settings['max_upload_size_bytes'], 10) / (1024 * 1024 * 1024)).toString()
    : '10';

  const chunkSizeMB = settings['chunk_size_bytes']
    ? (parseInt(settings['chunk_size_bytes'], 10) / (1024 * 1024)).toString()
    : '5';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Owner Settings" onRefresh={loadSettings} />

      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full flex-1">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Installation Controls</h2>
          <p className="text-xs text-slate-400 mt-1">
            Global configuration for registration, storage limits, security policy, and branding.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Registration & Sharing Controls */}
          <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              Registration & Access Policy
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Registration Mode
                </label>
                <select
                  value={settings['registration_mode'] || 'open'}
                  onChange={(e) => handleChange('registration_mode', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden"
                >
                  <option value="open">Open (Anyone can register)</option>
                  <option value="closed">Closed (Admin invitations only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Public Sharing Feature
                </label>
                <select
                  value={settings['allow_public_sharing'] || 'true'}
                  onChange={(e) => handleChange('allow_public_sharing', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden"
                >
                  <option value="true">Enabled (Users can generate public download links)</option>
                  <option value="false">Disabled Globally</option>
                </select>
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Maintenance Mode</span>
                <span className="text-[11px] text-slate-400">
                  When enabled, non-owner users are prevented from logging in or performing actions.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleChange(
                    'maintenance_mode',
                    settings['maintenance_mode'] === 'true' ? 'false' : 'true'
                  )
                }
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                  settings['maintenance_mode'] === 'true'
                    ? 'bg-rose-600/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {settings['maintenance_mode'] === 'true' ? 'Active (Maintenance On)' : 'Off (Normal)'}
              </button>
            </div>
          </div>

          {/* Storage & Limits */}
          <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              Storage Limits & Upload Pipeline
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Default Member Quota (GB)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={defaultQuotaGB}
                  onChange={(e) =>
                    handleChange(
                      'default_quota_bytes',
                      String(Math.round(parseFloat(e.target.value || '1') * 1024 * 1024 * 1024))
                    )
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Max File Upload Limit (GB)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={maxUploadGB}
                  onChange={(e) =>
                    handleChange(
                      'max_upload_size_bytes',
                      String(Math.round(parseFloat(e.target.value || '1') * 1024 * 1024 * 1024))
                    )
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Chunk Stream Size (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={chunkSizeMB}
                  onChange={(e) =>
                    handleChange(
                      'chunk_size_bytes',
                      String(Math.round(parseFloat(e.target.value || '5') * 1024 * 1024))
                    )
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Branding Settings */}
          <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-400" />
              Brand Identity & Logo
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Application Name
                </label>
                <input
                  type="text"
                  value={settings['app_name'] || 'CloudStoragePX'}
                  onChange={(e) => handleChange('app_name', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Tagline</label>
                <input
                  type="text"
                  value={settings['tagline'] || 'Your Cloud. Your Control.'}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Logo URL or Static Asset
                </label>
                <input
                  type="text"
                  value={settings['logo_url'] || '/logo.png'}
                  onChange={(e) => handleChange('logo_url', e.target.value)}
                  placeholder="/logo.png"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  You can place any image named <code>logo.png</code> in <code>public/logo.png</code>.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Brand Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings['accent_color'] || '#6366f1'}
                    onChange={(e) => handleChange('accent_color', e.target.value)}
                    className="w-9 h-9 rounded-xl border border-slate-700 bg-transparent cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings['accent_color'] || '#6366f1'}
                    onChange={(e) => handleChange('accent_color', e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Backup & Disaster Recovery */}
          <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-400" />
              Backup & Disaster Recovery
            </h3>
            <p className="text-xs text-slate-400">
              Download a complete database snapshot containing users, folders, files metadata, and shares.
            </p>
            <div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Database Snapshot (.json)
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Settings...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
