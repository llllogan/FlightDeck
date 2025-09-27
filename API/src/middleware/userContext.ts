import { NextFunction, Request, Response } from 'express';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CANDIDATE_HEADER_NAMES = ['x-user-id', 'user_id', 'user-id', 'userid', 'userId'];

export function requireUserId(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS') {
    next();
    return;
  }

  let userId: string | undefined;

  for (const headerName of CANDIDATE_HEADER_NAMES) {
    const headerValue = req.header(headerName);

    if (!headerValue) {
      continue;
    }

    userId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    break;
  }

  if (!userId) {
    res.status(400).json({ error: 'Missing x-user-id header' });
    return;
  }

  if (!UUID_V4_REGEX.test(userId)) {
    res.status(400).json({ error: 'Invalid x-user-id header format' });
    return;
  }

  req.userId = userId;
  next();
}
