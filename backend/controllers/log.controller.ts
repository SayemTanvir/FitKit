import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../db';

// Member: Log an exercise set (triggers automated calorie calculation)
export async function logWorkout(req: AuthRequest, res: Response) {
  try {
    const { exercise_id, quantity, is_public } = req.body;
    const userId = req.user?.userId;

    if (!exercise_id || !quantity) {
      return res.status(400).json({ error: 'exercise_id and quantity are required.' });
    }

    const insertQuery = `
      INSERT INTO WorkoutEntry (user_id, exercise_id, quantity, is_public)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const { rows } = await query(insertQuery, [
      userId,
      exercise_id,
      quantity,
      is_public || false,
    ]);

    return res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Log workout error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error.' });
  }
}

// Member: Fetch personal workout logs
export async function getMyWorkoutLogs(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    const selectQuery = `
      SELECT we.entry_id, e.name AS exercise_name, we.quantity, 
             we.calories_burned, we.is_public, we.logged_at
      FROM WorkoutEntry we
      JOIN Exercise e ON we.exercise_id = e.exercise_id
      WHERE we.user_id = $1
      ORDER BY we.logged_at DESC;
    `;
    const { rows } = await query(selectQuery, [userId]);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Fetch logs error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

// Member: Delete an entry (Enforces object-level ownership)
export async function deleteWorkoutLog(req: AuthRequest, res: Response) {
  try {
    const entryId = parseInt(String(req.params.id), 10);
    const userId = req.user?.userId;

    const deleteQuery = `
      DELETE FROM WorkoutEntry
      WHERE entry_id = $1 AND user_id = $2
      RETURNING entry_id;
    `;
    const { rowCount } = await query(deleteQuery, [entryId, userId]);

    if (rowCount === 0) {
      return res.status(404).json({ 
        error: 'Entry not found or unauthorized.' 
      });
    }

    return res.status(200).json({ message: 'Log deleted successfully.' });
  } catch (error) {
    console.error('Delete log error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

// Member: Log Steps
export async function logSteps(req: AuthRequest, res: Response) {
  try {
    const { steps_added, is_public } = req.body;
    const userId = req.user?.userId;

    if (!steps_added || steps_added <= 0) {
      return res.status(400).json({ error: 'Valid step count is required.' });
    }

    const insertQuery = `
      INSERT INTO StepEntry (user_id, steps_added, is_public)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const { rows } = await query(insertQuery, [userId, steps_added, is_public || false]);
    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Log steps error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}