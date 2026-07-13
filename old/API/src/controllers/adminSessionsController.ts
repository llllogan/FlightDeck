import type { Request, Response } from 'express';
import {
  deleteRefreshTokenById,
  listRefreshTokens,
} from '../db/refreshTokens';
import { serializeAdminSession } from '../serializers';
import type {
  AdminSessionsResponse,
  DeleteSessionRequest,
  DeleteSessionResponse,
} from '../types/controllers/adminSessions';

export async function listAdminSessions(_req: Request, res: AdminSessionsResponse): Promise<void> {
  try {
    const sessions = await listRefreshTokens();
    res.json(sessions.map(serializeAdminSession));
  } catch (error) {
    console.error('Failed to list admin sessions', error);
    res.status(500).json({ error: 'Failed to list sessions.' });
  }
}

export async function deleteAdminSession(
  req: DeleteSessionRequest,
  res: DeleteSessionResponse,
): Promise<void> {
  const { sessionId } = req.params;
  const parsedId = Number(sessionId);

  if (!Number.isFinite(parsedId) || parsedId <= 0 || !Number.isSafeInteger(parsedId)) {
    res.status(400).json({ error: 'Invalid session id.' });
    return;
  }

  try {
    await deleteRefreshTokenById(parsedId);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete admin session', error);
    res.status(500).json({ error: 'Failed to delete session.' });
  }
}
