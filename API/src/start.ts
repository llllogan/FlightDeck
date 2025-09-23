import dotenv from 'dotenv';
import http from 'http';
import { app } from './app';
import { initDatabase, closePool } from './db/pool';

dotenv.config();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
let server: http.Server | undefined;

export async function start(): Promise<void> {
  await initDatabase();

  server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

  shutdownSignals.forEach((signal) => {
    process.on(signal, () => {
      void shutdown(signal);
    });
  });
}

export async function shutdown(signal: NodeJS.Signals): Promise<void> {
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
