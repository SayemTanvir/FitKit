import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = Router();

// GET /api/plans
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS workout_plan (
        plan_id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        target_level VARCHAR(50) DEFAULT 'Intermediate',
        goal VARCHAR(100) DEFAULT 'Hypertrophy',
        duration_weeks INT DEFAULT 4,
        curated_by VARCHAR(100) DEFAULT 'FitKit Admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const result = await query(`
      SELECT 
        plan_id AS id,
        plan_id,
        title,
        target_level,
        target_level AS "targetLevel",
        goal,
        goal AS "goalCategory",
        duration_weeks,
        duration_weeks AS "durationWeeks",
        curated_by,
        curated_by AS "curatedBy"
      FROM workout_plan
      ORDER BY plan_id ASC;
    `);

    return res.status(200).json(result.rows);
  } catch (err: any) {
    console.error('Fetch plans error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch plans' });
  }
});

// POST /api/plans
router.post('/', async (req: Request, res: Response) => {
  try {
    // Role check via token
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        if (decoded.role && decoded.role.toLowerCase() !== 'admin') {
          return res.status(403).json({ error: 'Access denied. Admins only.' });
        }
      } catch (e) {
        // Invalid token
      }
    }

    const { 
      title, 
      target_level, 
      targetLevel, 
      goal, 
      goal_category, 
      goalCategory, 
      duration_weeks, 
      durationWeeks,
      curated_by 
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Plan title is required' });
    }

    const level = target_level || targetLevel || 'Beginner';
    const planGoal = goal || goal_category || goalCategory || 'General Fitness';
    const weeks = Number(duration_weeks || durationWeeks || 4);
    const curator = curated_by || 'FitKit Admin';

    const insertResult = await query(
      `INSERT INTO workout_plan (title, target_level, goal, duration_weeks, curated_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING 
         plan_id AS id,
         plan_id,
         title,
         target_level,
         target_level AS "targetLevel",
         goal,
         goal AS "goalCategory",
         duration_weeks,
         duration_weeks AS "durationWeeks",
         curated_by;`,
      [title, level, planGoal, weeks, curator]
    );

    return res.status(201).json(insertResult.rows[0]);
  } catch (err: any) {
    console.error('Create plan error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create plan' });
  }
});

export default router;