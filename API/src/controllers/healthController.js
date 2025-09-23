const { initDatabase, getPool } = require('../db/pool');

async function healthCheck(_req, res) {
  try {
    await initDatabase();
    const pool = getPool();
    const [rows] = await pool.query('SELECT 1 AS result');
    res.json({ status: 'ok', database: rows[0].result === 1 ? 'connected' : 'unknown' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

module.exports = {
  healthCheck,
};
