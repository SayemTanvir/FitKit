import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = Router();

// GET /api/logs or /api/logs/workout
router.get(['/', '/workout'], async (req: Request, res: Response) => {
  try {
    let userId = req.query.user_id || req.query.userId;

    if (!userId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        userId = decoded.id || decoded.user_id;
      } catch (e) {
        // Token parse error ignored
      }
    }

    const result = await query(
      `SELECT 
        w.entry_id AS id,
        w.entry_id AS log_id,
        w.entry_id AS entry_id,
        w.quantity,
        w.calories_burned,
        COALESCE(w.timestamp, NOW()) AS timestamp,
        COALESCE(w.timestamp, NOW()) AS created_at,
        COALESCE(w.timestamp, NOW()) AS date,
        e.name AS exercise,
        e.name AS exercise_name,
        e.category
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
    const { 
      exercise_id, 
      exerciseId, 
      quantity, 
      reps, 
      duration, 
      user_id, 
      userId 
    } = req.body;

    let resolvedUserId = user_id || userId;

    if (!resolvedUserId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        resolvedUserId = decoded.id || decoded.user_id;
      } catch (e) {
        // Token parse error ignored
      }
    }

    if (!resolvedUserId) {
      const fallbackUser = await query(`SELECT user_id FROM member LIMIT 1;`);
      resolvedUserId = fallbackUser.rows[0]?.user_id || 1;
    }

    await query(
      `INSERT INTO member (user_id) VALUES ($1) ON CONFLICT DO NOTHING;`,
      [resolvedUserId]
    ).catch(() => {});

    const exId = exercise_id || exerciseId || 1;
    const qty = Number(quantity || reps || duration || 10);
    const caloriesBurned = Math.round(qty * 5);

    let logResult;
    try {
      logResult = await query(
        `INSERT INTO workoutentry (user_id, exercise_id, quantity, calories_burned, timestamp)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING entry_id AS id, entry_id AS log_id, entry_id AS entry_id, *;`,
        [resolvedUserId, exId, qty, caloriesBurned]
      );
    } catch (dbErr: any) {
      logResult = await query(
        `INSERT INTO workoutentry (user_id, exercise_id, quantity, calories_burned)
         VALUES ($1, $2, $3, $4)
         RETURNING entry_id AS id, entry_id AS log_id, entry_id AS entry_id, *;`,
        [resolvedUserId, exId, qty, caloriesBurned]
      );
    }

    // Always record feed activity when a workout is saved
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
      const userName = userRes.rows[0]?.name || 'Alex Mercer';
      const postText = `${userName} completed ${qty} reps/mins of ${exName} (${caloriesBurned} kcal burned)!`;

      await query(
        `INSERT INTO social_feed (user_id, content, timestamp) VALUES ($1, $2, NOW());`,
        [resolvedUserId, postText]
      );
    } catch (feedErr) {
      console.error('Feed cross-posting error:', feedErr);
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

    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'Invalid ID provided for deletion' });
    }

    await query(`DELETE FROM workoutentry WHERE entry_id = $1;`, [id]);
    return res.status(200).json({ message: 'Log deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting workout log:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete log' });
  }
});

export default router;