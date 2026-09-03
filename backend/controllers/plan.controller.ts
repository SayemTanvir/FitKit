import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../db';

// Admin only: Create a workout plan
export async function createWorkoutPlan(req: AuthRequest, res: Response) {
  try {
    const { title, target_level, goal_category, duration_weeks } = req.body;
    const adminId = req.user?.userId;

    if (!title || !target_level || !duration_weeks) {
      return res.status(400).json({ error: 'Missing required plan fields.' });
    }

    const insertQuery = `
      INSERT INTO WorkoutPlan (admin_id, title, target_level, goal_category, duration_weeks)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const { rows } = await query(insertQuery, [
      adminId,
      title,
      target_level,
      goal_category || 'General Fitness',
      duration_weeks,
    ]);

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Create plan error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

// Public/Authenticated: Get all curated workout plans
export async function getWorkoutPlans(_req: AuthRequest, res: Response) {
  try {
    const selectQuery = `
      SELECT wp.plan_id, wp.title, wp.target_level, wp.goal_category, 
             wp.duration_weeks, u.name AS curated_by
      FROM WorkoutPlan wp
      JOIN users u ON wp.admin_id = u.user_id
      ORDER BY wp.plan_id DESC;
    `;
    const { rows } = await query(selectQuery);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Fetch plans error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}