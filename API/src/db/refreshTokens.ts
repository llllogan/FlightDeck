import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from './pool';

export interface RefreshTokenRow extends RowDataPacket {
  id: number;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export async function ensureRefreshTokenTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_refresh_tokens (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      userId CHAR(36) NOT NULL,
      tokenHash CHAR(64) NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_refresh_tokens_userId (userId),
      UNIQUE INDEX idx_user_refresh_tokens_tokenHash (tokenHash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function saveRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    'INSERT INTO user_refresh_tokens (userId, tokenHash, expiresAt) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt],
  );
}

export async function findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | undefined> {
  const pool = getPool();
  const [rows] = await pool.query<RefreshTokenRow[]>(
    'SELECT * FROM user_refresh_tokens WHERE tokenHash = ? LIMIT 1',
    [tokenHash],
  );

  return rows[0];
}

export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM user_refresh_tokens WHERE tokenHash = ?', [tokenHash]);
}

export async function deleteRefreshTokensForUser(userId: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM user_refresh_tokens WHERE userId = ?', [userId]);
}
