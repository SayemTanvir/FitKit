import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// GET /api/social, /api/social/feed, or /api/social/posts
router.get(['/', '/feed', '/posts'], async (_req: Request, res: Response) => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS social_feed (
        feed_id SERIAL PRIMARY KEY,
        user_id INT,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    const result = await query(`
      SELECT 
        s.feed_id AS id,
        s.feed_id AS feed_id,
        s.content,
        s.timestamp,
        s.timestamp AS created_at,
        COALESCE(u.name, 'Alex Mercer') AS user_name,
        COALESCE(u.name, 'Alex Mercer') AS author,
        COALESCE(u.name, 'Alex Mercer') AS user
      FROM social_feed s
      LEFT JOIN users u ON s.user_id = u.user_id
      ORDER BY s.feed_id DESC;
    `);

    return res.status(200).json(result.rows);
  } catch (err: any) {
    console.error('Error fetching social feed:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch social feed' });
  }
});

// POST /api/social
router.post(['/', '/feed', '/posts'], async (req: Request, res: Response) => {
  try {
    const { user_id, userId, content, message } = req.body;
    const authorId = user_id || userId || 1;
    const postText = content || message || 'Completed a workout set on FitKit!';

    await query(`
      CREATE TABLE IF NOT EXISTS social_feed (
        feed_id SERIAL PRIMARY KEY,
        user_id INT,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    const result = await query(
      `INSERT INTO social_feed (user_id, content, timestamp)
       VALUES ($1, $2, NOW())
       RETURNING *;`,
      [authorId, postText]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;