import type { OkPacket, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from './pool';

type QueryParam = string | number | boolean | null;

type ProcedureResult<T> =
  | RowDataPacket[][]
  | RowDataPacket[]
  | OkPacket
  | OkPacket[]
  | ResultSetHeader
  | T;

export async function callStoredProcedure<T = ProcedureResult<RowDataPacket[][]>>(
  procedureName: string,
  params: QueryParam[] = [],
): Promise<T> {
  const pool = getPool();
  const placeholderSection = params.length ? `(${params.map(() => '?').join(', ')})` : '()';
  const sql = `CALL ${procedureName}${placeholderSection}`;
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

export async function querySingle<T = RowDataPacket>(sql: string, params: QueryParam[] = []): Promise<T | undefined> {
  const pool = getPool();
  const [rows] = await pool.query<T[]>(sql, params);
  return rows[0];
}

export async function queryAll<T = RowDataPacket>(sql: string, params: QueryParam[] = []): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.query<T[]>(sql, params);
  return rows;
}
