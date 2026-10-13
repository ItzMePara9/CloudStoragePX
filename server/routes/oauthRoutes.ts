import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { generateSessionToken, generateId, hashPassword } from '../crypto.js';
import { logAudit } from '../auth.js';

export const oauthRouter = Router();

// In-memory state tracking to prevent CSRF in OAuth flows
const activeOAuthStates = new Set<string>();

// Clean up states older than 10 minutes
setInterval(() => {
  activeOAuthStates.clear();
}, 10 * 60 * 1000).unref();

function getAppBaseUrl(req: Request): string {
  // Prefer configured APP_URL, fallback to request origin
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${protocol}://${host}`;
}

function getGoogleCallbackUrl(req: Request): string {
  return process.env.GOOGLE_CALLBACK_URL || `${getAppBaseUrl(req)}/api/auth/oauth/google/callback`;
}

function getGithubCallbackUrl(req: Request): string {
  return process.env.GITHUB_CALLBACK_URL || `${getAppBaseUrl(req)}/api/auth/oauth/github/callback`;
}

// 0. OAuth Status & Config endpoint
oauthRouter.get('/config', (req: Request, res: Response) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const githubClientId = process.env.GITHUB_CLIENT_ID || '';
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET || '';

  res.json({
    google: {
      configured: Boolean(googleClientId && googleClientSecret),
      clientId: googleClientId ? `${googleClientId.slice(0, 12)}...` : null,
      callbackUrl: getGoogleCallbackUrl(req),
    },
    github: {
      configured: Boolean(githubClientId && githubClientSecret),
      clientId: githubClientId ? `${githubClientId.slice(0, 8)}...` : null,
      callbackUrl: getGithubCallbackUrl(req),
    },
    appBaseUrl: getAppBaseUrl(req),
  });
});

// 1. Google OAuth URL
oauthRouter.get('/google/url', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(400).json({
      error: 'Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env',
      code: 'GOOGLE_NOT_CONFIGURED',
      callbackUrl: getGoogleCallbackUrl(req),
    });
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  activeOAuthStates.add(state);

  const redirectUri = getGoogleCallbackUrl(req);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl, callbackUrl: redirectUri });
});

// 2. Google OAuth Callback
oauthRouter.get(['/google/callback', '/google/callback/'], async (req: Request, res: Response) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    res.send(renderPopupHtml(false, `Google authentication cancelled: ${oauthError}`));
    return;
  }

  if (!code || typeof code !== 'string') {
    res.send(renderPopupHtml(false, 'Missing authorization code from Google.'));
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.send(renderPopupHtml(false, 'Google OAuth credentials not configured on server.'));
    return;
  }

  try {
    const redirectUri = getGoogleCallbackUrl(req);

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const tokenErr = await tokenResponse.text();
      console.error('Google token exchange error:', tokenErr);
      res.send(renderPopupHtml(false, 'Failed to exchange authorization code with Google.'));
      return;
    }

    const tokenData = (await tokenResponse.json()) as any;
    const accessToken = tokenData.access_token;

    // Fetch user profile from OpenID Connect endpoint
    const userinfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoResponse.ok) {
      res.send(renderPopupHtml(false, 'Failed to fetch user profile from Google.'));
      return;
    }

    const profile = (await userinfoResponse.json()) as any;
    const providerUserId = profile.sub;
    const email = profile.email?.toLowerCase();
    const emailVerified = Boolean(profile.email_verified);
    const displayName = profile.name || profile.given_name || 'Google User';
    const avatarUrl = profile.picture || null;

    if (!email || !emailVerified) {
      res.send(renderPopupHtml(false, 'A verified email address is required from your Google account.'));
      return;
    }

    // Authenticate / Link / Create user
    const user = await authenticateOAuthUser({
      provider: 'google',
      providerUserId,
      email,
      displayName,
      avatarUrl,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || '',
      res,
    });

    res.send(renderPopupHtml(true, 'Authentication successful!', user.username));
  } catch (err: any) {
    console.error('Google OAuth error:', err);
    res.send(renderPopupHtml(false, err.message || 'An unexpected error occurred during Google sign in.'));
  }
});

