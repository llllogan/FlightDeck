import { Request, Response } from 'express';
import { initDatabase, getPool } from '../db/pool';

async function healthCheck(_req: Request, res: Response): Promise<void> {
  try {
    await initDatabase();
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.ping();
      res.json({ status: 'ok', database: 'connected' });
    } finally {
      connection.release();
    }
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
