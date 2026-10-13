import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from './db.js';
import { encryptBuffer, decryptBuffer, generateId } from './crypto.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const VAULT_DIR = path.join(DATA_DIR, 'vault');
export const CHUNKS_DIR = path.join(DATA_DIR, 'chunks');

// Ensure directories exist
if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });
if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });

export interface UploadSession {
  uploadId: string;
  userId: string;
  name: string;
  totalSize: number;
  mimeType: string;
  folderId: string | null;
  totalChunks: number;
  receivedChunks: Set<number>;
  createdAt: number;
}

const activeUploads = new Map<string, UploadSession>();

// Cleanup stale chunk sessions older than 2 hours
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [uploadId, session] of activeUploads.entries()) {
    if (now - session.createdAt > 2 * 60 * 60 * 1000) {
      const uploadDir = path.join(CHUNKS_DIR, uploadId);
      if (fs.existsSync(uploadDir)) {
        fs.rmSync(uploadDir, { recursive: true, force: true });
      }
      activeUploads.delete(uploadId);
    }
  }
}, 30 * 60 * 1000);
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

export function checkUserQuota(userId: string, additionalBytes: number): boolean {
  const user = db.prepare('SELECT storage_quota, storage_used FROM users WHERE id = ?').get(userId) as {
    storage_quota: number;
    storage_used: number;
  } | undefined;

  if (!user) return false;
  return (user.storage_used + additionalBytes) <= user.storage_quota;
}

export function initChunkedUpload(
  userId: string,
  name: string,
  size: number,
  mimeType: string,
  folderId: string | null,
  totalChunks: number
): { uploadId: string } {
  // Check quota
  if (!checkUserQuota(userId, size)) {
    throw new Error('Storage quota exceeded');
  }

  const uploadId = generateId();
  const uploadDir = path.join(CHUNKS_DIR, uploadId);
  fs.mkdirSync(uploadDir, { recursive: true });

  activeUploads.set(uploadId, {
    uploadId,
    userId,
    name,
    totalSize: size,
    mimeType: mimeType || 'application/octet-stream',
    folderId,
    totalChunks,
    receivedChunks: new Set<number>(),
    createdAt: Date.now(),
  });

  return { uploadId };
}

export function saveChunk(uploadId: string, chunkIndex: number, chunkBuffer: Buffer): void {
  const session = activeUploads.get(uploadId);
  if (!session) {
    throw new Error('Upload session not found or expired');
  }

  const chunkPath = path.join(CHUNKS_DIR, uploadId, `chunk_${chunkIndex}.part`);
  fs.writeFileSync(chunkPath, chunkBuffer);
  session.receivedChunks.add(chunkIndex);
}

export function completeChunkedUpload(uploadId: string): any {
  const session = activeUploads.get(uploadId);
  if (!session) {
    throw new Error('Upload session not found or expired');
  }

  if (session.receivedChunks.size !== session.totalChunks) {
    throw new Error(`Incomplete upload: expected ${session.totalChunks} chunks, got ${session.receivedChunks.size}`);
  }

  // Double check quota before committing
  if (!checkUserQuota(session.userId, session.totalSize)) {
    throw new Error('Storage quota exceeded');
  }

  // Assemble chunks into memory / temp file
  const chunkBuffers: Buffer[] = [];
  for (let i = 0; i < session.totalChunks; i++) {
    const chunkPath = path.join(CHUNKS_DIR, uploadId, `chunk_${i}.part`);
    if (!fs.existsSync(chunkPath)) {
      throw new Error(`Missing chunk ${i}`);
    }
    chunkBuffers.push(fs.readFileSync(chunkPath));
  }
  const assembledBuffer = Buffer.concat(chunkBuffers);

  // Encrypt with AES-256-GCM
  const { encrypted, iv, authTag, checksum } = encryptBuffer(assembledBuffer);

  const fileId = generateId();
  const storageFileName = `${fileId}.enc`;
  const storagePath = path.join(VAULT_DIR, storageFileName);

  fs.writeFileSync(storagePath, encrypted);

  // Clean up temporary chunks
  const uploadDir = path.join(CHUNKS_DIR, uploadId);
  fs.rmSync(uploadDir, { recursive: true, force: true });
  activeUploads.delete(uploadId);

  // Insert into DB
  const now = Date.now();
  db.prepare(`
    INSERT INTO files (
      id, user_id, folder_id, name, mime_type, size,
      storage_path, iv, auth_tag, checksum,
      is_favorite, is_trashed, created_at, updated_at, last_accessed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
  `).run(
    fileId,
    session.userId,
    session.folderId,
    session.name,
    session.mimeType,
    session.totalSize,
    storageFileName,
    iv,
    authTag,
    checksum,
    now,
    now,
    now
  );

  // Update user used storage
  db.prepare('UPDATE users SET storage_used = storage_used + ? WHERE id = ?').run(
    session.totalSize,
    session.userId
  );

  return db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
}