// 3. GitHub OAuth URL
oauthRouter.get('/github/url', (req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(400).json({
      error: 'GitHub OAuth is not configured. Please add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env',
      code: 'GITHUB_NOT_CONFIGURED',
      callbackUrl: getGithubCallbackUrl(req),
    });
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  activeOAuthStates.add(state);

  const redirectUri = getGithubCallbackUrl(req);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.json({ url: authUrl, callbackUrl: redirectUri });
});

// 4. GitHub OAuth Callback
oauthRouter.get(['/github/callback', '/github/callback/'], async (req: Request, res: Response) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    res.send(renderPopupHtml(false, `GitHub authentication cancelled: ${oauthError}`));
    return;
  }

  if (!code || typeof code !== 'string') {
    res.send(renderPopupHtml(false, 'Missing authorization code from GitHub.'));
    return;
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.send(renderPopupHtml(false, 'GitHub OAuth credentials not configured on server.'));
    return;
  }

  try {
    const redirectUri = getGithubCallbackUrl(req);

    // Exchange code for GitHub access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      res.send(renderPopupHtml(false, 'Failed to exchange authorization code with GitHub.'));
      return;
    }

    const tokenData = (await tokenResponse.json()) as any;
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      res.send(renderPopupHtml(false, tokenData.error_description || 'Invalid token response from GitHub.'));
      return;
    }

    // Fetch GitHub User profile
    const userProfileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'CloudStoragePX-OAuth',
      },
    });

    if (!userProfileResponse.ok) {
      res.send(renderPopupHtml(false, 'Failed to fetch GitHub user details.'));
      return;
    }

    const profile = (await userProfileResponse.json()) as any;
    const providerUserId = String(profile.id);
    const displayName = profile.name || profile.login;
    const avatarUrl = profile.avatar_url || null;

    // Fetch verified emails from GitHub
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'CloudStoragePX-OAuth',
      },
    });

    let verifiedEmail = profile.email?.toLowerCase() || null;

    if (emailsResponse.ok) {
      const emailsList = (await emailsResponse.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primaryVerified = emailsList.find((e) => e.primary && e.verified);
      const anyVerified = emailsList.find((e) => e.verified);
      if (primaryVerified) {
        verifiedEmail = primaryVerified.email.toLowerCase();
      } else if (anyVerified) {
        verifiedEmail = anyVerified.email.toLowerCase();
      }
    }

    if (!verifiedEmail) {
      res.send(renderPopupHtml(false, 'Your GitHub account does not have a verified email address.'));
      return;
    }

    // Authenticate / Link / Create user
    const user = await authenticateOAuthUser({
      provider: 'github',
      providerUserId,
      email: verifiedEmail,
      displayName,
      avatarUrl,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || '',
      res,
    });

    res.send(renderPopupHtml(true, 'Authentication successful!', user.username));
  } catch (err: any) {
    console.error('GitHub OAuth error:', err);
    res.send(renderPopupHtml(false, err.message || 'An unexpected error occurred during GitHub sign in.'));
  }
});

