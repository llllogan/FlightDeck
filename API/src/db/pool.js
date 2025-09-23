const mysql = require('mysql2/promise');

let pool;

async function initDatabase() {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'flightdeck',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
  });

  await pool.query('SELECT 1');
  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Call initDatabase() first.');
  }
  return pool;
}

async function closePool() {
  if (!pool) {
    return;
  }
  await pool.end();
  pool = undefined;
}

module.exports = {
  initDatabase,
  getPool,
  closePool,
};
