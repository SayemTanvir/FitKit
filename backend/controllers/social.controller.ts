import { Request, Response } from 'express';
import { query } from '../db';

export async function getSocialFeed(_req: Request, res: Response) {
  try {
    const selectQuery = `
      SELECT 
        af.feed_id, 
        af.user_id, 
        COALESCE(u.name, 'Regular Member') AS member_name, 
        COALESCE(af.activity_type, af.feed_type, 'workout') AS activity_type, 
        COALESCE(af.description, af.message, 'Completed a workout') AS description, 
        af.created_at
      FROM ActivityFeed af
      LEFT JOIN users u ON af.user_id = u.user_id
      ORDER BY af.created_at DESC
      LIMIT 20;
    `;
    const { rows } = await query(selectQuery);
    return res.status(200).json(rows);
  } catch (error: any) {
    console.error('Fetch feed error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch social activity feed.' });
  }
}