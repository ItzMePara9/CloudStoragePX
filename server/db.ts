import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'cloudstorage.db');
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high reliability and performance
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  console.warn('SQLite PRAGMA setup warning:', e);
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'member')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      storage_quota INTEGER NOT NULL DEFAULT 5368709120, -- 5 GB in bytes
      storage_used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      last_login_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      is_trashed INTEGER NOT NULL DEFAULT 0,
      trashed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      folder_id TEXT,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      checksum TEXT NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_trashed INTEGER NOT NULL DEFAULT 0,
      trashed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_accessed_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      share_token TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      password_salt TEXT,
      expires_at INTEGER,
      download_limit INTEGER,
      download_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK(provider IN ('google', 'github')),
      provider_user_id TEXT NOT NULL,
      email TEXT,
      display_name TEXT,
      avatar_url TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(provider, provider_user_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT,
      status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILURE', 'WARNING')),
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id, is_trashed);
    CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
    CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id, is_trashed);
    CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
    CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(share_token);
    CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at DESC);
  `);

  // Default system settings
  const defaultSettings: Record<string, string> = {
    app_name: 'CloudStoragePX',
    tagline: 'Your Cloud. Your Control.',
    registration_mode: 'open', // 'open' | 'invite_only' | 'closed'
    default_quota_bytes: '5368709120', // 5 GB
    max_upload_size_bytes: '10737418240', // 10 GB
    chunk_size_bytes: '5242880', // 5 MB
    allow_public_sharing: 'true',
    accent_color: '#6366f1',
    logo_url: '/logo.png',
    maintenance_mode: 'false',
  };

  const getStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const insertStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

  for (const [key, val] of Object.entries(defaultSettings)) {
    const existing = getStmt.get(key) as { value: string } | undefined;
    if (!existing) {
      insertStmt.run(key, val);
    }
  }
}
