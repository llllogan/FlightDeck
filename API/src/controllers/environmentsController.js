/**
 * @typedef {import('../models/requestBodies').CreateEnvironmentRequest} CreateEnvironmentRequest
 * @typedef {import('../models/requestBodies').UpdateEnvironmentRequest} UpdateEnvironmentRequest
 */

const { callStoredProcedure } = require('../db/helpers');
const {
  getTabById,
  getEnvironmentById,
  getLatestEnvironmentForTab,
  listEnvironmentsForUser,
} = require('../db/resourceAccess');

async function listEnvironments(req, res) {
  try {
    const environments = await listEnvironmentsForUser(req.userId);
    return res.json(environments);
  } catch (error) {
    console.error('Failed to list environments', error);
    return res.status(500).json({ error: 'Failed to list environments' });
  }
}

async function createEnvironment(req, res) {
  /** @type {CreateEnvironmentRequest} */
  const payload = req.body || {};
  const { tabId, name, url } = payload;

  if (!tabId || typeof tabId !== 'string') {
    return res.status(400).json({ error: 'tabId is required' });
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const tab = await getTabById(tabId);

    if (!tab) {
      return res.status(404).json({ error: 'Tab not found' });
    }

    if (tab.userId !== req.userId) {
      return res.status(403).json({ error: 'You do not have access to this tab' });
    }

    const sanitizedName = name.trim();
    const sanitizedUrl = url.trim();

    await callStoredProcedure('create_environment', [tabId, sanitizedName, sanitizedUrl]);
    const created = await getLatestEnvironmentForTab(tabId);

    if (!created) {
      return res.status(201).json({ message: 'Environment created but could not retrieve record' });
    }

    return res.status(201).json({ environment: created });
  } catch (error) {
    console.error('Failed to create environment', error);
    return res.status(500).json({ error: 'Failed to create environment' });
  }
}

async function updateEnvironment(req, res) {
  const { environmentId } = req.params;

  /** @type {UpdateEnvironmentRequest} */
  const payload = req.body || {};
  const { name, url } = payload;

  if (!environmentId) {
    return res.status(400).json({ error: 'environmentId path parameter is required' });
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const environment = await getEnvironmentById(environmentId);

    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    if (environment.userId !== req.userId) {
      return res.status(403).json({ error: 'You do not have access to this environment' });
    }

    const sanitizedName = name.trim();
    const sanitizedUrl = url.trim();

    await callStoredProcedure('update_environment', [environmentId, sanitizedName, sanitizedUrl]);
    const updated = await getEnvironmentById(environmentId);
    return res.json({ environment: updated });
  } catch (error) {
    console.error('Failed to update environment', error);
    return res.status(500).json({ error: 'Failed to update environment' });
  }
}

async function deleteEnvironment(req, res) {
  const { environmentId } = req.params;

  if (!environmentId) {
    return res.status(400).json({ error: 'environmentId path parameter is required' });
  }

  try {
    const environment = await getEnvironmentById(environmentId);

    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    if (environment.userId !== req.userId) {
      return res.status(403).json({ error: 'You do not have access to this environment' });
    }

    await callStoredProcedure('delete_environment', [environmentId]);
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to delete environment', error);
    return res.status(500).json({ error: 'Failed to delete environment' });
  }
}

module.exports = {
  listEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
};
