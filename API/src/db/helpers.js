const { getPool } = require('./pool');

async function callStoredProcedure(procedureName, params = []) {
  const pool = getPool();
  const placeholderSection = params.length ? `(${params.map(() => '?').join(', ')})` : '()';
  const sql = `CALL ${procedureName}${placeholderSection}`;
  return pool.query(sql, params);
}

async function querySingle(sql, params = []) {
  const pool = getPool();
  const [rows] = await pool.query(sql, params);
  return rows[0];
}

async function queryAll(sql, params = []) {
  const pool = getPool();
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = {
  callStoredProcedure,
  querySingle,
  queryAll,
};
