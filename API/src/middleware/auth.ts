import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/authTokens';

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: string | null;
}

function extractTokenFromHeader(headerValue: string | undefined): string | null {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token;
}

export function requireAuth(options: { requireAdmin?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const headerValue = req.header('authorization') || req.header('Authorization');
    const token = extractTokenFromHeader(headerValue || undefined);

    if (!token) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    try {
      const decoded = verifyAccessToken(token);
      req.authUser = {
        id: decoded.sub,
        name: decoded.name,
        role: decoded.role,
      };

      if (options.requireAdmin && (decoded.role ?? '').toLowerCase() !== 'admin') {
        res.status(403).json({ error: 'Admin privileges required' });
        return;
      }

      next();
    } catch (error) {
      console.error('Failed to verify access token', error);
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
