import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

export interface AuthenticatedUser {
  userId: number;
  role: 'Admin' | 'Member';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

type AccountState = { role: AuthenticatedUser['role']; suspended: boolean; expiresAt: number };
const accountStateCache = new Map<number, AccountState>();
const ACCOUNT_CACHE_MS = 15_000;

export function clearAccountStateCache(userId: number) {
  accountStateCache.delete(userId);
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('replace_with_')) return res.status(503).json({ error: 'JWT_SECRET is not configured.' });
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    const payload = decoded as Partial<AuthenticatedUser>;
    if (!payload.userId || !payload.role) {
      return res.status(401).json({ error: 'Invalid session token payload.' });
    }

    try {
      let state = accountStateCache.get(payload.userId);
      if (!state || state.expiresAt <= Date.now()) {
        const current = await query(`SELECT u.suspended_at,
          CASE WHEN a.user_id IS NOT NULL THEN 'Admin' WHEN m.user_id IS NOT NULL THEN 'Member' END AS role
          FROM users u LEFT JOIN Admin a ON a.user_id=u.user_id AND a.is_active=TRUE LEFT JOIN Member m ON m.user_id=u.user_id WHERE u.user_id=$1`,[payload.userId]);
        if (!current.rowCount || !current.rows[0].role) return res.status(401).json({ error: 'Account no longer available.' });
        state = { role: current.rows[0].role, suspended: Boolean(current.rows[0].suspended_at), expiresAt: Date.now() + ACCOUNT_CACHE_MS };
        accountStateCache.set(payload.userId, state);
      }
      if (state.role !== payload.role) return res.status(401).json({ error: 'Account no longer available.' });
      if (state.suspended) return res.status(403).json({ error: 'Account suspended.' });
      req.user = payload as AuthenticatedUser;
      next();
    } catch (databaseError) { next(databaseError); }
  });
}

export function requireRole(allowedRole: 'Admin' | 'Member') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const allowed = req.user && (req.user.role === allowedRole || (allowedRole === 'Member' && req.user.role === 'Admin'));
    if (!allowed) {
      return res.status(403).json({ 
        error: `Forbidden: This operation requires the ${allowedRole} role.` 
      });
    }
    next();
  };
}
