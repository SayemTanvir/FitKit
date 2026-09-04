import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import planRoutes from './routes/plan.routes';
import exerciseRoutes from './routes/exercise.routes';
import logRoutes from './routes/log.routes';
import socialRoutes from './routes/social.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Auth
app.use('/api/auth', authRoutes);

// Plans
app.use('/api/plans', planRoutes);
app.use('/api/plan', planRoutes);

// Exercises
app.use('/api/exercises', exerciseRoutes);
app.use('/api/exercise', exerciseRoutes);

// Workout & Activity Logs
app.use('/api/logs', logRoutes);
app.use('/api/log', logRoutes);
app.use('/api/activity', logRoutes);
app.use('/api/activities', logRoutes);
app.use('/api/activity-logs', logRoutes);
app.use('/api/activity_logs', logRoutes);
app.use('/api/workouts', logRoutes);
app.use('/api/workout', logRoutes);
app.use('/api/workoutentry', logRoutes);
app.use('/api/workoutentries', logRoutes);
app.use('/api/workout-entry', logRoutes);
app.use('/api/workout_entry', logRoutes);

// Social Feed (Triggered by "Share to Feed")
app.use('/api/social', socialRoutes);
app.use('/api/socials', socialRoutes);
app.use('/api/feed', socialRoutes);
app.use('/api/feeds', socialRoutes);
app.use('/api/social-feed', socialRoutes);
app.use('/api/social_feed', socialRoutes);
app.use('/api/posts', socialRoutes);
app.use('/api/post', socialRoutes);

// Catch-all 404 handler with terminal logging
app.use((req, res) => {
  console.warn(`[404 MISSING ROUTE] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FitKit Server running on port ${PORT}`);
});