import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { db } from '../db.js';
import { hashPassword } from '../crypto.js';
import { requireAuth, requireRole, logAudit } from '../auth.js';
import { VAULT_DIR, permanentlyDeleteFile } from '../storage.js';

export const adminRouter = Router();

// All admin routes require at least 'admin' or 'owner' role
adminRouter.use(requireAuth);
adminRouter.use(requireRole(['owner', 'admin']));

// 1. List Users
adminRouter.get('/users', (req: Request, res: Response) => {
  const search = req.query.search ? String(req.query.search).trim() : '';
  const roleFilter = req.query.role ? String(req.query.role) : '';
  const statusFilter = req.query.status ? String(req.query.status) : '';

  let query = 'SELECT id, username, email, role, status, storage_quota, storage_used, created_at, last_login_at FROM users WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (LOWER(username) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (roleFilter) {
    query += ' AND role = ?';
    params.push(roleFilter);
  }

  if (statusFilter) {
    query += ' AND status = ?';
    params.push(statusFilter);
  }

  query += ' ORDER BY created_at DESC';

  const users = db.prepare(query).all(...params);
  res.json({ users });
});

// 2. Update User Storage Quota
adminRouter.post('/users/:id/quota', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const { quotaBytes } = req.body;

  if (quotaBytes === undefined || isNaN(Number(quotaBytes)) || Number(quotaBytes) < 0) {
    res.status(400).json({ error: 'Valid quota in bytes is required' });
    return;
  }

  const target = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(targetId) as any;
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Admin cannot change Owner quota
  if (target.role === 'owner' && req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only the owner can modify owner storage quotas.' });
    return;
  }

  db.prepare('UPDATE users SET storage_quota = ? WHERE id = ?').run(Number(quotaBytes), targetId);
  logAudit(req.user!.id, req.user!.username, 'USER_QUOTA_UPDATE', `Updated quota for ${target.username} to ${quotaBytes} bytes`, req.ip || null, 'SUCCESS');

  res.json({ success: true, quotaBytes: Number(quotaBytes) });
});

// 3. Update User Status (Suspend / Activate)
adminRouter.post('/users/:id/status', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    res.status(400).json({ error: 'Status must be active or suspended' });
    return;
  }

  const target = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(targetId) as any;
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (target.role === 'owner') {
    res.status(403).json({ error: 'The installation owner account cannot be suspended.' });
    return;
  }

  if (target.role === 'admin' && req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only the owner can suspend administrator accounts.' });
    return;
  }

  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, targetId);

  // If suspending, invalidate all sessions immediately
  if (status === 'suspended') {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
  }

  logAudit(req.user!.id, req.user!.username, 'USER_STATUS_CHANGE', `Changed ${target.username} status to ${status}`, req.ip || null, 'SUCCESS');

  res.json({ success: true, status });
});

// 4. Update Role (Owner Only)
adminRouter.post('/users/:id/role', (req: Request, res: Response) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only the owner can change user roles.' });
    return;
  }

  const targetId = req.params.id;
  const { role } = req.body;

  if (!['admin', 'member'].includes(role)) {
    res.status(400).json({ error: 'Role must be admin or member' });
    return;
  }

  const target = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(targetId) as any;
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (target.id === req.user!.id) {
    res.status(400).json({ error: 'Cannot demote the primary owner account.' });
    return;
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
  logAudit(req.user!.id, req.user!.username, 'USER_ROLE_CHANGE', `Changed ${target.username} role to ${role}`, req.ip || null, 'SUCCESS');

  res.json({ success: true, role });
});

// 5. Reset Password for User
adminRouter.post('/users/:id/reset-password', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }

  const target = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(targetId) as any;
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (target.role === 'owner' && req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only the owner can reset owner credentials.' });
    return;
  }

  const { hash, salt } = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, targetId);

  // Terminate active sessions for that user
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);

  logAudit(req.user!.id, req.user!.username, 'PASSWORD_RESET', `Reset password for user ${target.username}`, req.ip || null, 'SUCCESS');

  res.json({ success: true });
});

// 6. Delete User Account and Files (Owner Only)
adminRouter.delete('/users/:id', (req: Request, res: Response) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only the installation owner can delete user accounts.' });
    return;
  }

  const targetId = req.params.id;
  if (targetId === req.user!.id) {
    res.status(400).json({ error: 'Cannot delete your own owner account.' });
    return;
  }

  const target = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetId) as any;
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Delete all physical files belonging to user
  const userFiles = db.prepare('SELECT id FROM files WHERE user_id = ?').all(targetId) as any[];
  for (const f of userFiles) {
    permanentlyDeleteFile(f.id, targetId, true);
  }

  // Cascade delete in DB
  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);

  logAudit(req.user!.id, req.user!.username, 'USER_DELETE', `Deleted account and all files for ${target.username}`, req.ip || null, 'WARNING');

  res.json({ success: true });
});

