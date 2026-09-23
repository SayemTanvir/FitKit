import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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

  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    const payload = decoded as Partial<AuthenticatedUser>;
    if (!payload.userId || !payload.role) {
      return res.status(401).json({ error: 'Invalid session token payload.' });
    }

    req.user = payload as AuthenticatedUser;
    next();
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
