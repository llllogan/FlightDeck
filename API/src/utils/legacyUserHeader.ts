import type { Request } from 'express';

const CANDIDATE_HEADER_NAMES = ['x-user-id', 'user_id', 'user-id', 'userid', 'userId'];

export function extractLegacyUserId(req: Request): string | null {
  for (const headerName of CANDIDATE_HEADER_NAMES) {
    const headerValue = req.header(headerName);

    if (!headerValue) {
      continue;
    }

    const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}
