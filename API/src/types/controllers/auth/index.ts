import type { Request, Response } from 'express';

export interface LoginRequestBody {
  name?: string;
  password?: string;
}

export interface AuthSessionResponse {
  user: {
    id: string;
    name: string;
    role: string | null;
  };
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
}

export type AuthErrorResponse = { error: string };
export type AuthResponse = Response<AuthSessionResponse | AuthErrorResponse>;
export type LogoutResponse = Response<{ success: true } | AuthErrorResponse>;
export type LoginRequest = Request<unknown, unknown, LoginRequestBody>;
