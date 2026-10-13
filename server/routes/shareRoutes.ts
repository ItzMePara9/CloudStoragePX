import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { generateId, generateShareToken, hashPassword, verifyPassword } from '../crypto.js';
import { requireAuth, logAudit } from '../auth.js';
import { getDecryptedFile } from '../storage.js';

export const shareRouter = Router();

// Check if sharing is enabled globally
function isSharingEnabled(): boolean {
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'allow_public_sharing'").get() as { value: string } | undefined;
  return setting?.value !== 'false';
}

// 1. Create a share link (Authenticated)
shareRouter.post('/create', requireAuth, (req: Request, res: Response) => {
  if (!isSharingEnabled()) {
    res.status(403).json({ error: 'Public file sharing is currently disabled by the owner.' });
    return;
  }

  const userId = req.user!.id;
  const { fileId, password, expiresInHours, downloadLimit } = req.body;

  if (!fileId) {
    res.status(400).json({ error: 'File ID is required' });
    return;
  }

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ? AND is_trashed = 0').get(fileId, userId) as any;
  if (!file) {
    res.status(404).json({ error: 'File not found or in trash' });
    return;
  }

  const shareToken = generateShareToken();
  const shareId = generateId();
  const now = Date.now();

  let pwdHash: string | null = null;
  let pwdSalt: string | null = null;
  if (password && password.trim()) {
    const hashed = hashPassword(password.trim());
    pwdHash = hashed.hash;
    pwdSalt = hashed.salt;
  }

  let expiresAt: number | null = null;
  if (expiresInHours && parseInt(expiresInHours, 10) > 0) {
    expiresAt = now + parseInt(expiresInHours, 10) * 60 * 60 * 1000;
  }

  const maxDownloads = downloadLimit && parseInt(downloadLimit, 10) > 0 ? parseInt(downloadLimit, 10) : null;

  db.prepare(`
    INSERT INTO shares (id, file_id, user_id, share_token, password_hash, password_salt, expires_at, download_limit, download_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    shareId,
    fileId,
    userId,
    shareToken,
    pwdHash,
    pwdSalt,
    expiresAt,
    maxDownloads,
    now
  );

  logAudit(userId, req.user!.username, 'SHARE_CREATE', `Created share link for "${file.name}"`, req.ip || null, 'SUCCESS');

  res.json({
    success: true,
    share: {
      id: shareId,
      fileId,
      fileName: file.name,
      shareToken,
      hasPassword: !!pwdHash,
      expiresAt,
      downloadLimit: maxDownloads,
      downloadCount: 0,
      createdAt: now,
    },
  });
});

// 2. List user shares (Authenticated)
shareRouter.get('/list', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const shares = db.prepare(`
    SELECT s.id, s.file_id, s.share_token, s.expires_at, s.download_limit, s.download_count, s.created_at,
           s.password_hash IS NOT NULL as has_password,
           f.name as file_name, f.size as file_size, f.mime_type
    FROM shares s
    JOIN files f ON s.file_id = f.id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
  `).all(userId) as any[];

  res.json({ shares });
});

// 3. Revoke share link (Authenticated)
shareRouter.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const shareId = req.params.id;

  const share = db.prepare('SELECT id FROM shares WHERE id = ? AND user_id = ?').get(shareId, userId);
  if (!share) {
    res.status(404).json({ error: 'Share link not found' });
    return;
  }

  db.prepare('DELETE FROM shares WHERE id = ?').run(shareId);
  logAudit(userId, req.user!.username, 'SHARE_REVOKE', `Revoked share ${shareId}`, req.ip || null, 'SUCCESS');

  res.json({ success: true });
});

// 4. Public share metadata (Public)
shareRouter.get('/public/:token', (req: Request, res: Response) => {
  if (!isSharingEnabled()) {
    res.status(403).json({ error: 'Public sharing is currently disabled on this server.' });
    return;
  }

  const token = req.params.token;
  const share = db.prepare(`
    SELECT s.id, s.file_id, s.share_token, s.expires_at, s.download_limit, s.download_count,
           s.password_hash IS NOT NULL as requires_password,
           f.name as file_name, f.size as file_size, f.mime_type, f.is_trashed
    FROM shares s
    JOIN files f ON s.file_id = f.id
    WHERE s.share_token = ?
  `).get(token) as any;

  if (!share || share.is_trashed) {
    res.status(404).json({ error: 'Share link not found or file has been removed.' });
    return;
  }

  const now = Date.now();
  const isExpired = share.expires_at !== null && now > share.expires_at;
  const isLimitReached = share.download_limit !== null && share.download_count >= share.download_limit;

  res.json({
    token: share.share_token,
    fileName: share.file_name,
    fileSize: share.file_size,
    mimeType: share.mime_type,
    requiresPassword: !!share.requires_password,
    isExpired,
    isLimitReached,
    expiresAt: share.expires_at,
    downloadsRemaining: share.download_limit ? Math.max(0, share.download_limit - share.download_count) : null,
  });
});

// 5. Public download (Public with optional password check)
shareRouter.all('/public/:token/download', (req: Request, res: Response) => {
  if (!isSharingEnabled()) {
    res.status(403).send('Sharing is disabled');
    return;
  }

  const token = req.params.token;
  const share = db.prepare(`
    SELECT s.*, f.name as file_name, f.size as file_size, f.mime_type, f.is_trashed
    FROM shares s
    JOIN files f ON s.file_id = f.id
    WHERE s.share_token = ?
  `).get(token) as any;

  if (!share || share.is_trashed) {
    res.status(404).send('Share not found or file deleted');
    return;
  }

  const now = Date.now();
  if (share.expires_at && now > share.expires_at) {
    res.status(410).send('Share link has expired');
    return;
  }

  if (share.download_limit && share.download_count >= share.download_limit) {
    res.status(410).send('Download limit for this link has been reached');
    return;
  }

  // Password verification if required
  if (share.password_hash) {
    const providedPassword = (req.query.password as string) || (req.headers['x-share-password'] as string) || (req.body?.password as string);
    if (!providedPassword || !verifyPassword(providedPassword, share.password_hash, share.password_salt)) {
      res.status(401).send('Invalid or missing password for protected share');
      return;
    }
  }

  try {
    const { buffer } = getDecryptedFile(share.file_id);

    // Increment download count
    db.prepare('UPDATE shares SET download_count = download_count + 1 WHERE id = ?').run(share.id);
    logAudit(null, 'Public Guest', 'SHARE_DOWNLOAD', `Downloaded shared file "${share.file_name}" via link ${token.slice(0, 8)}...`, req.ip || null, 'SUCCESS');

    res.setHeader('Content-Type', share.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(share.file_name)}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// 6. Public Preview for shared media
shareRouter.get('/public/:token/preview', (req: Request, res: Response) => {
  if (!isSharingEnabled()) {
    res.status(403).send('Sharing is disabled');
    return;
  }

  const token = req.params.token;
  const share = db.prepare(`
    SELECT s.*, f.name as file_name, f.size as file_size, f.mime_type, f.is_trashed
    FROM shares s
    JOIN files f ON s.file_id = f.id
    WHERE s.share_token = ?
  `).get(token) as any;

  if (!share || share.is_trashed) {
    res.status(404).send('Not found');
    return;
  }

  if (share.password_hash) {
    const providedPassword = (req.query.password as string) || (req.headers['x-share-password'] as string);
    if (!providedPassword || !verifyPassword(providedPassword, share.password_hash, share.password_salt)) {
      res.status(401).send('Password required');
      return;
    }
  }

  try {
    const { buffer } = getDecryptedFile(share.file_id);
    res.setHeader('Content-Type', share.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(share.file_name)}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});
