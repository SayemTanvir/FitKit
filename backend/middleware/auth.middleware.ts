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
      const current = await query(`SELECT u.suspended_at,
        CASE WHEN a.user_id IS NOT NULL THEN 'Admin' WHEN m.user_id IS NOT NULL THEN 'Member' END AS role
        FROM users u LEFT JOIN Admin a ON a.user_id=u.user_id LEFT JOIN Member m ON m.user_id=u.user_id WHERE u.user_id=$1`,[payload.userId]);
      if (!current.rowCount || current.rows[0].role !== payload.role) return res.status(401).json({ error: 'Account no longer available.' });
      if (current.rows[0].suspended_at) return res.status(403).json({ error: 'Account suspended.' });
      req.user = payload as AuthenticatedUser;
      next();
    } catch (databaseError) { next(databaseError); }
  });
}

export function requireRole(allowedRole: 'Admin' | 'Member') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== allowedRole) {
      return res.status(403).json({ 
        error: `Forbidden: This operation requires the ${allowedRole} role.` 
      });
    }
    next();
  };
}
