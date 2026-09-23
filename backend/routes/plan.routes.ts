import { Response, Router } from 'express';
import { query } from '../db';
import {
  AuthRequest,
  requireRole,
  verifyToken,
} from '../middleware/auth.middleware';

const router = Router();

const levels = new Set(['Beginner', 'Intermediate', 'Advanced']);
const goals = new Set([
  'Weight Loss',
  'Muscle Gain',
  'Strength',
  'Flexibility',
  'General Fitness',
]);

function validatePlan(body: Record<string, unknown>) {
  const title = String(body.title || '').trim();
  const targetLevel = String(body.target_level || '').trim();
  const goalCategory = String(body.goal_category || '').trim();
  const durationWeeks = Number(body.duration_weeks);

  if (!title || !levels.has(targetLevel) || !goals.has(goalCategory)) {
    return { error: 'Provide a title, valid target level, and valid goal category.' };
  }
  if (!Number.isInteger(durationWeeks) || durationWeeks < 1) {
    return { error: 'Duration must be a positive whole number of weeks.' };
  }

  return { title, targetLevel, goalCategory, durationWeeks };
}

router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT
         wp.plan_id,
         wp.title,
         wp.target_level,
         wp.goal_category,
         wp.duration_weeks,
         u.name AS curated_by,
         COALESCE(mwp.status = 'Active', FALSE) AS is_active,
         mwp.start_date AS active_start_date,
         COALESCE(
           json_agg(
             json_build_object(
               'exercise_id', e.exercise_id,
               'name', e.name,
               'target_muscle_group', e.target_muscle_group,
               'day_number', wpe.day_number,
               'order_seq', wpe.order_seq,
               'target_quantity', wpe.target_quantity
             ) ORDER BY wpe.day_number, wpe.order_seq
           ) FILTER (WHERE e.exercise_id IS NOT NULL),
           '[]'::json
         ) AS exercises
       FROM WorkoutPlan wp
       JOIN users u ON u.user_id = wp.admin_id
       LEFT JOIN MemberWorkoutPlan mwp
         ON mwp.plan_id = wp.plan_id AND mwp.user_id = $1
       LEFT JOIN WorkoutPlanExercise wpe ON wpe.plan_id = wp.plan_id
       LEFT JOIN Exercise e ON e.exercise_id = wpe.exercise_id
       WHERE $2 = 'Admin' OR EXISTS (
         SELECT 1 FROM WorkoutPlanExercise ready WHERE ready.plan_id = wp.plan_id
       )
       GROUP BY wp.plan_id, u.name, mwp.status, mwp.start_date
       ORDER BY is_active DESC, wp.plan_id DESC`,
      [req.user!.userId, req.user!.role]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Fetch plans error:', err);
    return res.status(500).json({ error: 'Failed to fetch workout plans.' });
  }
});

router.post(
  '/',
  verifyToken,
  requireRole('Admin'),
  async (req: AuthRequest, res: Response) => {
    const plan = validatePlan(req.body || {});
    if ('error' in plan) {
      return res.status(400).json({ error: plan.error });
    }
    const hasFirstExercise = req.body?.exercise_id !== undefined || req.body?.target_quantity !== undefined;
    const exerciseId = Number(req.body?.exercise_id);
    const targetQuantity = Number(req.body?.target_quantity);
    if (hasFirstExercise && (!Number.isInteger(exerciseId) || exerciseId < 1 || !Number.isInteger(targetQuantity) || targetQuantity < 1)) {
      return res.status(400).json({ error: 'Select an exercise and a positive target quantity.' });
    }

    try {
      const result = await query(
        hasFirstExercise ? `WITH created_plan AS (
           INSERT INTO WorkoutPlan
             (admin_id, title, target_level, goal_category, duration_weeks)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *
         ), created_exercise AS (
           INSERT INTO WorkoutPlanExercise
             (plan_id, exercise_id, day_number, order_seq, target_quantity)
           SELECT plan_id, $6, 1, 1, $7 FROM created_plan
           RETURNING plan_id
         )
         SELECT created_plan.* FROM created_plan
         JOIN created_exercise ON created_exercise.plan_id = created_plan.plan_id`
          : `INSERT INTO WorkoutPlan (admin_id, title, target_level, goal_category, duration_weeks)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
        hasFirstExercise
          ? [req.user!.userId, plan.title, plan.targetLevel, plan.goalCategory, plan.durationWeeks, exerciseId, targetQuantity]
          : [req.user!.userId, plan.title, plan.targetLevel, plan.goalCategory, plan.durationWeeks]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err: any) {
      if (err.code === '23503') {
        return res.status(400).json({ error: 'Selected exercise does not exist.' });
      }
      console.error('Create plan error:', err);
      return res.status(500).json({ error: 'Failed to create workout plan.' });
    }
  }
);

