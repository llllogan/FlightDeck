import type { RowDataPacket } from 'mysql2/promise';
import { callStoredProcedure, fetchSingleFromProcedure } from './helpers';

export interface RefreshTokenRow extends RowDataPacket {
  id: number;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export async function ensureRefreshTokenTable(): Promise<void> {
  await callStoredProcedure('ensure_refresh_token_table');
}

export async function saveRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await callStoredProcedure('save_refresh_token', [userId, tokenHash, expiresAt]);
}

export async function findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | undefined> {
  return fetchSingleFromProcedure<RefreshTokenRow>('find_refresh_token', [tokenHash]);
}

export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  await callStoredProcedure('delete_refresh_token', [tokenHash]);
}

export async function deleteRefreshTokensForUser(userId: string): Promise<void> {
  await callStoredProcedure('delete_refresh_tokens_for_user', [userId]);
}
