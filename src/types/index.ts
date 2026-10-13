export type UserRole = 'owner' | 'admin' | 'member';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  storage_quota: number;
  storage_used: number;
  createdAt?: number;
  lastLoginAt?: number;
}

export interface BrandingSettings {
  appName: string;
  tagline: string;
  logoUrl: string;
  accentColor: string;
  registrationMode: 'open' | 'invite_only' | 'closed';
  maintenanceMode: boolean;
  allowPublicSharing: boolean;
  maxUploadSize?: number;
  chunkSize?: number;
}

export interface FolderItem {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  is_trashed: number;
  trashed_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface FileItem {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  mime_type: string;
  size: number;
  storage_path: string;
  checksum: string;
  is_favorite: number;
  is_trashed: number;
  trashed_at: number | null;
  created_at: number;
  updated_at: number;
  last_accessed_at: number | null;
}

export interface ShareItem {
  id: string;
  file_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  share_token: string;
  has_password: boolean;
  expires_at: number | null;
  download_limit: number | null;
  download_count: number;
  created_at: number;
}

export interface StorageStats {
  storageQuota: number;
  storageUsed: number;
  storageFree: number;
  usagePercent: number;
  totalFiles: number;
  totalFolders: number;
  trashedCount: number;
  breakdown: {
    images: { count: number; bytes: number };
    videos: { count: number; bytes: number };
    audio: { count: number; bytes: number };
    documents: { count: number; bytes: number };
    archives: { count: number; bytes: number };
    others: { count: number; bytes: number };
  };
  recentUploads: FileItem[];
  recentOpened: FileItem[];
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  username: string | null;
  action: string;
  details: string;
  ip_address: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  created_at: number;
}

export interface SystemHealth {
  status: string;
  system: {
    nodeVersion: string;
    platform: string;
    cpuCount: number;
    uptimeSeconds: number;
    memoryRssBytes: number;
    memoryHeapUsedBytes: number;
    memoryHeapTotalBytes: number;
    systemFreeMemoryBytes: number;
    systemTotalMemoryBytes: number;
  };
  storage: {
    vaultFileCount: number;
    vaultEncryptedBytes: number;
    databaseSizeBytes: number;
    encryptionAlgorithm: string;
    hashingAlgorithm: string;
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    activeSessions: number;
  };
}

export interface UploadTask {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  abortController?: AbortController;
}
