require('dotenv').config();
const express = require('express');
const { initDatabase, closePool } = require('./db/pool');
const { healthCheck } = require('./controllers/healthController');
const { requireUserId } = require('./middleware/userContext');
const usersController = require('./controllers/usersController');
const tabGroupsController = require('./controllers/tabGroupsController');
const tabsController = require('./controllers/tabsController');
const environmentsController = require('./controllers/environmentsController');
const constsController = require('./controllers/constsController');

const app = express();
const port = Number(process.env.PORT) || 3000;

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
