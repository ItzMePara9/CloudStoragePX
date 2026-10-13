import React, { useState } from 'react';
import { User, Lock, ShieldCheck, Moon, Sun, Save } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';
import { Header } from '../components/layout/Header';

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success, error: toastError } = useToast();

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword) {
      if (newPassword.length < 8) {
        toastError('New password must be at least 8 characters long');
        return;
      }
      if (newPassword !== confirmPassword) {
        toastError('New passwords do not match');
        return;
      }
      if (!currentPassword) {
        toastError('Current password is required to set a new password');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await api.updateProfile({
        username: username !== user?.username ? username : undefined,
        email: email !== user?.email ? email : undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      success('Profile settings updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
    } catch (err: any) {
      toastError(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Account Settings" />

      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full flex-1">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Account Preferences</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your credentials, encryption settings, and interface preferences.
          </p>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Profile Card */}
          <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              User Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-4 text-xs text-slate-400">
              <div>
                <span className="text-slate-400">Account Role: </span>
                <span className="font-semibold text-indigo-300 uppercase">{user?.role}</span>
              </div>
              <span aria-hidden="true">·</span>
              <div>
                <span className="text-slate-400">Joined: </span>
                <span className="text-slate-300">{formatDate(user?.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Password Card */}
          <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              Change Password
            </h3>

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Theme Preference */}
          <div className="p-6 bg-[#0f172a]/90 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              Appearance Theme
            </h3>

            <div className="flex items-center gap-3">
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`px-4 py-2 text-xs font-medium rounded-xl border capitalize transition-colors ${
                    theme === t
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
