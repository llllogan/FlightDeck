import { start } from './start';

start().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('Failed to start server:', message);
  process.exit(1);
});
