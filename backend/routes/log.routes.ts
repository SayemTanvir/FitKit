import { Response, Router } from 'express';
import { query } from '../db';
import {
  AuthRequest,
  requireRole,
  verifyToken,
} from '../middleware/auth.middleware';

const router = Router();

router.get('/summary', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      `SELECT
         COALESCE((
           SELECT SUM(we.calories_burned)
           FROM WorkoutEntry we
           WHERE we.user_id = $1 AND we.logged_at::DATE = CURRENT_DATE
         ), 0)::numeric AS workout_calories,
         COALESCE((
           SELECT COUNT(*)
           FROM WorkoutEntry we
           WHERE we.user_id = $1 AND we.logged_at::DATE = CURRENT_DATE
         ), 0)::int AS workouts_count,
         COALESCE((
           SELECT SUM(se.steps_added)
           FROM StepEntry se
           WHERE se.user_id = $1 AND se.logged_at::DATE = CURRENT_DATE
         ), 0)::int AS steps,
         COALESCE((
           SELECT SUM(se.calories_burned)
           FROM StepEntry se
           WHERE se.user_id = $1 AND se.logged_at::DATE = CURRENT_DATE
         ), 0)::numeric AS step_calories,
         COALESCE((
           SELECT SUM(he.amount_ml)
           FROM HydrationEntry he
           WHERE he.user_id = $1 AND he.logged_at::DATE = CURRENT_DATE
         ), 0)::int AS hydration,
         COALESCE(m.daily_step_goal, 10000)::int AS steps_goal,
         COALESCE(m.daily_calorie_goal, 800)::int AS calorie_goal,
         COALESCE(
           m.daily_hydration_goal,
           GREATEST(
             1000,
             ROUND(
               (u.weight_kg * 35) +
               ((u.height_cm - 170) * 5) -
               ((EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.birth_date)) - 30) * 5)
             )
           )
         )::int AS hydration_goal
       FROM users u
       LEFT JOIN Member m ON m.user_id = u.user_id
       WHERE u.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const summary = result.rows[0];
    const calories = Math.round(
      Number(summary.workout_calories) + Number(summary.step_calories)
    );

    return res.status(200).json({
      calories,
      workoutsCount: summary.workouts_count,
      steps: summary.steps,
      hydration: summary.hydration,
      caloriesGoal: summary.calorie_goal,
      stepsGoal: summary.steps_goal,
      hydrationGoal: summary.hydration_goal,
    });
  } catch (err) {
    console.error('Fetch summary error:', err);
    return res.status(500).json({ error: 'Failed to fetch daily summary.' });
  }
});

router.get('/analytics', verifyToken, async (req: AuthRequest, res: Response) => {
  const requestedDays = Number(req.query.days || 7);
  const days = Number.isInteger(requestedDays) ? Math.min(Math.max(requestedDays, 7), 30) : 7;

  try {
    const result = await query(
      `SELECT
         TO_CHAR(calendar.day::date, 'YYYY-MM-DD') AS activity_date,
         COALESCE(steps.total_steps, 0)::int AS steps,
         COALESCE(hydration.total_water, 0)::int AS hydration,
         ROUND(COALESCE(steps.step_calories, 0) + COALESCE(workouts.workout_calories, 0))::int AS calories,
         COALESCE(workouts.workout_count, 0)::int AS workouts
       FROM generate_series(
         CURRENT_DATE - ($2::int - 1),
         CURRENT_DATE,
         INTERVAL '1 day'
       ) AS calendar(day)
       LEFT JOIN LATERAL (
         SELECT SUM(steps_added) AS total_steps, SUM(calories_burned) AS step_calories
         FROM StepEntry
         WHERE user_id = $1 AND logged_at::date = calendar.day::date
       ) steps ON TRUE
       LEFT JOIN LATERAL (
         SELECT SUM(amount_ml) AS total_water
         FROM HydrationEntry
         WHERE user_id = $1 AND logged_at::date = calendar.day::date
       ) hydration ON TRUE
       LEFT JOIN LATERAL (
         SELECT SUM(calories_burned) AS workout_calories, COUNT(*) AS workout_count
         FROM WorkoutEntry
         WHERE user_id = $1 AND logged_at::date = calendar.day::date
       ) workouts ON TRUE
       ORDER BY calendar.day`,
      [req.user!.userId, days]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Fetch analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch progress analytics.' });
  }
});

router.get('/steps', verifyToken, requireRole('Member'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT step_entry_id, steps_added, calories_burned, is_public, logged_at
       FROM StepEntry
       WHERE user_id = $1
       ORDER BY logged_at DESC, step_entry_id DESC
       LIMIT 50`,
      [req.user!.userId]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Fetch step history error:', err);
    return res.status(500).json({ error: 'Failed to fetch step history.' });
  }
});

