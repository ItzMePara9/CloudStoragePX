import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { hashSessionToken, generateId } from './crypto.js';

export interface UserSession {
  id: string;
  username: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'suspended';
  storage_quota: number;
  storage_used: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserSession;
      csrfToken?: string;
    }
  }
}

// In-memory rate limiter for auth routes
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimitRecord>();

export function authRateLimiter(windowMs: number = 60 * 1000, maxRequests: number = 10) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimits.get(ip);

    if (!record || now > record.resetAt) {
      rateLimits.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    record.count++;
    if (record.count > maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }

    next();
  };
}

// Parse cookie string
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      const val = decodeURIComponent(parts.join('='));
      list[name] = val;
    }
  });

  return list;
}

// Audit Logger helper
export function logAudit(
  userId: string | null,
  username: string | null,
  action: string,
  details: string,
  ipAddress: string | null,
  status: 'SUCCESS' | 'FAILURE' | 'WARNING' = 'SUCCESS'
) {
  try {
    const now = Date.now();
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, username, action, details, ip_address, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId(),
      userId,
      username,
      action,
      details,
      ipAddress || 'unknown',
      status,
      now
    );
  } catch (e) {
    console.error('Audit log write error:', e);
  }
}

// Session authentication middleware
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies['cs_session'];

  if (!rawToken) {
    next();
    return;
  }

  try {
    const tokenHash = hashSessionToken(rawToken);
    const now = Date.now();

    const session = db.prepare(`
      SELECT s.user_id, s.expires_at, u.id, u.username, u.email, u.role, u.status, u.storage_quota, u.storage_used
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > ?
    `).get(tokenHash, now) as any;

    if (session) {
      if (session.status === 'suspended') {
        res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
        return;
      }

      req.user = {
        id: session.id,
        username: session.username,
        email: session.email,
        role: session.role,
        status: session.status,
        storage_quota: session.storage_quota,
        storage_used: session.storage_used,
      };
    }
  } catch (err) {
    console.error('Session validation error:', err);
  }

  next();
}

// Require authenticated user
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  // Maintenance mode check
  const maintenanceMode = db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get() as { value: string } | undefined;
  if (maintenanceMode?.value === 'true' && req.user.role !== 'owner') {
    res.status(503).json({ error: 'CloudStoragePX is currently undergoing system maintenance. Please check back shortly.' });
    return;
  }

  next();
}

// Role authorization
export function requireRole(allowedRoles: Array<'owner' | 'admin' | 'member'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied: insufficient administrative privileges.' });
      return;
    }
    next();
  };
}
