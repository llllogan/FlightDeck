import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import type { Server } from 'http';
import { initDatabase, closePool } from './db/pool';
import { healthCheck } from './controllers/healthController';
import { requireUserId } from './middleware/userContext';
import * as usersController from './controllers/usersController';
import * as tabGroupsController from './controllers/tabGroupsController';
import * as tabsController from './controllers/tabsController';
import * as environmentsController from './controllers/environmentsController';
import * as constsController from './controllers/constsController';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

app.get('/health', healthCheck);
app.get('/consts/environments', constsController.getEnvironments);

app.post('/users', usersController.createUser);
app.delete('/users', requireUserId, usersController.deleteUser);
app.get('/users/tab-groups', requireUserId, usersController.getUserTabGroups);
app.get('/users/summary', requireUserId, usersController.getUserSummary);

app.get('/tab-groups', requireUserId, tabGroupsController.listTabGroups);
app.post('/tab-groups', requireUserId, tabGroupsController.createTabGroup);
app.patch('/tab-groups/:tabGroupId', requireUserId, tabGroupsController.renameTabGroup);
app.delete('/tab-groups/:tabGroupId', requireUserId, tabGroupsController.deleteTabGroup);
app.get('/tab-groups/summary', requireUserId, tabGroupsController.getTabGroupSummary);

app.get('/tabs', requireUserId, tabsController.listTabs);
app.post('/tabs', requireUserId, tabsController.createTab);
app.patch('/tabs/:tabId', requireUserId, tabsController.renameTab);
app.delete('/tabs/:tabId', requireUserId, tabsController.deleteTab);

app.get('/environments', requireUserId, environmentsController.listEnvironments);
app.post('/environments', requireUserId, environmentsController.createEnvironment);
app.patch('/environments/:environmentId', requireUserId, environmentsController.updateEnvironment);
app.delete('/environments/:environmentId', requireUserId, environmentsController.deleteEnvironment);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

let server: Server | undefined;

export async function start(): Promise<void> {
  try {
    await initDatabase();
    server = app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to start server:', message);
    process.exit(1);
  }
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

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    void shutdown(signal);
  });
});

if (require.main === module) {
  void start();
}

export { app };