router.post(
  '/:id/exercises',
  verifyToken,
  requireRole('Admin'),
  async (req: AuthRequest, res: Response) => {
    const planId = Number(req.params.id);
    const exerciseId = Number(req.body?.exercise_id);
    const dayNumber = Number(req.body?.day_number);
    const targetQuantity = Number(req.body?.target_quantity);
    if (![planId, exerciseId, dayNumber, targetQuantity].every((value) => Number.isInteger(value) && value > 0)) {
      return res.status(400).json({ error: 'Choose an exercise, day, and positive target quantity.' });
    }
    try {
      const result = await query(
        `INSERT INTO WorkoutPlanExercise (plan_id, exercise_id, day_number, order_seq, target_quantity)
         SELECT wp.plan_id, $3, $4,
                COALESCE((SELECT MAX(order_seq) + 1 FROM WorkoutPlanExercise WHERE plan_id = wp.plan_id AND day_number = $4), 1),
                $5
         FROM WorkoutPlan wp
         JOIN Exercise e ON e.exercise_id = $3
         LEFT JOIN StrengthExercise se ON se.exercise_id = e.exercise_id
         LEFT JOIN CardioExercise ce ON ce.exercise_id = e.exercise_id
         LEFT JOIN FlexibilityExercise fe ON fe.exercise_id = e.exercise_id
         WHERE wp.plan_id = $1 AND wp.admin_id = $2 AND $4 <= wp.duration_weeks * 7
           AND (
             wp.goal_category = 'General Fitness'
             OR (wp.goal_category = 'Weight Loss' AND ce.exercise_id IS NOT NULL)
             OR (wp.goal_category = 'Flexibility' AND fe.exercise_id IS NOT NULL)
             OR (wp.goal_category IN ('Strength', 'Muscle Gain') AND se.exercise_id IS NOT NULL)
           )
         RETURNING *`,
        [planId, req.user!.userId, exerciseId, dayNumber, targetQuantity]
      );
      if (!result.rowCount) return res.status(400).json({ error: 'Plan, day, or exercise category is not valid for this schedule.' });
      return res.status(201).json(result.rows[0]);
    } catch (err: any) {
      if (err.code === '23503') return res.status(400).json({ error: 'Selected exercise does not exist.' });
      if (err.code === '23505') return res.status(409).json({ error: 'This exercise is already scheduled for that day.' });
      console.error('Add plan exercise error:', err);
      return res.status(500).json({ error: 'Failed to add exercise to plan.' });
    }
  }
);