// 7. Get Global Settings
adminRouter.get('/settings', (req: Request, res: Response) => {
  const settingsRows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const row of settingsRows) {
    settings[row.key] = row.value;
  }
  res.json({ settings });
});

// 8. Update Global Settings (Owner Only)
adminRouter.post('/settings', (req: Request, res: Response) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only the owner can update system settings.' });
    return;
  }

  const updates = req.body;
  const allowedKeys = [
    'app_name',
    'tagline',
    'registration_mode',
    'default_quota_bytes',
    'max_upload_size_bytes',
    'chunk_size_bytes',
    'allow_public_sharing',
    'accent_color',
    'logo_url',
    'maintenance_mode',
  ];

  const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  for (const [key, val] of Object.entries(updates)) {
    if (allowedKeys.includes(key)) {
      updateStmt.run(key, String(val));
    }
  }

  logAudit(req.user!.id, req.user!.username, 'SETTINGS_UPDATE', 'Updated system configuration', req.ip || null, 'SUCCESS');

  res.json({ success: true });
});

// 9. Audit Logs Viewer
adminRouter.get('/logs', (req: Request, res: Response) => {
  const limit = Math.min(100, parseInt(String(req.query.limit || '50'), 10));
  const offset = parseInt(String(req.query.offset || '0'), 10);
  const action = req.query.action ? String(req.query.action) : '';
  const status = req.query.status ? String(req.query.status) : '';

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const logs = db.prepare(query).all(...params);
  const total = (db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as any).count;

  res.json({ logs, total });
});

// 10. System Health & Diagnostics
adminRouter.get('/health', (req: Request, res: Response) => {
  const mem = process.memoryUsage();
  const uptime = process.uptime();

  // Vault files disk stats
  let totalVaultFiles = 0;
  let totalVaultBytes = 0;
  if (fs.existsSync(VAULT_DIR)) {
    const fileNames = fs.readdirSync(VAULT_DIR);
    totalVaultFiles = fileNames.length;
    for (const fn of fileNames) {
      try {
        const stats = fs.statSync(path.join(VAULT_DIR, fn));
        totalVaultBytes += stats.size;
      } catch {}
    }
  }

  // Database size
  let dbBytes = 0;
  const dbPath = path.resolve(process.cwd(), 'data', 'cloudstorage.db');
  if (fs.existsSync(dbPath)) {
    try {
      dbBytes = fs.statSync(dbPath).size;
    } catch {}
  }

  // Total system disk space estimation
  const freeSysMem = os.freemem();
  const totalSysMem = os.totalmem();

  const userStats = {
    totalUsers: (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c,
    activeUsers: (db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active'").get() as any).c,
    activeSessions: (db.prepare('SELECT COUNT(*) as c FROM sessions WHERE expires_at > ?').get(Date.now()) as any).c,
  };

  res.json({
    status: 'HEALTHY',
    system: {
      nodeVersion: process.version,
      platform: `${os.platform()} (${os.arch()})`,
      cpuCount: os.cpus().length,
      uptimeSeconds: Math.floor(uptime),
      memoryRssBytes: mem.rss,
      memoryHeapUsedBytes: mem.heapUsed,
      memoryHeapTotalBytes: mem.heapTotal,
      systemFreeMemoryBytes: freeSysMem,
      systemTotalMemoryBytes: totalSysMem,
    },
    storage: {
      vaultFileCount: totalVaultFiles,
      vaultEncryptedBytes: totalVaultBytes,
      databaseSizeBytes: dbBytes,
      encryptionAlgorithm: 'AES-256-GCM (Authenticated)',
      hashingAlgorithm: 'Scrypt (N=16384, r=8, p=1)',
    },
    users: userStats,
  });
});

// 11. Create Backup (Owner Only)
adminRouter.get('/backup/create', (req: Request, res: Response) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only the owner can generate system backups.' });
    return;
  }

  try {
    const users = db.prepare('SELECT id, username, email, password_hash, salt, role, status, storage_quota, storage_used, created_at, last_login_at FROM users').all();
    const settings = db.prepare('SELECT key, value FROM settings').all();
    const folders = db.prepare('SELECT * FROM folders').all();
    const files = db.prepare('SELECT * FROM files').all();
    const shares = db.prepare('SELECT * FROM shares').all();

    const backupPayload = {
      version: '1.0.0',
      timestamp: Date.now(),
      created_by: req.user!.username,
      users,
      settings,
      folders,
      files,
      shares,
    };

    const jsonStr = JSON.stringify(backupPayload, null, 2);

    logAudit(req.user!.id, req.user!.username, 'BACKUP_CREATE', 'Created database backup archive', req.ip || null, 'SUCCESS');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="cloudstoragepx_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json"`);
    res.send(jsonStr);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
