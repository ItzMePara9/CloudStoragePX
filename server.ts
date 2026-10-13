import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initDatabase } from './server/db.js';
import { authMiddleware } from './server/auth.js';
import { authRouter } from './server/routes/authRoutes.js';
import { fileRouter } from './server/routes/fileRoutes.js';
import { shareRouter } from './server/routes/shareRoutes.js';
import { adminRouter } from './server/routes/adminRoutes.js';
import { oauthRouter } from './server/routes/oauthRoutes.js';

dotenv.config();

// Initialize Database & Vault Schema
initDatabase();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.raw({ limit: '100mb', type: ['application/octet-stream', 'application/x-binary'] }));

// Auth & Session Middleware
app.use(authMiddleware);

// Public Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'CloudStoragePX',
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/auth/oauth', oauthRouter);
app.use('/api/files', fileRouter);
app.use('/api/shares', shareRouter);
app.use('/api/admin', adminRouter);

// Serve static public assets like logo.png
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Frontend integration: Vite middleware in dev, dist in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CloudStoragePX running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CloudStoragePX server:', err);
  process.exit(1);
});
