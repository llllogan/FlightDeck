import type { Request, Response } from 'express';
import { accessTtlSeconds, refreshTtlSeconds } from '../services/authTokens';

const ACCESS_COOKIE_NAME = 'flightdeck_access_token';
const REFRESH_COOKIE_NAME = 'flightdeck_refresh_token';

const isProduction = process.env.NODE_ENV === 'production';
const secureCookies = process.env.AUTH_COOKIE_SECURE
  ? process.env.AUTH_COOKIE_SECURE.toLowerCase() === 'true'
  : isProduction;
const sameSite: 'strict' | 'lax' = secureCookies ? 'strict' : 'lax';
const basePath = process.env.AUTH_COOKIE_PATH ?? '/api';

export function setAccessCookie(res: Response, token: string): void {
  res.cookie(ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite,
    maxAge: accessTtlSeconds * 1000,
    path: basePath,
  });
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite,
    maxAge: refreshTtlSeconds * 1000,
    path: basePath,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: secureCookies,
    sameSite,
    path: basePath,
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: secureCookies,
    sameSite,
    path: basePath,
  });
}

export function getAccessTokenFromCookies(req: Request): string | null {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  return typeof token === 'string' && token ? token : null;
}

export function getRefreshTokenFromCookies(req: Request): string | null {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof token === 'string' && token ? token : null;
}

export { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME };
