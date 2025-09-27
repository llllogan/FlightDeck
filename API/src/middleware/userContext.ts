import { NextFunction, Request, Response } from 'express';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUserId(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS') {
    next();
    return;
  }

  const userIdHeader = req.header('user_id') ?? req.header('user-id');
  const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;

  if (!userId) {
    res.status(400).json({ error: 'Missing user_id header' });
    return;
  }

  if (!UUID_V4_REGEX.test(userId)) {
    res.status(400).json({ error: 'Invalid user_id header format' });
    return;
  }

  req.userId = userId;
  next();
}
