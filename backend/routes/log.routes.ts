import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = Router();

// Helper: extract user ID safely
function resolveUserId(req: Request): number | null {
  const queryId = req.query.user_id || req.query.userId;
  if (queryId) return Number(queryId);

  const bodyId = req.body?.user_id || req.body?.userId;
  if (bodyId) return Number(bodyId);

  if (req.headers.authorization) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
      return decoded.id || decoded.user_id || decoded.userId || null;
    } catch {
      return null;
    }
  }
  return null;
}

// GET /api/logs/summary - Live daily aggregates for Dashboard
router.get('/summary', async (req: Request, res: Response) => {
  try {
    let userId = resolveUserId(req);
    if (!userId) {
      const fallbackUser = await query(`SELECT user_id FROM users LIMIT 1;`);
      userId = fallbackUser.rows[0]?.user_id || 1;
    }

    // 1. Workout calories burned today
    const workoutRes = await query(
      `SELECT 
         COALESCE(SUM(calories_burned), 0)::numeric AS workout_calories,
         COUNT(entry_id)::int AS workouts_count
       FROM workoutentry 
       WHERE user_id = $1 AND logged_at::DATE = CURRENT_DATE;`,
      [userId]
    );

    // 2. Step telemetry and step calories today (computed via trigger)
    let steps = 0;
    let stepCalories = 0;
    try {
      const stepRes = await query(
        `SELECT 
           COALESCE(SUM(steps_added), 0)::int AS total_steps,
           COALESCE(SUM(calories_burned), 0)::numeric AS step_calories
         FROM StepEntry 
         WHERE user_id = $1 AND logged_at::DATE = CURRENT_DATE;`,
        [userId]
      );
      steps = Number(stepRes.rows[0]?.total_steps || 0);
      stepCalories = Number(stepRes.rows[0]?.step_calories || 0);
    } catch {
      // StepEntry table optional
    }

    // 3. Hydration intake today
    let hydration = 0;
    try {
      const hydRes = await query(
        `SELECT COALESCE(SUM(amount_ml), 0)::int AS total_water_ml
         FROM HydrationEntry 
         WHERE user_id = $1 AND logged_at::DATE = CURRENT_DATE;`,
        [userId]
      );
      hydration = Number(hydRes.rows[0]?.total_water_ml || 0);
    } catch {
      // HydrationEntry table optional
    }

    const workoutCalories = Number(workoutRes.rows[0]?.workout_calories || 0);
    const totalCalories = Math.round(workoutCalories + stepCalories);

    return res.status(200).json({
      calories: totalCalories,
      workoutsCount: Number(workoutRes.rows[0]?.workouts_count || 0),
      steps,
      hydration,
      caloriesGoal: 800,
      stepsGoal: 10000,
      hydrationGoal: 2800,
    });
  } catch (err: any) {
    console.error('Error fetching dashboard summary:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch summary' });
  }
});

// POST /api/logs/steps - Log steps
router.post(['/steps', '/step'], async (req: Request, res: Response) => {
  try {
    let userId = resolveUserId(req);
    if (!userId) {
      const fallbackUser = await query(`SELECT user_id FROM member LIMIT 1;`);
      userId = fallbackUser.rows[0]?.user_id || 1;
    }

    const { steps_added, steps, is_public, isPublic } = req.body;
    const stepCount = Number(steps_added || steps || 1000);
    const shouldShare = Boolean(is_public ?? isPublic ?? false);

    await query(`INSERT INTO member (user_id) VALUES ($1) ON CONFLICT DO NOTHING;`, [userId]).catch(() => {});

    const result = await query(
      `INSERT INTO StepEntry (user_id, steps_added, is_public)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [userId, stepCount, shouldShare]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error logging steps:', err);
    return res.status(500).json({ error: err.message || 'Failed to record steps' });
  }
});

// POST /api/logs/hydration - Log water consumption
router.post('/hydration', async (req: Request, res: Response) => {
  try {
    let userId = resolveUserId(req);
    if (!userId) {
      const fallbackUser = await query(`SELECT user_id FROM member LIMIT 1;`);
      userId = fallbackUser.rows[0]?.user_id || 1;
    }

    const { amount_ml, amount, is_public, isPublic } = req.body;
    const waterAmount = Number(amount_ml || amount || 250);
    const shouldShare = Boolean(is_public ?? isPublic ?? false);

    await query(`INSERT INTO member (user_id) VALUES ($1) ON CONFLICT DO NOTHING;`, [userId]).catch(() => {});

    const result = await query(
      `INSERT INTO HydrationEntry (user_id, amount_ml, is_public)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [userId, waterAmount, shouldShare]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error logging hydration:', err);
    return res.status(500).json({ error: err.message || 'Failed to record hydration' });
  }
});

// GET /api/logs or /api/logs/workout
router.get(['/', '/workout'], async (req: Request, res: Response) => {
  try {
    const userId = resolveUserId(req);

    const result = await query(
      `SELECT 
         w.entry_id AS id,
         w.entry_id AS log_id,
         w.entry_id AS entry_id,
         w.quantity,
         w.calories_burned,
         TO_CHAR(COALESCE(w.logged_at, NOW()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS timestamp,
         TO_CHAR(COALESCE(w.logged_at, NOW()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
         TO_CHAR(COALESCE(w.logged_at, NOW()), 'YYYY-MM-DD') AS date,
         e.name AS exercise,
         e.name AS exercise_name,
         COALESCE(e.target_muscle_group, 'General') AS category
        FROM workoutentry w
        LEFT JOIN exercise e ON w.exercise_id = e.exercise_id
        ${userId ? 'WHERE w.user_id = $1' : ''}
        ORDER BY w.entry_id DESC;`,
      userId ? [userId] : []
    );

    return res.status(200).json(result.rows);
  } catch (err: any) {
    console.error('Error fetching logs:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch logs' });
  }
});

