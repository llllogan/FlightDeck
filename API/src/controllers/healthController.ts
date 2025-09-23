import { Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { initDatabase, getPool } from '../db/pool';

type HealthCheckRow = RowDataPacket & { result: number };

async function healthCheck(_req: Request, res: Response): Promise<void> {
  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query<HealthCheckRow[]>('SELECT 1 AS result');
    const isConnected = rows.length > 0 && rows[0]?.result === 1;
    res.json({ status: 'ok', database: isConnected ? 'connected' : 'unknown' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ status: 'error', message });
  }
}

export { healthCheck };

const healthController = {
  healthCheck,
};

export default healthController;
