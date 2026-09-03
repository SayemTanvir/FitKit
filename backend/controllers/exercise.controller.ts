import { Request, Response } from 'express';
import { query } from '../db';

export async function getExercises(_req: Request, res: Response) {
  try {
    const { rows } = await query('SELECT * FROM Exercise ORDER BY exercise_id ASC;');
    console.log('Available Exercise columns:', rows[0] ? Object.keys(rows[0]) : 'Empty table');
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Fetch exercises error:', error);
    return res.status(500).json({ error: 'Failed to fetch exercise catalog.' });
  }
}