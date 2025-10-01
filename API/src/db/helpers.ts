import type { OkPacket, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from './pool';

type QueryParam = string | number | boolean | Date | null;

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

function getFirstResultSet(rows: RowDataPacket[][] | RowDataPacket[]): RowDataPacket[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  const first = rows[0];
  if (Array.isArray(first)) {
    return first as RowDataPacket[];
  }

  return rows as RowDataPacket[];
}

export async function fetchSingleFromProcedure<T extends RowDataPacket = RowDataPacket>(
  procedureName: string,
  params: QueryParam[] = [],
): Promise<T | undefined> {
  const rows = await callStoredProcedure<RowDataPacket[][]>(procedureName, params);
  const resultSet = getFirstResultSet(rows);
  return (resultSet[0] as T) ?? undefined;
}

export async function fetchAllFromProcedure<T extends RowDataPacket = RowDataPacket>(
  procedureName: string,
  params: QueryParam[] = [],
): Promise<T[]> {
  const rows = await callStoredProcedure<RowDataPacket[][]>(procedureName, params);
  return getFirstResultSet(rows) as T[];
}

export type { QueryParam };
