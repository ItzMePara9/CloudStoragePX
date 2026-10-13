import { Router } from 'express';
import { db } from '../db.js';
import { hashPassword, verifyPassword, generateSessionToken, generateId } from '../crypto.js';
import { authRateLimiter, logAudit, requireAuth } from '../auth.js';

export const authRouter = Router();

// Setup status: check if the system already has an owner
authRouter.get('/setup-status', (req, res) => {
  const ownerCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner'").get() as { count: number };
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  res.json({
    isConfigured: ownerCount.count > 0,
    totalUsers: userCount.count,
  });
});

function setSessionCookie(res: any, req: any, rawToken: string) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production' || Boolean(process.env.APP_URL?.startsWith('https'));
  res.cookie('cs_session', rawToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

// Initial Setup Wizard for OWNER
authRouter.post('/setup', authRateLimiter(60000, 5), (req, res) => {
  const ownerCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner'").get() as { count: number };
  if (ownerCount.count > 0) {
    res.status(403).json({ error: 'System has already been initialized with an owner.' });
    return;
  }

  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email, and password are required.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }

  const { hash, salt } = hashPassword(password);
  const userId = generateId();
  const now = Date.now();

  try {
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, salt, role, status, storage_quota, storage_used, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, 'owner', 'active', ?, 0, ?, ?)
    `).run(
      userId,
      username.trim(),
      email.trim().toLowerCase(),
      hash,
      salt,
      107374182400, // 100 GB for owner by default
      now,
      now
    );

    // Create session
    const { rawToken, tokenHash } = generateSessionToken();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    db.prepare(`
      INSERT INTO sessions (token_hash, user_id, expires_at, created_at, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      tokenHash,
      userId,
      expiresAt,
      now,
      req.headers['user-agent'] || '',
      req.ip || ''
    );

    setSessionCookie(res, req, rawToken);

    logAudit(userId, username, 'SETUP_OWNER', 'Initial Owner account successfully provisioned', req.ip || null, 'SUCCESS');

    res.json({
      success: true,
      user: {
        id: userId,
        username,
        email,
        role: 'owner',
        status: 'active',
        storage_quota: 107374182400,
        storage_used: 0,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to setup owner account' });
  }
});

// Login
authRouter.post('/login', authRateLimiter(60000, 10), (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    res.status(400).json({ error: 'Username/email and password are required.' });
    return;
  }

  const user = db.prepare(`
    SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
  `).get(login.trim(), login.trim()) as any;

  if (!user) {
    logAudit(null, login, 'LOGIN_FAILED', 'Account not found', req.ip || null, 'FAILURE');
    res.status(401).json({ error: 'Invalid login credentials.' });
    return;
  }

  if (user.status === 'suspended') {
    logAudit(user.id, user.username, 'LOGIN_BLOCKED', 'Suspended account attempted login', req.ip || null, 'WARNING');
    res.status(403).json({ error: 'Your account is suspended. Please contact the administrator.' });
    return;
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    logAudit(user.id, user.username, 'LOGIN_FAILED', 'Incorrect password', req.ip || null, 'FAILURE');
    res.status(401).json({ error: 'Invalid login credentials.' });
    return;
  }

  const now = Date.now();
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);

  // Generate session
  const { rawToken, tokenHash } = generateSessionToken();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

  db.prepare(`
    INSERT INTO sessions (token_hash, user_id, expires_at, created_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    tokenHash,
    user.id,
    expiresAt,
    now,
    req.headers['user-agent'] || '',
    req.ip || ''
  );

  setSessionCookie(res, req, rawToken);

  logAudit(user.id, user.username, 'LOGIN', 'Successful user authentication', req.ip || null, 'SUCCESS');

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      storage_quota: user.storage_quota,
      storage_used: user.storage_used,
    },
  });
});

// Register
authRouter.post('/register', authRateLimiter(60000, 5), (req, res) => {
  const regModeSetting = db.prepare("SELECT value FROM settings WHERE key = 'registration_mode'").get() as { value: string } | undefined;
  const regMode = regModeSetting?.value || 'open';

  if (regMode === 'closed') {
    res.status(403).json({ error: 'New user registrations are currently disabled by the owner.' });
    return;
  }

  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }

  // Check duplicates
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)').get(username.trim(), email.trim()) as any;
  if (existing) {
    res.status(409).json({ error: 'A user with that username or email already exists.' });
    return;
  }

  const defaultQuotaSetting = db.prepare("SELECT value FROM settings WHERE key = 'default_quota_bytes'").get() as { value: string } | undefined;
  const defaultQuota = defaultQuotaSetting ? parseInt(defaultQuotaSetting.value, 10) : 5368709120;

  const { hash, salt } = hashPassword(password);
  const userId = generateId();
  const now = Date.now();

  try {
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, salt, role, status, storage_quota, storage_used, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, 'member', 'active', ?, 0, ?, ?)
    `).run(
      userId,
      username.trim(),
      email.trim().toLowerCase(),
      hash,
      salt,
      defaultQuota,
      now,
      now
    );

    // Create session immediately
    const { rawToken, tokenHash } = generateSessionToken();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

    db.prepare(`
      INSERT INTO sessions (token_hash, user_id, expires_at, created_at, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      tokenHash,
      userId,
      expiresAt,
      now,
      req.headers['user-agent'] || '',
      req.ip || ''
    );

    setSessionCookie(res, req, rawToken);

    logAudit(userId, username, 'REGISTER', 'New member self-registration', req.ip || null, 'SUCCESS');

    res.json({
      success: true,
      user: {
        id: userId,
        username,
        email,
        role: 'member',
        status: 'active',
        storage_quota: defaultQuota,
        storage_used: 0,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

// Logout
authRouter.post('/logout', (req, res) => {
  const cookies = (req as any).cookies || {};
  const rawToken = req.headers.cookie ? (req as any).cookies?.cs_session : null;

  if (req.user) {
    logAudit(req.user.id, req.user.username, 'LOGOUT', 'User signed out', req.ip || null, 'SUCCESS');
  }

  res.clearCookie('cs_session', { path: '/' });
  res.json({ success: true });
});

// Current User Profile & App Branding
authRouter.get('/me', (req, res) => {
  const settingsRows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const settingsMap: Record<string, string> = {};
  settingsRows.forEach((row) => {
    settingsMap[row.key] = row.value;
  });

  if (!req.user) {
    res.json({
      authenticated: false,
      user: null,
      branding: {
        appName: settingsMap['app_name'] || 'CloudStoragePX',
        tagline: settingsMap['tagline'] || 'Your Cloud. Your Control.',
        logoUrl: settingsMap['logo_url'] || '/logo.png',
        accentColor: settingsMap['accent_color'] || '#6366f1',
        registrationMode: settingsMap['registration_mode'] || 'open',
        maintenanceMode: settingsMap['maintenance_mode'] === 'true',
        allowPublicSharing: settingsMap['allow_public_sharing'] === 'true',
      },
    });
    return;
  }

  // Refresh latest storage stats from db
  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;

  res.json({
    authenticated: true,
    user: {
      id: freshUser.id,
      username: freshUser.username,
      email: freshUser.email,
      role: freshUser.role,
      status: freshUser.status,
      storage_quota: freshUser.storage_quota,
      storage_used: freshUser.storage_used,
      createdAt: freshUser.created_at,
      lastLoginAt: freshUser.last_login_at,
    },
    branding: {
      appName: settingsMap['app_name'] || 'CloudStoragePX',
      tagline: settingsMap['tagline'] || 'Your Cloud. Your Control.',
      logoUrl: settingsMap['logo_url'] || '/logo.png',
      accentColor: settingsMap['accent_color'] || '#6366f1',
      registrationMode: settingsMap['registration_mode'] || 'open',
      maintenanceMode: settingsMap['maintenance_mode'] === 'true',
      allowPublicSharing: settingsMap['allow_public_sharing'] === 'true',
      maxUploadSize: parseInt(settingsMap['max_upload_size_bytes'] || '10737418240', 10),
      chunkSize: parseInt(settingsMap['chunk_size_bytes'] || '5242880', 10),
    },
  });
});

// Update Profile / Password
authRouter.post('/profile', requireAuth, (req, res) => {
  const userId = req.user!.id;
  const { currentPassword, newPassword, email, username } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // If changing password, verify current password
  if (newPassword) {
    if (!currentPassword) {
      res.status(400).json({ error: 'Current password is required to change your password.' });
      return;
    }
    if (!verifyPassword(currentPassword, user.password_hash, user.salt)) {
      res.status(400).json({ error: 'Current password does not match.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    const { hash, salt } = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, userId);
    logAudit(userId, user.username, 'PASSWORD_CHANGE', 'User updated account password', req.ip || null, 'SUCCESS');
  }

  // Update email/username if provided
  if (email && email !== user.email) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
    if (existing) {
      res.status(409).json({ error: 'Email already taken by another account.' });
      return;
    }
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email.trim().toLowerCase(), userId);
  }

  if (username && username !== user.username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
    if (existing) {
      res.status(409).json({ error: 'Username already taken by another account.' });
      return;
    }
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username.trim(), userId);
  }

  const updated = db.prepare('SELECT id, username, email, role, status, storage_quota, storage_used FROM users WHERE id = ?').get(userId);
  res.json({ success: true, user: updated });
});
