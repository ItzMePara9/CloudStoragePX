import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { generateId } from '../crypto.js';
import { requireAuth, logAudit } from '../auth.js';
import {
  initChunkedUpload,
  saveChunk,
  completeChunkedUpload,
  directUpload,
  getDecryptedFile,
  permanentlyDeleteFile,
  purgeUserTrash,
  checkUserQuota,
} from '../storage.js';

export const fileRouter = Router();
fileRouter.use(requireAuth);

// Helper to determine category from MIME type
function getFileCategory(mime: string, name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) return 'image';
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return 'audio';
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('text') ||
    mime.includes('sheet') ||
    mime.includes('presentation') ||
    ['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xlsx', 'pptx'].includes(ext)
  ) return 'document';
  if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2'].includes(ext)) return 'archive';
  return 'other';
}

// 1. Files & Folders List
fileRouter.get('/list', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const folderId = req.query.folderId === 'null' || !req.query.folderId ? null : String(req.query.folderId);
  const search = req.query.search ? String(req.query.search).trim() : '';
  const sort = (String(req.query.sort || 'name')).toLowerCase();
  const order = (String(req.query.order || 'asc')).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const filter = (String(req.query.filter || 'all')).toLowerCase();

  try {
    let currentFolder = null;
    const breadcrumbs: Array<{ id: string | null; name: string }> = [{ id: null, name: 'My Files' }];

    if (folderId) {
      currentFolder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ? AND is_trashed = 0').get(folderId, userId) as any;
      if (!currentFolder) {
        res.status(404).json({ error: 'Folder not found' });
        return;
      }

      // Build breadcrumbs trail
      const trail: Array<{ id: string; name: string }> = [];
      let cur = currentFolder;
      while (cur) {
        trail.unshift({ id: cur.id, name: cur.name });
        if (cur.parent_id) {
          cur = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(cur.parent_id, userId) as any;
        } else {
          cur = null;
        }
      }
      breadcrumbs.push(...trail);
    }

    let folders: any[] = [];
    let files: any[] = [];

    if (search) {
      // Global search across user files & folders
      folders = db.prepare(`
        SELECT * FROM folders
        WHERE user_id = ? AND is_trashed = 0 AND LOWER(name) LIKE LOWER(?)
        ORDER BY name ASC
      `).all(userId, `%${search}%`) as any[];

      files = db.prepare(`
        SELECT * FROM files
        WHERE user_id = ? AND is_trashed = 0 AND LOWER(name) LIKE LOWER(?)
        ORDER BY name ASC
      `).all(userId, `%${search}%`) as any[];
    } else {
      // Items in current folder
      if (folderId) {
        folders = db.prepare(`
          SELECT * FROM folders
          WHERE user_id = ? AND parent_id = ? AND is_trashed = 0
          ORDER BY name ${order}
        `).all(userId, folderId) as any[];

        files = db.prepare(`
          SELECT * FROM files
          WHERE user_id = ? AND folder_id = ? AND is_trashed = 0
          ORDER BY ${sort === 'size' ? 'size' : sort === 'date' ? 'updated_at' : 'name'} ${order}
        `).all(userId, folderId) as any[];
      } else {
        folders = db.prepare(`
          SELECT * FROM folders
          WHERE user_id = ? AND parent_id IS NULL AND is_trashed = 0
          ORDER BY name ${order}
        `).all(userId) as any[];

        files = db.prepare(`
          SELECT * FROM files
          WHERE user_id = ? AND folder_id IS NULL AND is_trashed = 0
          ORDER BY ${sort === 'size' ? 'size' : sort === 'date' ? 'updated_at' : 'name'} ${order}
        `).all(userId) as any[];
      }
    }

    // Apply category filter if requested
    if (filter !== 'all') {
      files = files.filter((f) => getFileCategory(f.mime_type, f.name) === filter);
    }

    res.json({
      currentFolder,
      breadcrumbs,
      folders,
      files,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Create Folder
fileRouter.post('/create-folder', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, parentId } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Folder name cannot be empty.' });
    return;
  }

  const cleanName = name.trim();
  const pid = parentId || null;

  // Check duplicate in same folder
  const existing = pid
    ? db.prepare('SELECT id FROM folders WHERE user_id = ? AND parent_id = ? AND LOWER(name) = LOWER(?) AND is_trashed = 0').get(userId, pid, cleanName)
    : db.prepare('SELECT id FROM folders WHERE user_id = ? AND parent_id IS NULL AND LOWER(name) = LOWER(?) AND is_trashed = 0').get(userId, cleanName);

  if (existing) {
    res.status(409).json({ error: 'A folder with this name already exists in this location.' });
    return;
  }

  const folderId = generateId();
  const now = Date.now();

  db.prepare(`
    INSERT INTO folders (id, user_id, parent_id, name, is_trashed, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run(folderId, userId, pid, cleanName, now, now);

  logAudit(userId, req.user!.username, 'FOLDER_CREATE', `Created folder "${cleanName}"`, req.ip || null, 'SUCCESS');

  const created = db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId);
  res.json({ success: true, folder: created });
});

// 3. Initiate Chunked Upload
fileRouter.post('/upload-init', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, size, mimeType, folderId, totalChunks } = req.body;

  if (!name || size === undefined || !totalChunks) {
    res.status(400).json({ error: 'name, size, and totalChunks are required.' });
    return;
  }

  try {
    const { uploadId } = initChunkedUpload(
      userId,
      name.trim(),
      parseInt(size, 10),
      mimeType,
      folderId || null,
      parseInt(totalChunks, 10)
    );
    res.json({ uploadId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Upload Chunk (Binary)
fileRouter.post('/upload-chunk', (req: Request, res: Response) => {
  const uploadId = String(req.headers['x-upload-id'] || req.query.uploadId || '');
  const chunkIndex = parseInt(String(req.headers['x-chunk-index'] || req.query.chunkIndex || '0'), 10);

  if (!uploadId) {
    res.status(400).json({ error: 'Missing uploadId' });
    return;
  }

  // Expect raw binary body or buffer
  const buffer = req.body instanceof Buffer ? req.body : Buffer.from(req.body || '');
  if (!buffer.length) {
    res.status(400).json({ error: 'Empty chunk data' });
    return;
  }

  try {
    saveChunk(uploadId, chunkIndex, buffer);
    res.json({ success: true, chunkIndex });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Complete Chunked Upload
fileRouter.post('/upload-complete', (req: Request, res: Response) => {
  const { uploadId } = req.body;
  if (!uploadId) {
    res.status(400).json({ error: 'Missing uploadId' });
    return;
  }

  try {
    const file = completeChunkedUpload(uploadId);
    logAudit(req.user!.id, req.user!.username, 'FILE_UPLOAD', `Uploaded file "${file.name}" (${file.size} bytes)`, req.ip || null, 'SUCCESS');
    res.json({ success: true, file });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Direct Upload (for single files or drag-drop)
fileRouter.post('/upload-direct', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, mimeType, folderId, dataBase64 } = req.body;

  if (!name || !dataBase64) {
    res.status(400).json({ error: 'Name and dataBase64 are required.' });
    return;
  }

  try {
    const buffer = Buffer.from(dataBase64, 'base64');
    const file = directUpload(userId, name.trim(), mimeType, buffer, folderId || null);
    logAudit(userId, req.user!.username, 'FILE_UPLOAD', `Direct upload "${file.name}" (${file.size} bytes)`, req.ip || null, 'SUCCESS');
    res.json({ success: true, file });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Download File (Streaming decrypted)
fileRouter.get('/:id/download', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const fileId = req.params.id;

  try {
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId) as any;
    if (!file) {
      res.status(404).send('File not found');
      return;
    }

    // Owner and admin can access if needed, or file owner
    if (file.user_id !== userId && req.user!.role !== 'owner' && req.user!.role !== 'admin') {
      res.status(403).send('Access denied');
      return;
    }

    const { buffer } = getDecryptedFile(fileId);

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);

    res.send(buffer);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// 8. Preview File (Inline stream with Range support for video/audio)
fileRouter.get('/:id/preview', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const fileId = req.params.id;

  try {
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId) as any;
    if (!file) {
      res.status(404).send('File not found');
      return;
    }

    if (file.user_id !== userId && req.user!.role !== 'owner' && req.user!.role !== 'admin') {
      res.status(403).send('Access denied');
      return;
    }

    const { buffer } = getDecryptedFile(fileId);
    const totalSize = buffer.length;
    const range = req.headers.range;

    if (range) {
      // Range support for media streaming
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunksize = end - start + 1;
      const slice = buffer.subarray(start, end + 1);

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': file.mime_type || 'application/octet-stream',
      });
      res.end(slice);
    } else {
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Length', totalSize);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
      res.send(buffer);
    }
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// 9. Rename File or Folder
fileRouter.post('/:id/rename', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id;
  const { name, type } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name cannot be empty' });
    return;
  }

  const cleanName = name.trim();
  const now = Date.now();

  if (type === 'folder') {
    const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }
    db.prepare('UPDATE folders SET name = ?, updated_at = ? WHERE id = ?').run(cleanName, now, id);
    logAudit(userId, req.user!.username, 'FOLDER_RENAME', `Renamed folder "${folder.name}" to "${cleanName}"`, req.ip || null, 'SUCCESS');
    res.json({ success: true, name: cleanName });
  } else {
    const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    db.prepare('UPDATE files SET name = ?, updated_at = ? WHERE id = ?').run(cleanName, now, id);
    logAudit(userId, req.user!.username, 'FILE_RENAME', `Renamed file "${file.name}" to "${cleanName}"`, req.ip || null, 'SUCCESS');
    res.json({ success: true, name: cleanName });
  }
});

// 10. Move File or Folder
fileRouter.post('/:id/move', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id;
  const { targetFolderId, type } = req.body;
  const targetId = targetFolderId || null;
  const now = Date.now();

  if (type === 'folder') {
    if (id === targetId) {
      res.status(400).json({ error: 'Cannot move folder into itself' });
      return;
    }
    // Verify target folder exists if specified
    if (targetId) {
      const target = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(targetId, userId);
      if (!target) {
        res.status(404).json({ error: 'Target folder not found' });
        return;
      }
    }
    db.prepare('UPDATE folders SET parent_id = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(targetId, now, id, userId);
    logAudit(userId, req.user!.username, 'FOLDER_MOVE', `Moved folder ${id}`, req.ip || null, 'SUCCESS');
    res.json({ success: true });
  } else {
    if (targetId) {
      const target = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(targetId, userId);
      if (!target) {
        res.status(404).json({ error: 'Target folder not found' });
        return;
      }
    }
    db.prepare('UPDATE files SET folder_id = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(targetId, now, id, userId);
    logAudit(userId, req.user!.username, 'FILE_MOVE', `Moved file ${id}`, req.ip || null, 'SUCCESS');
    res.json({ success: true });
  }
});

// 11. Toggle Star / Favorite
fileRouter.post('/:id/star', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id;

  const file = db.prepare('SELECT is_favorite FROM files WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const newState = file.is_favorite ? 0 : 1;
  db.prepare('UPDATE files SET is_favorite = ?, updated_at = ? WHERE id = ?').run(newState, Date.now(), id);

  res.json({ success: true, isFavorite: newState === 1 });
});

// 12. Move to Trash
fileRouter.post('/:id/trash', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id;
  const type = req.body.type || 'file';
  const now = Date.now();

  if (type === 'folder') {
    db.prepare('UPDATE folders SET is_trashed = 1, trashed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(now, now, id, userId);
    logAudit(userId, req.user!.username, 'FOLDER_TRASH', `Moved folder ${id} to trash`, req.ip || null, 'SUCCESS');
  } else {
    db.prepare('UPDATE files SET is_trashed = 1, trashed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(now, now, id, userId);
    logAudit(userId, req.user!.username, 'FILE_TRASH', `Moved file ${id} to trash`, req.ip || null, 'SUCCESS');
  }

  res.json({ success: true });
});

// 13. Restore from Trash
fileRouter.post('/:id/restore', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id;
  const type = req.body.type || 'file';
  const now = Date.now();

  if (type === 'folder') {
    db.prepare('UPDATE folders SET is_trashed = 0, trashed_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?').run(now, id, userId);
    logAudit(userId, req.user!.username, 'FOLDER_RESTORE', `Restored folder ${id} from trash`, req.ip || null, 'SUCCESS');
  } else {
    db.prepare('UPDATE files SET is_trashed = 0, trashed_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?').run(now, id, userId);
    logAudit(userId, req.user!.username, 'FILE_RESTORE', `Restored file ${id} from trash`, req.ip || null, 'SUCCESS');
  }

  res.json({ success: true });
});

// 14. Permanent Delete
fileRouter.delete('/:id/permanent', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id;
  const type = req.body.type || 'file';

  if (type === 'folder') {
    // Delete all child files in folder
    const childFiles = db.prepare('SELECT id FROM files WHERE folder_id = ? AND user_id = ?').all(id, userId) as any[];
    for (const f of childFiles) {
      permanentlyDeleteFile(f.id, userId);
    }
    db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(id, userId);
    logAudit(userId, req.user!.username, 'FOLDER_DELETE', `Permanently deleted folder ${id}`, req.ip || null, 'SUCCESS');
  } else {
    permanentlyDeleteFile(id, userId);
    logAudit(userId, req.user!.username, 'FILE_DELETE', `Permanently deleted file ${id}`, req.ip || null, 'SUCCESS');
  }

  res.json({ success: true });
});

// 15. Trash List
fileRouter.get('/trash', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const folders = db.prepare('SELECT * FROM folders WHERE user_id = ? AND is_trashed = 1 ORDER BY trashed_at DESC').all(userId) as any[];
  const files = db.prepare('SELECT * FROM files WHERE user_id = ? AND is_trashed = 1 ORDER BY trashed_at DESC').all(userId) as any[];

  res.json({ folders, files });
});

// 16. Empty Trash
fileRouter.post('/empty-trash', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = purgeUserTrash(userId);
  logAudit(userId, req.user!.username, 'TRASH_PURGE', `Emptied trash: ${result.deletedCount} files, freed ${result.freedBytes} bytes`, req.ip || null, 'SUCCESS');
  res.json({ success: true, ...result });
});

// 17. Favorites List
fileRouter.get('/favorites', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const files = db.prepare('SELECT * FROM files WHERE user_id = ? AND is_favorite = 1 AND is_trashed = 0 ORDER BY updated_at DESC').all(userId) as any[];
  res.json({ files });
});

// 18. Recent Files List
fileRouter.get('/recent', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const files = db.prepare(`
    SELECT * FROM files
    WHERE user_id = ? AND is_trashed = 0
    ORDER BY MAX(updated_at, COALESCE(last_accessed_at, 0)) DESC
    LIMIT 25
  `).all(userId) as any[];

  res.json({ files });
});

// 19. Dashboard & Storage Analytics Statistics
fileRouter.get('/stats', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = db.prepare('SELECT storage_quota, storage_used FROM users WHERE id = ?').get(userId) as any;

  const totalFiles = (db.prepare('SELECT COUNT(*) as count FROM files WHERE user_id = ? AND is_trashed = 0').get(userId) as any).count;
  const totalFolders = (db.prepare('SELECT COUNT(*) as count FROM folders WHERE user_id = ? AND is_trashed = 0').get(userId) as any).count;
  const trashedCount = (db.prepare('SELECT COUNT(*) as count FROM files WHERE user_id = ? AND is_trashed = 1').get(userId) as any).count;

  // Breakdown by file category
  const allFiles = db.prepare('SELECT name, mime_type, size FROM files WHERE user_id = ? AND is_trashed = 0').all(userId) as any[];

  const breakdown: Record<string, { count: number; bytes: number }> = {
    images: { count: 0, bytes: 0 },
    videos: { count: 0, bytes: 0 },
    audio: { count: 0, bytes: 0 },
    documents: { count: 0, bytes: 0 },
    archives: { count: 0, bytes: 0 },
    others: { count: 0, bytes: 0 },
  };

  for (const f of allFiles) {
    const cat = getFileCategory(f.mime_type, f.name);
    if (cat === 'image') {
      breakdown.images.count++;
      breakdown.images.bytes += f.size;
    } else if (cat === 'video') {
      breakdown.videos.count++;
      breakdown.videos.bytes += f.size;
    } else if (cat === 'audio') {
      breakdown.audio.count++;
      breakdown.audio.bytes += f.size;
    } else if (cat === 'document') {
      breakdown.documents.count++;
      breakdown.documents.bytes += f.size;
    } else if (cat === 'archive') {
      breakdown.archives.count++;
      breakdown.archives.bytes += f.size;
    } else {
      breakdown.others.count++;
      breakdown.others.bytes += f.size;
    }
  }

  // Recent 6 uploaded files
  const recentUploads = db.prepare('SELECT * FROM files WHERE user_id = ? AND is_trashed = 0 ORDER BY created_at DESC LIMIT 6').all(userId) as any[];

  // Recent 6 opened/accessed files
  const recentOpened = db.prepare('SELECT * FROM files WHERE user_id = ? AND is_trashed = 0 AND last_accessed_at IS NOT NULL ORDER BY last_accessed_at DESC LIMIT 6').all(userId) as any[];

  res.json({
    storageQuota: user.storage_quota,
    storageUsed: user.storage_used,
    storageFree: Math.max(0, user.storage_quota - user.storage_used),
    usagePercent: user.storage_quota > 0 ? Math.min(100, Math.round((user.storage_used / user.storage_quota) * 100)) : 0,
    totalFiles,
    totalFolders,
    trashedCount,
    breakdown,
    recentUploads,
    recentOpened,
  });
});
