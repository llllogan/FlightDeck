import { createPool, Pool, PoolOptions } from 'mysql2/promise';

let pool: Pool | undefined;

export async function initDatabase(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  const options: PoolOptions = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'flightdeck',
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT ? Number(process.env.DB_CONNECTION_LIMIT) : 10,
    queueLimit: 0,
  };

  pool = createPool(options);
  await pool.query('SELECT 1');
  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Call initDatabase() first.');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = undefined;
}
