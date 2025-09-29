import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface UserPayload {
  id: string;
  name: string;
  role: string | null;
}

const DEFAULT_ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
const DEFAULT_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getAccessTtl(): number {
  const value = process.env.JWT_ACCESS_TTL_SECONDS;
  if (!value) {
    return DEFAULT_ACCESS_TTL_SECONDS;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ACCESS_TTL_SECONDS;
}

function getRefreshTtl(): number {
  const value = process.env.JWT_REFRESH_TTL_SECONDS;
  if (!value) {
    return DEFAULT_REFRESH_TTL_SECONDS;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REFRESH_TTL_SECONDS;
}

const accessTtlSeconds = getAccessTtl();
const refreshTtlSeconds = getRefreshTtl();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('JWT_SECRET is not set. Using a default insecure secret.');
    return 'change-me-in-production';
  }
  return secret;
}

export function generateAccessToken(user: UserPayload): string {
  const payload = {
    sub: user.id,
    name: user.name,
    role: user.role ?? null,
  } satisfies JwtPayload;

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: accessTtlSeconds,
  });
}

export interface RefreshTokenDetails {
  token: string;
  expiresAt: Date;
}

export function generateRefreshToken(): RefreshTokenDetails {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);
  return { token, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface DecodedAccessToken extends JwtPayload {
  sub: string;
  name: string;
  role: string | null;
}

export function verifyAccessToken(token: string): DecodedAccessToken {
  return jwt.verify(token, getJwtSecret()) as DecodedAccessToken;
}

export { accessTtlSeconds, refreshTtlSeconds };