// POST /api/logs or /api/logs/workout
router.post(['/', '/workout'], async (req: Request, res: Response) => {
  try {
    const { exercise_id, exerciseId, quantity, reps, duration, is_public, isPublic, share, shareToFeed } = req.body;
    let resolvedUserId = resolveUserId(req);

    if (!resolvedUserId) {
      const fallbackUser = await query(`SELECT user_id FROM member LIMIT 1;`);
      resolvedUserId = fallbackUser.rows[0]?.user_id || 1;
    }

    await query(`INSERT INTO member (user_id) VALUES ($1) ON CONFLICT DO NOTHING;`, [resolvedUserId]).catch(() => {});

    const exId = exercise_id || exerciseId || 1;
    const qty = Number(quantity || reps || duration || 10);
    const shouldShare = Boolean(is_public ?? isPublic ?? share ?? shareToFeed ?? false);

    const logResult = await query(
      `INSERT INTO workoutentry (user_id, exercise_id, quantity, is_public)
       VALUES ($1, $2, $3, $4)
       RETURNING entry_id AS id, entry_id AS log_id, entry_id AS entry_id, *;`,
      [resolvedUserId, exId, qty, shouldShare]
    );

    if (shouldShare) {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS social_feed (
            feed_id SERIAL PRIMARY KEY,
            user_id INT,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT NOW()
          );
        `);

        const exRes = await query(`SELECT name FROM exercise WHERE exercise_id = $1;`, [exId]);
        const userRes = await query(`SELECT name FROM users WHERE user_id = $1;`, [resolvedUserId]);

        const exName = exRes.rows[0]?.name || 'Workout';
        const userName = userRes.rows[0]?.name || 'FitKit Member';
        const caloriesBurned = logResult.rows[0]?.calories_burned || Math.round(qty * 5);
        const postText = `${userName} completed ${qty} reps/mins of ${exName} (${caloriesBurned} kcal burned)!`;

        await query(
          `INSERT INTO social_feed (user_id, content, timestamp) VALUES ($1, $2, NOW());`,
          [resolvedUserId, postText]
        );
      } catch (feedErr) {
        console.error('Feed cross-posting error:', feedErr);
      }
    }

    return res.status(201).json(logResult.rows[0]);
  } catch (err: any) {
    console.error('Error logging workout set:', err);
    return res.status(500).json({ error: err.message || 'Failed to record workout' });
  }
});

// DELETE /api/logs/:id or /api/logs/workout/:id
router.delete(['/:id', '/workout/:id'], async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const userId = resolveUserId(req);

    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'Invalid ID provided for deletion' });
    }

    const deleteQuery = userId
      ? `DELETE FROM workoutentry WHERE entry_id = $1 AND user_id = $2 RETURNING entry_id;`
      : `DELETE FROM workoutentry WHERE entry_id = $1 RETURNING entry_id;`;

    const params = userId ? [id, userId] : [id];
    const result = await query(deleteQuery, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Log not found or unauthorized' });
    }

    return res.status(200).json({ message: 'Log deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting workout log:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete log' });
  }
});

export default router;