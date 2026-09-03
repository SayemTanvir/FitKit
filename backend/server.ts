import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes';
import planRoutes from './routes/plan.routes';
import logRoutes from './routes/log.routes';

import exerciseRoutes from './routes/exercise.routes';
import socialRoutes from './routes/social.routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/logs', logRoutes);

app.use('/api/exercises', exerciseRoutes);
app.use('/api/social', socialRoutes);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'FitKit API' });
});

app.listen(PORT, () => {
  console.log(`FitKit Server running on port ${PORT}`);
});