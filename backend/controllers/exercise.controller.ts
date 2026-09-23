import { Response } from 'express';
import { query } from '../db';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getExercises(req: AuthRequest, res: Response) {
  try {
    const { rows } = await query(
      `SELECT
         e.exercise_id,
         e.name,
         e.target_muscle_group,
         e.calorie_factor,
         e.difficulty_level,
         e.instructions,
         e.description,
         e.movement_pattern,
         e.secondary_muscles,
         e.optional_equipment,
         e.tracking_type,
         e.media_url,
         e.is_active,
         CASE
           WHEN se.exercise_id IS NOT NULL THEN 'Strength'
           WHEN ce.exercise_id IS NOT NULL THEN 'Cardio'
           WHEN fe.exercise_id IS NOT NULL THEN 'Flexibility'
           ELSE 'General'
         END AS category
       FROM Exercise e
       LEFT JOIN StrengthExercise se ON se.exercise_id = e.exercise_id
       LEFT JOIN CardioExercise ce ON ce.exercise_id = e.exercise_id
       LEFT JOIN FlexibilityExercise fe ON fe.exercise_id = e.exercise_id
       WHERE e.is_active = TRUE OR $1 = 'Admin'
       ORDER BY e.exercise_id`,
      [req.user!.role]
    );
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Fetch exercises error:', error);
    return res.status(500).json({ error: 'Failed to fetch exercise catalog.' });
  }
}