router.delete('/steps/:id', verifyToken, requireRole('Member'), async (req: AuthRequest, res: Response) => {
  const entryId = Number(req.params.id);
  if (!Number.isInteger(entryId) || entryId < 1) {
    return res.status(400).json({ error: 'Invalid step entry ID.' });
  }
  try {
    const result = await query(
      `DELETE FROM StepEntry WHERE step_entry_id = $1 AND user_id = $2 RETURNING step_entry_id`,
      [entryId, req.user!.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Step entry not found.' });
    return res.status(200).json({ message: 'Step entry deleted.' });
  } catch (err) {
    console.error('Delete step entry error:', err);
    return res.status(500).json({ error: 'Failed to delete step entry.' });
  }
});

router.get('/hydration', verifyToken, requireRole('Member'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT hydration_id, amount_ml, is_public, logged_at
       FROM HydrationEntry
       WHERE user_id = $1
       ORDER BY logged_at DESC, hydration_id DESC
       LIMIT 50`,
      [req.user!.userId]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Fetch hydration history error:', err);
    return res.status(500).json({ error: 'Failed to fetch hydration history.' });
  }
});

router.delete('/hydration/:id', verifyToken, requireRole('Member'), async (req: AuthRequest, res: Response) => {
  const entryId = Number(req.params.id);
  if (!Number.isInteger(entryId) || entryId < 1) {
    return res.status(400).json({ error: 'Invalid hydration entry ID.' });
  }
  try {
    const result = await query(
      `DELETE FROM HydrationEntry WHERE hydration_id = $1 AND user_id = $2 RETURNING hydration_id`,
      [entryId, req.user!.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Hydration entry not found.' });
    return res.status(200).json({ message: 'Hydration entry deleted.' });
  } catch (err) {
    console.error('Delete hydration entry error:', err);
    return res.status(500).json({ error: 'Failed to delete hydration entry.' });
  }
});

router.post(
  '/steps',
  verifyToken,
  requireRole('Member'),
  async (req: AuthRequest, res: Response) => {
    const stepsAdded = Number(req.body?.steps_added);
    const isPublic = req.body?.is_public === true;
    if (!Number.isInteger(stepsAdded) || stepsAdded < 1) {
      return res.status(400).json({ error: 'steps_added must be a positive whole number.' });
    }

    try {
      const result = await query(
        `INSERT INTO StepEntry (user_id, steps_added, is_public)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [req.user!.userId, stepsAdded, isPublic]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Log steps error:', err);
      return res.status(500).json({ error: 'Failed to record steps.' });
    }
  }
);

router.post(
  '/hydration',
  verifyToken,
  requireRole('Member'),
  async (req: AuthRequest, res: Response) => {
    const amountMl = Number(req.body?.amount_ml);
    const isPublic = req.body?.is_public === true;
    if (!Number.isInteger(amountMl) || amountMl < 1) {
      return res.status(400).json({ error: 'amount_ml must be a positive whole number.' });
    }

    try {
      const result = await query(
        `INSERT INTO HydrationEntry (user_id, amount_ml, is_public)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [req.user!.userId, amountMl, isPublic]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Log hydration error:', err);
      return res.status(500).json({ error: 'Failed to record hydration.' });
    }
  }
);

router.get(
  '/workout',
  verifyToken,
  requireRole('Member'),
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await query(
        `SELECT
           we.entry_id,
           we.exercise_id,
           e.name AS exercise_name,
           e.target_muscle_group AS category,
           we.quantity,
           we.calories_burned,
           we.is_public,
           we.logged_at
         FROM WorkoutEntry we
         JOIN Exercise e ON e.exercise_id = we.exercise_id
         WHERE we.user_id = $1
         ORDER BY we.logged_at DESC`,
        [req.user!.userId]
      );
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error('Fetch workout logs error:', err);
      return res.status(500).json({ error: 'Failed to fetch workout logs.' });
    }
  }
);

router.post(
  '/workout',
  verifyToken,
  requireRole('Member'),
  async (req: AuthRequest, res: Response) => {
    const exerciseId = Number(req.body?.exercise_id);
    const quantity = Number(req.body?.quantity);
    const isPublic = req.body?.is_public === true;
    if (!Number.isInteger(exerciseId) || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Valid exercise_id and quantity are required.' });
    }

    try {
      const result = await query(
        `INSERT INTO WorkoutEntry (user_id, exercise_id, quantity, is_public)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [req.user!.userId, exerciseId, quantity, isPublic]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err: any) {
      if (err.code === '23503') {
        return res.status(400).json({ error: 'Selected exercise does not exist.' });
      }
      console.error('Log workout error:', err);
      return res.status(500).json({ error: 'Failed to record workout.' });
    }
  }
);

router.delete(
  '/workout/:id',
  verifyToken,
  requireRole('Member'),
  async (req: AuthRequest, res: Response) => {
    const entryId = Number(req.params.id);
    if (!Number.isInteger(entryId)) {
      return res.status(400).json({ error: 'Invalid workout entry ID.' });
    }

    try {
      const result = await query(
        `DELETE FROM WorkoutEntry
         WHERE entry_id = $1 AND user_id = $2
         RETURNING entry_id`,
        [entryId, req.user!.userId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Workout entry not found.' });
      }
      return res.status(200).json({ message: 'Workout entry deleted.' });
    } catch (err) {
      console.error('Delete workout error:', err);
      return res.status(500).json({ error: 'Failed to delete workout entry.' });
    }
  }
);

export default router;
