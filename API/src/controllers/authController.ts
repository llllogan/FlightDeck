import type { Request, Response } from 'express';
import { compare } from 'bcryptjs';
import {
  getUserById as getUserByIdFromDb,
  getUserWithPasswordByName,
  type UserAuthRecord,
} from '../db/resourceAccess';
import {
  accessTtlSeconds,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../services/authTokens';
import {
  deleteRefreshToken,
  ensureRefreshTokenTable,
  findRefreshToken,
  saveRefreshToken,
} from '../db/refreshTokens';
import { sanitizeTextInput } from '../utils/sanitizers';
import {
  clearAuthCookies,
  getRefreshTokenFromCookies,
  setAccessCookie,
  setRefreshCookie,
} from '../utils/authCookies';
import type {
  AuthErrorResponse,
  AuthResponse,
  AuthSessionResponse,
  LoginRequest,
  LogoutResponse,
} from '../types/controllers/auth';

const sanitizeName = (name?: string) => sanitizeTextInput(name);
const sanitizePassword = (password?: string) => sanitizeTextInput(password, { maxLength: 128 });
const sanitizeRefreshToken = (token?: string) => sanitizeTextInput(token, { maxLength: 512 });

async function withRefreshTable<T>(operation: () => Promise<T>): Promise<T> {
  await ensureRefreshTokenTable();
  return operation();
}

function buildSessionPayload(user: UserAuthRecord, options?: { refreshExpiresAt?: Date }): AuthSessionResponse {
  const now = Date.now();
  const accessExpiresAt = new Date(now + accessTtlSeconds * 1000);

  return {
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
    accessTokenExpiresAt: accessExpiresAt.toISOString(),
    refreshTokenExpiresAt: options?.refreshExpiresAt?.toISOString(),
  };
}

function respondWithInvalidRefresh(res: Response<AuthErrorResponse>, message: string): void {
  clearAuthCookies(res);
  res.status(401).json({ error: message });
}

export async function login(req: LoginRequest, res: AuthResponse): Promise<void> {
  const sanitizedName = sanitizeName(req.body?.name);
  const sanitizedPassword = sanitizePassword(req.body?.password);

  if (!sanitizedName || !sanitizedPassword) {
    res.status(400).json({ error: 'Name and password are required.' });
    return;
  }

  try {
    const user = await getUserWithPasswordByName(sanitizedName);

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    if ((user.role ?? '').toLowerCase() !== 'admin') {
      res.status(403).json({ error: 'Admin privileges required.' });
      return;
    }

    const passwordMatches = await compare(sanitizedPassword, user.passwordHash);

    if (!passwordMatches) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const accessToken = generateAccessToken(user);
    const refreshTokenDetails = generateRefreshToken();

    await withRefreshTable(() =>
      saveRefreshToken(user.id, hashRefreshToken(refreshTokenDetails.token), refreshTokenDetails.expiresAt),
    );

    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshTokenDetails.token);

    res.json(buildSessionPayload(user, { refreshExpiresAt: refreshTokenDetails.expiresAt }));
  } catch (error) {
    console.error('Failed to log in user', error);
    res.status(500).json({ error: 'Failed to log in.' });
  }
}

export async function refreshToken(req: Request, res: AuthResponse): Promise<void> {
  const cookieRefreshToken = getRefreshTokenFromCookies(req);
  const sanitizedFromBody = sanitizeRefreshToken((req.body as { refreshToken?: string })?.refreshToken);
  const refreshToken = cookieRefreshToken ?? sanitizedFromBody;

  if (!refreshToken) {
    respondWithInvalidRefresh(res, 'Refresh token is required.');
    return;
  }

  const tokenHash = hashRefreshToken(refreshToken);

  try {
    const storedToken = await withRefreshTable(() => findRefreshToken(tokenHash));

    if (!storedToken) {
      respondWithInvalidRefresh(res, 'Invalid refresh token.');
      return;
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await withRefreshTable(() => deleteRefreshToken(tokenHash));
      respondWithInvalidRefresh(res, 'Refresh token expired.');
      return;
    }

    const user = await getUserByIdFromDb(storedToken.userId);

    if (!user) {
      await withRefreshTable(() => deleteRefreshToken(tokenHash));
      respondWithInvalidRefresh(res, 'Invalid refresh token.');
      return;
    }

    if ((user.role ?? '').toLowerCase() !== 'admin') {
      await withRefreshTable(() => deleteRefreshToken(tokenHash));
      clearAuthCookies(res);
      res.status(403).json({ error: 'Admin privileges required.' });
      return;
    }

    await withRefreshTable(() => deleteRefreshToken(tokenHash));

    const accessToken = generateAccessToken(user);
    const nextRefresh = generateRefreshToken();

    await withRefreshTable(() =>
      saveRefreshToken(user.id, hashRefreshToken(nextRefresh.token), nextRefresh.expiresAt),
    );

    setAccessCookie(res, accessToken);
    setRefreshCookie(res, nextRefresh.token);

    res.json(buildSessionPayload({ ...user, passwordHash: null }, { refreshExpiresAt: nextRefresh.expiresAt }));
  } catch (error) {
    console.error('Failed to refresh token', error);
    clearAuthCookies(res);
    res.status(500).json({ error: 'Failed to refresh token.' });
  }
}

export async function logout(req: Request, res: LogoutResponse): Promise<void> {
  const cookieRefreshToken = getRefreshTokenFromCookies(req);
  const sanitizedFromBody = sanitizeRefreshToken((req.body as { refreshToken?: string })?.refreshToken);
  const refreshToken = cookieRefreshToken ?? sanitizedFromBody;

  try {
    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      await withRefreshTable(() => deleteRefreshToken(tokenHash));
    }
  } catch (error) {
    console.error('Failed to revoke refresh token', error);
    res.status(500).json({ error: 'Failed to revoke refresh token.' });
    return;
  } finally {
    clearAuthCookies(res);
  }

  res.json({ success: true });
}

export function getSession(req: Request, res: AuthResponse): void {
  const authUser = req.authUser;

  if (!authUser) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  res.json({
    user: {
      id: authUser.id,
      name: authUser.name,
      role: authUser.role,
    },
  });
}
