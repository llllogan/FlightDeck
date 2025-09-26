import type { OkPacket, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool } from './pool';

type QueryParam = string | number | boolean | null;

type QueryResult = RowDataPacket[][] | RowDataPacket[] | OkPacket | OkPacket[] | ResultSetHeader;

export async function callStoredProcedure<T extends QueryResult = RowDataPacket[][]>(
  procedureName: string,
  params: QueryParam[] = [],
): Promise<T> {
  const pool = getPool();
  const placeholderSection = params.length ? `(${params.map(() => '?').join(', ')})` : '()';
  const sql = `CALL ${procedureName}${placeholderSection}`;
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

export async function querySingle<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params: QueryParam[] = [],
): Promise<T | undefined> {
  const pool = getPool();
  const [rows] = await pool.query<T[]>(sql, params);
  return rows[0];
}

export async function queryAll<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params: QueryParam[] = [],
): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.query<T[]>(sql, params);
  return rows;
}
