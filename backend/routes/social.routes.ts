import { Response, Router } from 'express';
import { query } from '../db';
import { AuthRequest, requireRole, verifyToken } from '../middleware/auth.middleware';

const router = Router();

// Stable, display-only starting engagement. Real member reactions remain in
// FeedReaction and are added on top of these per-post counts.
function startingCounts(feedId: number) {
  const count = (salt: number) => 10 + (((Math.imul(feedId, 0x45d9f3b) ^ salt) >>> 0) % 6);
  return {
    fire_count: count(0x1f123bb5),
    flex_count: count(0x3c6ef372),
    clap_count: count(0x5a827999),
  };
}

function addStartingCounts(row: {
  feed_id: number;
  fire_count: number;
  flex_count: number;
  clap_count: number;
}) {
  const starting = startingCounts(Number(row.feed_id));
  return {
    ...row,
    fire_count: Number(row.fire_count) + starting.fire_count,
    flex_count: Number(row.flex_count) + starting.flex_count,
    clap_count: Number(row.clap_count) + starting.clap_count,
  };
}

router.get(['/', '/feed'], verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT
         af.feed_id AS id,
         af.feed_id,
         af.user_id,
         u.name AS user_name,
         af.message AS content,
         af.feed_type,
         af.created_at AS timestamp,
         COUNT(fr.user_id) FILTER (WHERE fr.reaction_type = 'Fire')::int AS fire_count,
         COUNT(fr.user_id) FILTER (WHERE fr.reaction_type = 'Flex')::int AS flex_count,
         COUNT(fr.user_id) FILTER (WHERE fr.reaction_type = 'Clap')::int AS clap_count,
         MAX(fr.reaction_type) FILTER (WHERE fr.user_id = $1) AS my_reaction
       FROM ActivityFeed af
       JOIN users u ON u.user_id = af.user_id
       LEFT JOIN FeedReaction fr ON fr.feed_id = af.feed_id
       GROUP BY af.feed_id, u.name
       ORDER BY af.created_at DESC
       LIMIT 20`,
      [req.user!.userId]
    );
    return res.status(200).json(result.rows.map(addStartingCounts));
  } catch (err) {
    console.error('Fetch social feed error:', err);
    return res.status(500).json({ error: 'Failed to fetch social activity feed.' });
  }
});

router.post(
  '/feed/:id/reaction',
  verifyToken,
  requireRole('Member'),
  async (req: AuthRequest, res: Response) => {
    const feedId = Number(req.params.id);
    const reactionType = String(req.body?.reaction_type || '');
    if (!Number.isInteger(feedId) || !['Fire', 'Flex', 'Clap'].includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid feed item or reaction.' });
    }

    try {
      const current = await query(
        `SELECT reaction_type
         FROM FeedReaction
         WHERE user_id = $1 AND feed_id = $2`,
        [req.user!.userId, feedId]
      );

      if (current.rows[0]?.reaction_type === reactionType) {
        await query(
          `DELETE FROM FeedReaction WHERE user_id = $1 AND feed_id = $2`,
          [req.user!.userId, feedId]
        );
      } else {
        await query(
          `INSERT INTO FeedReaction (user_id, feed_id, reaction_type)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, feed_id)
           DO UPDATE SET reaction_type = EXCLUDED.reaction_type, reacted_at = CURRENT_TIMESTAMP`,
          [req.user!.userId, feedId, reactionType]
        );
      }

      const counts = await query(
        `SELECT
           COUNT(*) FILTER (WHERE reaction_type = 'Fire')::int AS fire_count,
           COUNT(*) FILTER (WHERE reaction_type = 'Flex')::int AS flex_count,
           COUNT(*) FILTER (WHERE reaction_type = 'Clap')::int AS clap_count,
           MAX(reaction_type) FILTER (WHERE user_id = $1) AS my_reaction
         FROM FeedReaction
         WHERE feed_id = $2`,
        [req.user!.userId, feedId]
      );
      return res.status(200).json(addStartingCounts({ ...counts.rows[0], feed_id: feedId }));
    } catch (err: any) {
      if (err.code === '23503') {
        return res.status(404).json({ error: 'Feed item not found.' });
      }
      console.error('React to feed error:', err);
      return res.status(500).json({ error: 'Failed to save reaction.' });
    }
  }
);

export default router;
