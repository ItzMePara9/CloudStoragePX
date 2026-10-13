import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  Key,
  Trash2,
  HardDrive,
  RotateCw,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { User, UserRole, UserStatus } from '../../types';
import { formatBytes, formatDate } from '../../utils/format';
import { Header } from '../../components/layout/Header';
import { ConfirmDialog } from '../../components/modals/ConfirmDialog';

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals / Actions
  const [quotaTarget, setQuotaTarget] = useState<User | null>(null);
  const [newQuotaGB, setNewQuotaGB] = useState('');

  const [passwordResetTarget, setPasswordResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.listUsers(search, roleFilter, statusFilter);
      setUsers(res.users);
    } catch (err: any) {
      toastError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter, statusFilter]);

  const handleToggleStatus = async (user: User) => {
    const nextStatus: UserStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUserStatus(user.id, nextStatus);
      success(`User ${user.username} is now ${nextStatus}`);
      loadUsers();
    } catch (err: any) {
      toastError(err.message || 'Failed to update user status');
    }
  };

  const handleChangeRole = async (user: User, newRole: 'admin' | 'member') => {
    try {
      await api.updateUserRole(user.id, newRole);
      success(`Updated ${user.username} role to ${newRole}`);
      loadUsers();
    } catch (err: any) {
      toastError(err.message || 'Failed to change role');
    }
  };

  const handleUpdateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotaTarget) return;
    const gb = parseFloat(newQuotaGB);
    if (isNaN(gb) || gb < 0) {
      toastError('Please enter a valid quota in GB');
      return;
    }
    const bytes = Math.round(gb * 1024 * 1024 * 1024);
    try {
      await api.updateUserQuota(quotaTarget.id, bytes);
      success(`Updated quota for ${quotaTarget.username}`);
      setQuotaTarget(null);
      loadUsers();
    } catch (err: any) {
      toastError(err.message || 'Failed to update quota');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetTarget) return;
    if (newPassword.length < 8) {
      toastError('Password must be at least 8 characters long');
      return;
    }
    try {
      await api.resetUserPassword(passwordResetTarget.id, newPassword);
      success(`Password reset for ${passwordResetTarget.username}`);
      setPasswordResetTarget(null);
      setNewPassword('');
    } catch (err: any) {
      toastError(err.message || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteUser(deleteTarget.id);
      success(`Deleted user account and purged vault files`);
      setDeleteTarget(null);
      loadUsers();
    } catch (err: any) {
      toastError(err.message || 'Failed to delete user');
    }
  };

  const isOwner = currentUser?.role === 'owner';

  return (
    <div className="flex flex-col min-h-full">
      <Header title="User Accounts" onRefresh={loadUsers} />

      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full flex-1">
        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or email..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden"
            >
              <option value="">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>

            <button
              onClick={loadUsers}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Storage Quota</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      No user accounts found matching your query.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const usagePercent = Math.min(100, Math.round((u.storage_used / (u.storage_quota || 1)) * 100));
                    return (
                      <tr key={u.id} className="hover:bg-slate-850/40 transition-colors">
                        {/* User Identity */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0">
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-white block">{u.username}</span>
                              <span className="text-[11px] text-slate-400">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          {isOwner && u.role !== 'owner' ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeRole(u, e.target.value as any)}
                              className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-indigo-300 uppercase"
                            >
                              <option value="member">MEMBER</option>
                              <option value="admin">ADMIN</option>
                            </select>
                          ) : (
                            <span className="font-semibold uppercase tracking-wider text-indigo-300 text-[11px]">
                              {u.role}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block font-semibold uppercase text-[11px] ${
                              u.status === 'active' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>

                        {/* Quota */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                              <span>{formatBytes(u.storage_used)}</span>
                              <span>{formatBytes(u.storage_quota)}</span>
                            </div>
                            <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  usagePercent > 90 ? 'bg-rose-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Joined Date */}
                        <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                          {formatDate(u.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Adjust Quota */}
                            <button
                              onClick={() => {
                                setQuotaTarget(u);
                                setNewQuotaGB((u.storage_quota / (1024 * 1024 * 1024)).toFixed(1));
                              }}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                              title="Edit Storage Quota"
                            >
                              <HardDrive className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setPasswordResetTarget(u);
                                setNewPassword('');
                              }}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Suspend / Activate (Non-owner accounts) */}
                            {u.role !== 'owner' && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  u.status === 'active'
                                    ? 'hover:bg-amber-500/10 text-slate-400 hover:text-amber-400'
                                    : 'hover:bg-emerald-500/10 text-rose-400 hover:text-emerald-400'
                                }`}
                                title={u.status === 'active' ? 'Suspend User' : 'Activate User'}
                              >
                                {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            {/* Delete User (Owner only, cannot delete self) */}
                            {isOwner && u.id !== currentUser?.id && (
                              <button
                                onClick={() => setDeleteTarget(u)}
                                className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                                title="Delete User and Files"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Adjust Quota Modal */}
      {quotaTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <h3 className="text-base font-semibold text-white mb-2">
              Update Quota: {quotaTarget.username}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter storage quota allocation in Gigabytes (GB).
            </p>
            <form onSubmit={handleUpdateQuota} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Quota (GB)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={newQuotaGB}
                  onChange={(e) => setNewQuotaGB(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden"
                  required
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setQuotaTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
                >
                  Save Quota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passwordResetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <h3 className="text-base font-semibold text-white mb-2">
              Reset Password: {passwordResetTarget.username}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Set a temporary or replacement password. Active sessions for this user will be revoked immediately.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-hidden"
                  required
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordResetTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          title={`Delete Account: ${deleteTarget.username}`}
          message={`Are you sure you want to delete user "${deleteTarget.username}"? All encrypted files belonging to this account in the storage vault will be purged permanently.`}
          confirmLabel="Delete User and Files"
          isDestructive={true}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  );
}