// Helper: Common OAuth user resolver, linker, and session creator
async function authenticateOAuthUser({
  provider,
  providerUserId,
  email,
  displayName,
  avatarUrl,
  ipAddress,
  userAgent,
  res,
}: {
  provider: 'google' | 'github';
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  ipAddress: string | null;
  userAgent: string;
  res: Response;
}): Promise<any> {
  const now = Date.now();

  // 1. Check if OAuth account link already exists
  const existingLink = db
    .prepare('SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?')
    .get(provider, providerUserId) as { user_id: string } | undefined;

  let targetUserId: string;

  if (existingLink) {
    targetUserId = existingLink.user_id;
  } else {
    // 2. Check if a user with this email already exists
    const existingUser = db.prepare('SELECT id, status FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;

    if (existingUser) {
      if (existingUser.status === 'suspended') {
        throw new Error('Your account has been suspended by an administrator.');
      }
      targetUserId = existingUser.id;
    } else {
      // 3. New account creation - Check registration mode
      const regModeSetting = db.prepare("SELECT value FROM settings WHERE key = 'registration_mode'").get() as
        | { value: string }
        | undefined;
      const regMode = regModeSetting?.value || 'open';

      if (regMode === 'closed') {
        throw new Error('New account registrations are currently closed by the owner.');
      }

      // Generate a unique clean username from display name or email prefix
      let baseUsername = (displayName || email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .slice(0, 20);
      if (!baseUsername || baseUsername.length < 3) baseUsername = `${provider}_user`;

      let candidateUsername = baseUsername;
      let counter = 1;
      while (db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(candidateUsername)) {
        candidateUsername = `${baseUsername}_${counter}`;
        counter++;
      }

      const defaultQuotaSetting = db
        .prepare("SELECT value FROM settings WHERE key = 'default_quota_bytes'")
        .get() as { value: string } | undefined;
      const defaultQuota = defaultQuotaSetting ? parseInt(defaultQuotaSetting.value, 10) : 5368709120;

      // Check if this is the very first user (if so, make OWNER)
      const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
      const assignedRole = userCount === 0 ? 'owner' : 'member';

      targetUserId = generateId();
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const { hash, salt } = hashPassword(randomPassword);

      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, salt, role, status, storage_quota, storage_used, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 0, ?, ?)
      `).run(
        targetUserId,
        candidateUsername,
        email,
        hash,
        salt,
        assignedRole,
        defaultQuota,
        now,
        now
      );

      logAudit(
        targetUserId,
        candidateUsername,
        'OAUTH_REGISTER',
        `New account registered via ${provider.toUpperCase()}`,
        ipAddress,
        'SUCCESS'
      );
    }

    // Link provider identity in oauth_accounts
    db.prepare(`
      INSERT OR REPLACE INTO oauth_accounts (id, user_id, provider, provider_user_id, email, display_name, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId(),
      targetUserId,
      provider,
      providerUserId,
      email,
      displayName,
      avatarUrl,
      now
    );
  }

  // Fetch full user record
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
  if (!user || user.status === 'suspended') {
    throw new Error('Account inactive or suspended.');
  }

  // Update last login
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);

  // Issue session token
  const { rawToken, tokenHash } = generateSessionToken();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

  db.prepare(`
    INSERT INTO sessions (token_hash, user_id, expires_at, created_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tokenHash, user.id, expiresAt, now, userAgent, ipAddress || '');

  // Set session cookie configured for both standard and iframe preview contexts
  res.cookie('cs_session', rawToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  logAudit(
    user.id,
    user.username,
    'OAUTH_LOGIN',
    `Authenticated via ${provider.toUpperCase()}`,
    ipAddress,
    'SUCCESS'
  );

  return user;
}

// Helper: Render cross-origin popup postMessage response
function renderPopupHtml(success: boolean, message: string, username?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${success ? 'Authentication Complete' : 'Authentication Error'}</title>
    <style>
      body {
        background-color: #0b0f19;
        color: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        text-align: center;
        padding: 20px;
      }
      .card {
        background-color: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      }
      .title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
        color: ${success ? '#34d399' : '#f87171'};
      }
      .desc {
        font-size: 13px;
        color: #94a3b8;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="title">${success ? '✓ Successfully Signed In' : '✕ Sign In Failed'}</div>
      <div class="desc">${message}</div>
      <p class="desc" style="font-size: 11px; margin-top: 16px;">This window will close automatically...</p>
    </div>
    <script>
      (function() {
        const payload = {
          type: '${success ? 'OAUTH_AUTH_SUCCESS' : 'OAUTH_AUTH_ERROR'}',
          message: ${JSON.stringify(message)},
          username: ${JSON.stringify(username || null)}
        };
        if (window.opener) {
          window.opener.postMessage(payload, '*');
          setTimeout(() => {
            window.close();
          }, 800);
        } else {
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        }
      })();
    </script>
  </body>
</html>`;
}
