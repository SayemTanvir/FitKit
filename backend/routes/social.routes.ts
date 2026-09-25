import { Response, Router } from 'express';
import { query } from '../db';
import { AuthRequest, requireRole, verifyToken } from '../middleware/auth.middleware';
import { reactionTypes, toggleReaction } from '../services/reactions';

const router = Router();

router.get('/leaderboard', verifyToken, async (req: AuthRequest, res: Response) => {
  const metric = String(req.query.metric || 'steps');
  const period = String(req.query.period || 'week');
  const level = String(req.query.level || 'All');
  const scope = String(req.query.scope || 'all');
  const country = String(req.query.country || '').trim().toUpperCase();
  if (!['steps', 'calories', 'workouts'].includes(metric) ||
      !['today', 'week', 'month', 'all'].includes(period) ||
      !['All', 'Beginner', 'Intermediate', 'Advanced'].includes(level) ||
      !['all', 'friends'].includes(scope) || (country && !/^[A-Z]{2}$/.test(country))) {
    return res.status(400).json({ error: 'Invalid leaderboard filters.' });
  }
  const days = { today: 1, week: 7, month: 30, all: null }[period as 'today' | 'week' | 'month' | 'all'];

  try {
    const result = await query(
      `WITH totals AS (
         SELECT u.user_id, u.name, u.fitness_level, mp.photo_url, c.country_name,
                COALESCE(s.steps, 0)::bigint AS steps,
                ROUND(COALESCE(s.calories, 0) + COALESCE(w.calories, 0))::int AS calories,
                COALESCE(w.workouts, 0)::int AS workouts
         FROM Member m
         JOIN users u ON u.user_id = m.user_id
         LEFT JOIN MemberProfile mp ON mp.user_id = u.user_id
         LEFT JOIN Country c ON c.country_id = u.country_id
         LEFT JOIN LATERAL (
           SELECT SUM(steps_added) AS steps, SUM(calories_burned) AS calories
           FROM StepEntry
           WHERE user_id = u.user_id AND is_public = TRUE
             AND ($1::int IS NULL OR logged_at::date >= CURRENT_DATE - ($1::int - 1))
         ) s ON TRUE
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS workouts, SUM(calories_burned) AS calories
           FROM WorkoutEntry
           WHERE user_id = u.user_id AND is_public = TRUE
             AND ($1::int IS NULL OR logged_at::date >= CURRENT_DATE - ($1::int - 1))
         ) w ON TRUE
         WHERE ($2 = 'All' OR u.fitness_level = $2)
           AND ($6::char(2) IS NULL OR u.country_id = $6)
           AND ($4 = 'all' OR u.user_id = $5 OR EXISTS (
             SELECT 1 FROM FriendRequest f
             WHERE ((f.requester_id = $5 AND f.recipient_id = u.user_id)
                 OR (f.recipient_id = $5 AND f.requester_id = u.user_id))
               AND f.status = 'Accepted'
           ))
       ), scored AS (
         SELECT *, CASE $3
           WHEN 'steps' THEN steps
           WHEN 'calories' THEN calories
           ELSE workouts
         END AS score
         FROM totals
       )
        SELECT user_id, name, photo_url, fitness_level, country_name, steps, calories, workouts, score,
              DENSE_RANK() OVER (ORDER BY score DESC)::int AS rank
       FROM scored
       ORDER BY score DESC, name ASC
       LIMIT 50`,
      [days, level, metric, scope, req.user!.userId, country || null]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
});

router.get(['/', '/feed'], verifyToken, async (req: AuthRequest, res: Response) => {
  const rawCursor = String(req.query.cursor || '');
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 30) : 12;
  let cursorCreatedAt: string | null = null;
  let cursorFeedId: number | null = null;
  if (rawCursor) {
    try {
      const cursor = JSON.parse(Buffer.from(rawCursor, 'base64url').toString('utf8'));
      if (typeof cursor.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/.test(cursor.createdAt) ||
          Number.isNaN(new Date(cursor.createdAt).getTime()) || !Number.isInteger(cursor.feedId) || cursor.feedId < 1) {
        return res.status(400).json({ error: 'Invalid feed cursor.' });
      }
      cursorCreatedAt = cursor.createdAt;
      cursorFeedId = cursor.feedId;
    } catch {
      return res.status(400).json({ error: 'Invalid feed cursor.' });
    }
  }
  try {
    const result = await query(
      `SELECT
         af.feed_id AS id,
         af.feed_id,
         af.user_id,
         u.name AS user_name,
         mp.photo_url,
         af.message AS content,
         af.feed_type,
         af.created_at AS timestamp,
         to_char(af.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US') AS cursor_created_at,
         COUNT(fr.user_id) FILTER (WHERE fr.reaction_type = 'Fire')::int AS fire_count,
         COUNT(fr.user_id) FILTER (WHERE fr.reaction_type = 'Flex')::int AS flex_count,
         COUNT(fr.user_id) FILTER (WHERE fr.reaction_type = 'Clap')::int AS clap_count,
         MAX(fr.reaction_type) FILTER (WHERE fr.user_id = $1) AS my_reaction
       FROM ActivityFeed af
       JOIN users u ON u.user_id = af.user_id
       JOIN MemberProfile mp ON mp.user_id = af.user_id
       LEFT JOIN FeedReaction fr ON fr.feed_id = af.feed_id
       WHERE ($2::timestamp IS NULL OR af.created_at < $2::timestamp OR (af.created_at = $2::timestamp AND af.feed_id < $3::int))
         AND NOT EXISTS (SELECT 1 FROM UserBlock b WHERE (b.blocker_id=$1 AND b.blocked_id=af.user_id) OR (b.blocked_id=$1 AND b.blocker_id=af.user_id))
         AND (af.user_id = $1 OR mp.is_private = FALSE
          OR EXISTS (SELECT 1 FROM FollowRelationship f WHERE f.follower_id=$1 AND f.followed_id=af.user_id AND f.status='Accepted')
          OR EXISTS (SELECT 1 FROM FriendRequest f WHERE ((f.requester_id=$1 AND f.recipient_id=af.user_id) OR (f.recipient_id=$1 AND f.requester_id=af.user_id)) AND f.status='Accepted'))
       GROUP BY af.feed_id, u.name, mp.photo_url
       ORDER BY af.created_at DESC, af.feed_id DESC
       LIMIT $4`,
      [req.user!.userId, cursorCreatedAt, cursorFeedId, limit + 1]
    );
    const hasMore = result.rows.length > limit;
    const items = result.rows.slice(0, limit);
    const last = items.at(-1);
    const nextCursor = hasMore && last
      ? Buffer.from(JSON.stringify({ createdAt: last.cursor_created_at, feedId: last.feed_id })).toString('base64url')
      : null;
    return res.status(200).json({ items, nextCursor, hasMore });
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
    if (!Number.isInteger(feedId) || !reactionTypes.includes(reactionType as typeof reactionTypes[number])) {
      return res.status(400).json({ error: 'Invalid feed item or reaction.' });
    }

    try {
      const allowed = await query(`SELECT 1 FROM ActivityFeed af JOIN MemberProfile mp ON mp.user_id=af.user_id WHERE af.feed_id=$2
        AND NOT EXISTS (SELECT 1 FROM UserBlock b WHERE (b.blocker_id=$1 AND b.blocked_id=af.user_id) OR (b.blocked_id=$1 AND b.blocker_id=af.user_id))
        AND (af.user_id=$1 OR mp.is_private=FALSE OR EXISTS (SELECT 1 FROM FollowRelationship f WHERE f.follower_id=$1 AND f.followed_id=af.user_id AND f.status='Accepted') OR EXISTS (SELECT 1 FROM FriendRequest f WHERE ((f.requester_id=$1 AND f.recipient_id=af.user_id) OR (f.recipient_id=$1 AND f.requester_id=af.user_id)) AND f.status='Accepted'))`, [req.user!.userId,feedId]);
      if (!allowed.rowCount) return res.status(404).json({ error: 'Feed item not found.' });
      return res.status(200).json(await toggleReaction('feed_id',feedId,req.user!.userId,reactionType));
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
