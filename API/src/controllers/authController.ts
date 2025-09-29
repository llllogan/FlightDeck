import { Request, Response } from 'express';
import { compare } from 'bcryptjs';
import {
  getUserById as getUserByIdFromDb,
  getUserWithPasswordByName,
  type UserAuthRecord,
} from '../db/resourceAccess';
import {
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

interface LoginRequestBody {
  name?: string;
  password?: string;
}

interface RefreshRequestBody {
  refreshToken?: string;
}

type AuthSuccessResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    role: string | null;
  };
};

type AuthErrorResponse = { error: string };

type AuthResponse = Response<AuthSuccessResponse | AuthErrorResponse>;

type LogoutResponse = Response<{ success: true } | AuthErrorResponse>;

function sanitizeName(name?: string): string | null {
  if (typeof name !== 'string') {
    return null;
  }
  const trimmed = name.trim();
  return trimmed ? trimmed : null;
}

function sanitizePassword(password?: string): string | null {
  if (typeof password !== 'string') {
    return null;
  }
  const trimmed = password.trim();
  return trimmed ? trimmed : null;
}

function sanitizeRefreshToken(token?: string): string | null {
  if (typeof token !== 'string') {
    return null;
  }
  const trimmed = token.trim();
  return trimmed ? trimmed : null;
}

async function withRefreshTable<T>(operation: () => Promise<T>): Promise<T> {
  await ensureRefreshTokenTable();
  return operation();
}

function buildSuccessResponse(user: UserAuthRecord, accessToken: string, refreshToken: string) {
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  };
}

export async function login(req: Request<unknown, unknown, LoginRequestBody>, res: AuthResponse): Promise<void> {
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

    res.json(buildSuccessResponse(user, accessToken, refreshTokenDetails.token));
  } catch (error) {
    console.error('Failed to log in user', error);
    res.status(500).json({ error: 'Failed to log in.' });
  }
}

export async function refreshToken(
  req: Request<unknown, unknown, RefreshRequestBody>,
  res: AuthResponse,
): Promise<void> {
  const sanitizedRefreshToken = sanitizeRefreshToken(req.body?.refreshToken);

  if (!sanitizedRefreshToken) {
    res.status(400).json({ error: 'Refresh token is required.' });
    return;
  }

  const tokenHash = hashRefreshToken(sanitizedRefreshToken);

  try {
    const storedToken = await withRefreshTable(() => findRefreshToken(tokenHash));

    if (!storedToken) {
      res.status(401).json({ error: 'Invalid refresh token.' });
      return;
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await withRefreshTable(() => deleteRefreshToken(tokenHash));
      res.status(401).json({ error: 'Refresh token expired.' });
      return;
    }

    const user = await getUserByIdFromDb(storedToken.userId);

    if (!user) {
      await withRefreshTable(() => deleteRefreshToken(tokenHash));
      res.status(401).json({ error: 'Invalid refresh token.' });
      return;
    }

    if ((user.role ?? '').toLowerCase() !== 'admin') {
      await withRefreshTable(() => deleteRefreshToken(tokenHash));
      res.status(403).json({ error: 'Admin privileges required.' });
      return;
    }

    await withRefreshTable(() => deleteRefreshToken(tokenHash));

    const accessToken = generateAccessToken(user);
    const nextRefresh = generateRefreshToken();

    await withRefreshTable(() =>
      saveRefreshToken(user.id, hashRefreshToken(nextRefresh.token), nextRefresh.expiresAt),
    );

    res.json(buildSuccessResponse({ ...user, passwordHash: null }, accessToken, nextRefresh.token));
  } catch (error) {
    console.error('Failed to refresh token', error);
    res.status(500).json({ error: 'Failed to refresh token.' });
  }
}

export async function logout(
  req: Request<unknown, unknown, RefreshRequestBody>,
  res: LogoutResponse,
): Promise<void> {
  const sanitizedRefreshToken = sanitizeRefreshToken(req.body?.refreshToken);

  if (!sanitizedRefreshToken) {
    res.status(400).json({ error: 'Refresh token is required.' });
    return;
  }

  const tokenHash = hashRefreshToken(sanitizedRefreshToken);

  try {
    await withRefreshTable(() => deleteRefreshToken(tokenHash));
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke refresh token', error);
    res.status(500).json({ error: 'Failed to revoke refresh token.' });
  }
}