export function directUpload(
  userId: string,
  name: string,
  mimeType: string,
  buffer: Buffer,
  folderId: string | null = null
): any {
  if (!checkUserQuota(userId, buffer.length)) {
    throw new Error('Storage quota exceeded');
  }

  // Encrypt with AES-256-GCM
  const { encrypted, iv, authTag, checksum } = encryptBuffer(buffer);

  const fileId = generateId();
  const storageFileName = `${fileId}.enc`;
  const storagePath = path.join(VAULT_DIR, storageFileName);

  fs.writeFileSync(storagePath, encrypted);

  const now = Date.now();
  db.prepare(`
    INSERT INTO files (
      id, user_id, folder_id, name, mime_type, size,
      storage_path, iv, auth_tag, checksum,
      is_favorite, is_trashed, created_at, updated_at, last_accessed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
  `).run(
    fileId,
    userId,
    folderId,
    name,
    mimeType || 'application/octet-stream',
    buffer.length,
    storageFileName,
    iv,
    authTag,
    checksum,
    now,
    now,
    now
  );

  db.prepare('UPDATE users SET storage_used = storage_used + ? WHERE id = ?').run(
    buffer.length,
    userId
  );

  return db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
}

export function getDecryptedFile(fileId: string): {
  buffer: Buffer;
  file: any;
} {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId) as any;
  if (!file) throw new Error('File not found');

  const storagePath = path.join(VAULT_DIR, file.storage_path);
  if (!fs.existsSync(storagePath)) {
    throw new Error('Encrypted file storage corrupted or missing on disk');
  }

  const encrypted = fs.readFileSync(storagePath);
  const decrypted = decryptBuffer(encrypted, file.iv, file.auth_tag);

  // Update last accessed
  db.prepare('UPDATE files SET last_accessed_at = ? WHERE id = ?').run(Date.now(), fileId);

  return { buffer: decrypted, file };
}

export function permanentlyDeleteFile(fileId: string, userId: string, isAdmin = false): void {
  const query = isAdmin
    ? 'SELECT * FROM files WHERE id = ?'
    : 'SELECT * FROM files WHERE id = ? AND user_id = ?';
  const file = (isAdmin ? db.prepare(query).get(fileId) : db.prepare(query).get(fileId, userId)) as any;

  if (!file) return;

  const storagePath = path.join(VAULT_DIR, file.storage_path);
  if (fs.existsSync(storagePath)) {
    try {
      fs.unlinkSync(storagePath);
    } catch (e) {
      console.error('Error deleting encrypted file:', e);
    }
  }

  db.prepare('DELETE FROM files WHERE id = ?').run(fileId);
  db.prepare('UPDATE users SET storage_used = MAX(0, storage_used - ?) WHERE id = ?').run(
    file.size,
    file.user_id
  );
}

export function purgeUserTrash(userId: string): { deletedCount: number; freedBytes: number } {
  const trashedFiles = db.prepare('SELECT id, size, storage_path FROM files WHERE user_id = ? AND is_trashed = 1').all(userId) as any[];

  let freedBytes = 0;
  for (const f of trashedFiles) {
    const storagePath = path.join(VAULT_DIR, f.storage_path);
    if (fs.existsSync(storagePath)) {
      try {
        fs.unlinkSync(storagePath);
      } catch (e) {
        console.error(e);
      }
    }
    freedBytes += f.size;
    db.prepare('DELETE FROM files WHERE id = ?').run(f.id);
  }

  // Also remove trashed folders
  db.prepare('DELETE FROM folders WHERE user_id = ? AND is_trashed = 1').run(userId);

  if (freedBytes > 0) {
    db.prepare('UPDATE users SET storage_used = MAX(0, storage_used - ?) WHERE id = ?').run(
      freedBytes,
      userId
    );
  }

  return { deletedCount: trashedFiles.length, freedBytes };
}
