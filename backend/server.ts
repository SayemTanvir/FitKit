import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.routes';
import planRoutes from './routes/plan.routes';
import exerciseRoutes from './routes/exercise.routes';
import logRoutes from './routes/log.routes';
import socialRoutes from './routes/social.routes';
import programmeRoutes from './routes/programme.routes';
import communityRoutes from './routes/community.routes';
import adminRoutes from './routes/admin.routes';
import { query } from './db';

const app = express();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('replace_with_')) {
  throw new Error('Set a strong JWT_SECRET in backend/.env before starting FitKit.');
}

app.use(cors({ origin: (process.env.WEB_ORIGIN || 'http://localhost:5173').split(',').map((value) => value.trim()) }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

// Auth
app.use('/api/auth', authRoutes);

// Plans
app.use('/api/plans', planRoutes);

// Exercises
app.use('/api/exercises', exerciseRoutes);

// Workout & Activity Logs
app.use('/api/logs', logRoutes);

// Social Feed (Triggered by "Share to Feed")
app.use('/api/social', socialRoutes);
app.use('/api/programmes', programmeRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/admin', adminRoutes);

// Keep missing API routes as JSON instead of returning the frontend shell.
app.use('/api', (req, res) => {
  console.warn(`[404 MISSING ROUTE] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// In production the API and the Vite build are served from one origin.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../dist');

if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use((req, res) => {
    console.warn(`[404 MISSING ROUTE] ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FitKit Server running on port ${PORT}`);
});
