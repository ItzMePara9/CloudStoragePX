import {
  User,
  BrandingSettings,
  FolderItem,
  FileItem,
  ShareItem,
  StorageStats,
  AuditLog,
  SystemHealth,
} from '../types';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData) && !(options.body instanceof ArrayBuffer) && !(options.body instanceof Blob)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (!res.ok) {
    let errMessage = 'An error occurred';
    try {
      const errData = await res.json();
      errMessage = errData.error || errMessage;
    } catch {
      errMessage = await res.text();
    }
    throw new Error(errMessage || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  async getSetupStatus(): Promise<{ isConfigured: boolean; totalUsers: number }> {
    return request('/api/auth/setup-status');
  },

  async setupOwner(payload: { username: string; email: string; password: string }): Promise<{ success: boolean; user: User }> {
    return request('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: { login: string; password: string }): Promise<{ success: boolean; user: User }> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async register(payload: { username: string; email: string; password: string }): Promise<{ success: boolean; user: User }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<{ success: boolean }> {
    return request('/api/auth/logout', { method: 'POST' });
  },

  async getMe(): Promise<{ authenticated: boolean; user: User | null; branding: BrandingSettings }> {
    return request('/api/auth/me');
  },

  async getOAuthConfig(): Promise<{
    google: { configured: boolean; clientId: string | null; callbackUrl: string };
    github: { configured: boolean; clientId: string | null; callbackUrl: string };
    appBaseUrl: string;
  }> {
    return request('/api/auth/oauth/config');
  },

  async getGoogleAuthUrl(): Promise<{ url: string; callbackUrl: string }> {
    return request('/api/auth/oauth/google/url');
  },

  async getGithubAuthUrl(): Promise<{ url: string; callbackUrl: string }> {
    return request('/api/auth/oauth/github/url');
  },

  async updateProfile(payload: { currentPassword?: string; newPassword?: string; email?: string; username?: string }): Promise<{ success: boolean; user: User }> {
    return request('/api/auth/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Files
  async listFiles(params?: { folderId?: string | null; search?: string; sort?: string; order?: string; filter?: string }): Promise<{
    currentFolder: FolderItem | null;
    breadcrumbs: Array<{ id: string | null; name: string }>;
    folders: FolderItem[];
    files: FileItem[];
  }> {
    const q = new URLSearchParams();
    if (params?.folderId) q.set('folderId', params.folderId);
    if (params?.search) q.set('search', params.search);
    if (params?.sort) q.set('sort', params.sort);
    if (params?.order) q.set('order', params.order);
    if (params?.filter) q.set('filter', params.filter);
    return request(`/api/files/list?${q.toString()}`);
  },

  async createFolder(name: string, parentId?: string | null): Promise<{ success: boolean; folder: FolderItem }> {
    return request('/api/files/create-folder', {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    });
  },

  async uploadDirect(file: File, folderId?: string | null): Promise<{ success: boolean; file: FileItem }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await request<{ success: boolean; file: FileItem }>('/api/files/upload-direct', {
            method: 'POST',
            body: JSON.stringify({
              name: file.name,
              mimeType: file.type || 'application/octet-stream',
              folderId: folderId || null,
              dataBase64: base64Data,
            }),
          });
          resolve(res);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  async uploadChunked(
    file: File,
    folderId?: string | null,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ): Promise<{ success: boolean; file: FileItem }> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // 1. Init upload
    const { uploadId } = await request<{ uploadId: string }>('/api/files/upload-init', {
      method: 'POST',
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        folderId: folderId || null,
        totalChunks,
      }),
      signal,
    });

    // 2. Upload each chunk sequentially
    for (let i = 0; i < totalChunks; i++) {
      if (signal?.aborted) throw new Error('Upload aborted');
      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunkBlob = file.slice(start, end);
      const chunkBuffer = await chunkBlob.arrayBuffer();

      const chunkRes = await fetch(`/api/files/upload-chunk?uploadId=${uploadId}&chunkIndex=${i}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-upload-id': uploadId,
          'x-chunk-index': String(i),
        },
        body: chunkBuffer,
        signal,
      });

      if (!chunkRes.ok) {
        throw new Error(`Chunk ${i} upload failed`);
      }

      if (onProgress) {
        const percent = Math.round(((i + 1) / totalChunks) * 100);
        onProgress(percent);
      }
    }

    // 3. Complete upload
    return request<{ success: boolean; file: FileItem }>('/api/files/upload-complete', {
      method: 'POST',
      body: JSON.stringify({ uploadId }),
      signal,
    });
  },

  async rename(id: string, name: string, type: 'file' | 'folder'): Promise<{ success: boolean; name: string }> {
    return request(`/api/files/${id}/rename`, {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
  },

  async move(id: string, targetFolderId: string | null, type: 'file' | 'folder'): Promise<{ success: boolean }> {
    return request(`/api/files/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetFolderId, type }),
    });
  },

  async toggleStar(fileId: string): Promise<{ success: boolean; isFavorite: boolean }> {
    return request(`/api/files/${fileId}/star`, { method: 'POST' });
  },

  async trash(id: string, type: 'file' | 'folder' = 'file'): Promise<{ success: boolean }> {
    return request(`/api/files/${id}/trash`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  },

  async restore(id: string, type: 'file' | 'folder' = 'file'): Promise<{ success: boolean }> {
    return request(`/api/files/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  },

  async permanentDelete(id: string, type: 'file' | 'folder' = 'file'): Promise<{ success: boolean }> {
    return request(`/api/files/${id}/permanent`, {
      method: 'DELETE',
      body: JSON.stringify({ type }),
    });
  },

  async getTrash(): Promise<{ folders: FolderItem[]; files: FileItem[] }> {
    return request('/api/files/trash');
  },

  async emptyTrash(): Promise<{ success: boolean; deletedCount: number; freedBytes: number }> {
    return request('/api/files/empty-trash', { method: 'POST' });
  },

  async getRecent(): Promise<{ files: FileItem[] }> {
    return request('/api/files/recent');
  },

  async getFavorites(): Promise<{ files: FileItem[] }> {
    return request('/api/files/favorites');
  },

  async getStats(): Promise<StorageStats> {
    return request('/api/files/stats');
  },

  // Shares
  async createShare(payload: { fileId: string; password?: string; expiresInHours?: number; downloadLimit?: number }): Promise<{ success: boolean; share: ShareItem }> {
    return request('/api/shares/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listShares(): Promise<{ shares: ShareItem[] }> {
    return request('/api/shares/list');
  },

  async revokeShare(id: string): Promise<{ success: boolean }> {
    return request(`/api/shares/${id}`, { method: 'DELETE' });
  },

  async getPublicShare(token: string): Promise<any> {
    return request(`/api/shares/public/${token}`);
  },

  // Admin
  async listUsers(search?: string, role?: string, status?: string): Promise<{ users: User[] }> {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (role) q.set('role', role);
    if (status) q.set('status', status);
    return request(`/api/admin/users?${q.toString()}`);
  },

  async updateUserQuota(userId: string, quotaBytes: number): Promise<{ success: boolean }> {
    return request(`/api/admin/users/${userId}/quota`, {
      method: 'POST',
      body: JSON.stringify({ quotaBytes }),
    });
  },

  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<{ success: boolean }> {
    return request(`/api/admin/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  async updateUserRole(userId: string, role: 'admin' | 'member'): Promise<{ success: boolean }> {
    return request(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean }> {
    return request(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    return request(`/api/admin/users/${userId}`, { method: 'DELETE' });
  },

  async getSettings(): Promise<{ settings: Record<string, string> }> {
    return request('/api/admin/settings');
  },

  async updateSettings(settings: Record<string, string>): Promise<{ success: boolean }> {
    return request('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  async getLogs(page = 0, limit = 50, action?: string, status?: string): Promise<{ logs: AuditLog[]; total: number }> {
    const q = new URLSearchParams({
      offset: String(page * limit),
      limit: String(limit),
    });
    if (action) q.set('action', action);
    if (status) q.set('status', status);
    return request(`/api/admin/logs?${q.toString()}`);
  },

  async getHealth(): Promise<SystemHealth> {
    return request('/api/admin/health');
  },
};
