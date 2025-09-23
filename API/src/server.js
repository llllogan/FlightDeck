require('dotenv').config();
const express = require('express');
const { initDatabase, closePool } = require('./db/pool');
const { healthCheck } = require('./controllers/healthController');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/health', healthCheck);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

let server;

async function start() {
  try {
    await initDatabase();
    server = app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  try {
    await closePool();
  } catch (error) {
    console.error('Error closing MySQL pool', error);
  }

  if (server) {
    server.close(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    shutdown(signal);
  });
});

if (require.main === module) {
  start();
}

module.exports = { app, start };
