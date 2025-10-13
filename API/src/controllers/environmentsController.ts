import type { Request, Response } from 'express';
import { callStoredProcedure } from '../db/helpers';
import { getEnvironmentById, getLatestEnvironmentForTab, listEnvironmentsForTab } from '../db/resourceAccess';
import type {
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
} from '../models/requestBodies';
import { serializeEnvironment } from '../serializers';
import { sanitizeTextInput } from '../utils/sanitizers';
import type {
  CreateRequest,
  DeleteRequest,
  EnvironmentParams,
  SerializedEnvironment,
  TabEnvironmentRequest,
  TabEnvironmentsResponse,
  UpdateRequest,
} from '../types/controllers/environments';

function ensureTabContext(req: Request, res: Response) {
  const tab = req.tab;

  if (!tab) {
    res.status(500).json({ error: 'Tab context not initialized' });
    return null;
  }

  return tab;
}

function ensureEnvironmentContext(req: Request, res: Response) {
  const environment = req.environment;

  if (!environment) {
    res.status(500).json({ error: 'Environment context not initialized' });
    return null;
  }

  return environment;
}

async function listEnvironmentsForTabHandler(
  req: TabEnvironmentRequest,
  res: TabEnvironmentsResponse,
): Promise<void> {
  const tab = ensureTabContext(req, res);

  if (!tab) {
    return;
  }

  try {
    const environments = await listEnvironmentsForTab(tab.tabId);
    const formatted = environments.map(serializeEnvironment);
    res.json(formatted);
  } catch (error) {
    console.error('Failed to list environments for tab', error);
    res.status(500).json({ error: 'Failed to list environments for tab' });
  }
}

async function createEnvironment(req: CreateRequest, res: Response): Promise<void> {
  const tab = ensureTabContext(req, res);

  if (!tab) {
    return;
  }
  const sanitizedName = sanitizeTextInput(req.body?.name);

  if (!sanitizedName) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const sanitizedUrl = sanitizeTextInput(req.body?.url, { maxLength: 2048 });

  if (!sanitizedUrl) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    await callStoredProcedure('create_environment', [tab.tabId, sanitizedName, sanitizedUrl]);
    const created = await getLatestEnvironmentForTab(tab.tabId);

    if (!created) {
      res.status(201).json({ message: 'Environment created but could not retrieve record' });
      return;
    }

    res.status(201).json(serializeEnvironment(created));
  } catch (error) {
    console.error('Failed to create environment', error);
    res.status(500).json({ error: 'Failed to create environment' });
  }
}

async function updateEnvironment(req: UpdateRequest, res: Response): Promise<void> {
  const environment = ensureEnvironmentContext(req, res);

  if (!environment) {
    return;
  }
  const sanitizedName = sanitizeTextInput(req.body?.name);

  if (!sanitizedName) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const sanitizedUrl = sanitizeTextInput(req.body?.url, { maxLength: 2048 });

  if (!sanitizedUrl) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    await callStoredProcedure('update_environment', [environment.environmentId, sanitizedName, sanitizedUrl]);
    const updated = await getEnvironmentById(environment.environmentId);

    if (!updated) {
      res.status(500).json({ error: 'Failed to load updated environment' });
      return;
    }

    res.json(serializeEnvironment(updated));
  } catch (error) {
    console.error('Failed to update environment', error);
    res.status(500).json({ error: 'Failed to update environment' });
  }
}

async function deleteEnvironment(req: DeleteRequest, res: Response): Promise<void> {
  const environment = ensureEnvironmentContext(req, res);

  if (!environment) {
    return;
  }

  try {
    await callStoredProcedure('delete_environment', [environment.environmentId]);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete environment', error);
    res.status(500).json({ error: 'Failed to delete environment' });
  }
}

export {
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  listEnvironmentsForTabHandler,
};
