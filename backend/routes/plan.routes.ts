import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// GET /api/plans - Fetch catalog
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        plan_id AS id, 
        title, 
        target_level, 
        goal, 
        duration_weeks, 
        curated_by 
      FROM workout_plans 
      ORDER BY plan_id ASC;
    `);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching workout plans:', err);
    return res.status(500).json({ message: 'Failed to fetch workout plans' });
  }
});

// POST /api/plans - Curate new plan (Admin Exclusive)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      target_level,
      targetLevel,
      goal,
      duration_weeks,
      durationWeeks,
      curated_by,
      curatedBy
    } = req.body;

    const level = target_level || targetLevel || 'Intermediate';
    const planGoal = goal || 'General Fitness';
    const duration = duration_weeks || durationWeeks || 4;
    const author = curated_by || curatedBy || 'FitKit Admin';

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Insert into workout_plans
    const result = await query(
      `INSERT INTO workout_plans (title, target_level, goal, duration_weeks, curated_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING plan_id AS id, title, target_level, goal, duration_weeks, curated_by;`,
      [title, level, planGoal, duration, author]
    );

    // Keep fallback singular table in sync
    await query(
      `INSERT INTO workout_plan (title, target_level, goal, duration_weeks, curated_by)
       VALUES ($1, $2, $3, $4, $5);`,
      [title, level, planGoal, duration, author]
    ).catch(() => {});

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating plan:', err);
    return res.status(500).json({ message: 'Failed to create plan' });
  }
});

export default router;