router.delete(
  '/:id/exercises/:exerciseId/:day',
  verifyToken,
  requireRole('Admin'),
  async (req: AuthRequest, res: Response) => {
    const planId = Number(req.params.id);
    const exerciseId = Number(req.params.exerciseId);
    const day = Number(req.params.day);
    if (![planId, exerciseId, day].every((value) => Number.isInteger(value) && value > 0)) {
      return res.status(400).json({ error: 'Invalid plan exercise.' });
    }
    try {
      const result = await query(
        `DELETE FROM WorkoutPlanExercise wpe
         USING WorkoutPlan wp
         WHERE wpe.plan_id = wp.plan_id AND wp.plan_id = $1 AND wp.admin_id = $2
           AND wpe.exercise_id = $3 AND wpe.day_number = $4
         RETURNING wpe.exercise_id`,
        [planId, req.user!.userId, exerciseId, day]
      );
      if (!result.rowCount) return res.status(404).json({ error: 'Plan exercise not found.' });
      return res.status(200).json({ message: 'Exercise removed from plan.' });
    } catch (err) {
      console.error('Remove plan exercise error:', err);
      return res.status(500).json({ error: 'Failed to remove exercise from plan.' });
    }
  }
);

router.post(
  '/:id/start',
  verifyToken,
  requireRole('Member'),
  async (req: AuthRequest, res: Response) => {
    const planId = Number(req.params.id);
    if (!Number.isInteger(planId)) {
      return res.status(400).json({ error: 'Invalid plan ID.' });
    }

    try {
      const result = await query(
        `INSERT INTO MemberWorkoutPlan (user_id, plan_id, start_date, status)
         SELECT $1, wp.plan_id, CURRENT_DATE, 'Active'
         FROM WorkoutPlan wp
         WHERE wp.plan_id = $2
           AND EXISTS (SELECT 1 FROM WorkoutPlanExercise wpe WHERE wpe.plan_id = wp.plan_id)
         ON CONFLICT (user_id, plan_id)
         DO UPDATE SET
           start_date = CASE
             WHEN MemberWorkoutPlan.status = 'Active' THEN MemberWorkoutPlan.start_date
             ELSE CURRENT_DATE
           END,
           status = 'Active'
         RETURNING *`,
        [req.user!.userId, planId]
      );
      if (!result.rowCount) return res.status(404).json({ error: 'Plan not found or has no exercises yet.' });
      return res.status(200).json(result.rows[0]);
    } catch (err: any) {
      if (err.code === '23503') {
        return res.status(404).json({ error: 'Workout plan not found.' });
      }
      console.error('Start plan error:', err);
      return res.status(500).json({ error: 'Failed to start workout plan.' });
    }
  }
);

router.put(
  '/:id',
  verifyToken,
  requireRole('Admin'),
  async (req: AuthRequest, res: Response) => {
    const planId = Number(req.params.id);
    const plan = validatePlan(req.body || {});
    if (!Number.isInteger(planId) || 'error' in plan) {
      return res.status(400).json({ error: 'Invalid plan data.' });
    }

    try {
      const result = await query(
        `UPDATE WorkoutPlan
         SET title = $1, target_level = $2, goal_category = $3, duration_weeks = $4
         WHERE plan_id = $5 AND admin_id = $6
         RETURNING *`,
        [plan.title, plan.targetLevel, plan.goalCategory, plan.durationWeeks, planId, req.user!.userId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Plan not found or not owned by this admin.' });
      }
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Update plan error:', err);
      return res.status(500).json({ error: 'Failed to update workout plan.' });
    }
  }
);

router.delete(
  '/:id',
  verifyToken,
  requireRole('Admin'),
  async (req: AuthRequest, res: Response) => {
    const planId = Number(req.params.id);
    if (!Number.isInteger(planId)) {
      return res.status(400).json({ error: 'Invalid plan ID.' });
    }

    try {
      const result = await query(
        `DELETE FROM WorkoutPlan
         WHERE plan_id = $1 AND admin_id = $2
         RETURNING plan_id`,
        [planId, req.user!.userId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Plan not found or not owned by this admin.' });
      }
      return res.status(200).json({ message: 'Workout plan deleted.' });
    } catch (err) {
      console.error('Delete plan error:', err);
      return res.status(500).json({ error: 'Failed to delete workout plan.' });
    }
  }
);

export default router;
