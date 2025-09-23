import { Request, Response } from 'express';
import { callStoredProcedure } from '../db/helpers';
import {
  getTabById,
  getEnvironmentById,
  getLatestEnvironmentForTab,
  listEnvironmentsForUser,
  type EnvironmentDetailViewRow,
} from '../db/resourceAccess';
import type {
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
} from '../models/requestBodies';

type ListResponse = Response<EnvironmentDetailViewRow[] | { error: string }>;

type CreateRequest = Request<unknown, unknown, Partial<CreateEnvironmentRequest>>;

type EnvironmentParams = { environmentId: string };

type UpdateRequest = Request<EnvironmentParams, unknown, Partial<UpdateEnvironmentRequest>>;

type DeleteRequest = Request<EnvironmentParams>;

async function listEnvironments(req: Request, res: ListResponse): Promise<void> {
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  try {
    const environments = await listEnvironmentsForUser(userId);
    res.json(environments);
  } catch (error) {
    console.error('Failed to list environments', error);
    res.status(500).json({ error: 'Failed to list environments' });
  }
}

async function createEnvironment(req: CreateRequest, res: Response): Promise<void> {
  const { userId } = req;
  const { tabId, name, url } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!tabId || typeof tabId !== 'string') {
    res.status(400).json({ error: 'tabId is required' });
    return;
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    const tab = await getTabById(tabId);

    if (!tab) {
      res.status(404).json({ error: 'Tab not found' });
      return;
    }

    if (tab.userId !== userId) {
      res.status(403).json({ error: 'You do not have access to this tab' });
      return;
    }

    const sanitizedName = name.trim();
    const sanitizedUrl = url.trim();

    await callStoredProcedure('create_environment', [tabId, sanitizedName, sanitizedUrl]);
    const created = await getLatestEnvironmentForTab(tabId);

    if (!created) {
      res.status(201).json({ message: 'Environment created but could not retrieve record' });
      return;
    }

    res.status(201).json({ environment: created });
  } catch (error) {
    console.error('Failed to create environment', error);
    res.status(500).json({ error: 'Failed to create environment' });
  }
}

async function updateEnvironment(req: UpdateRequest, res: Response): Promise<void> {
  const { userId } = req;
  const { environmentId } = req.params;
  const { name, url } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!environmentId) {
    res.status(400).json({ error: 'environmentId path parameter is required' });
    return;
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    const environment = await getEnvironmentById(environmentId);

    if (!environment) {
      res.status(404).json({ error: 'Environment not found' });
      return;
    }

    if (environment.userId !== userId) {
      res.status(403).json({ error: 'You do not have access to this environment' });
      return;
    }

    const sanitizedName = name.trim();
    const sanitizedUrl = url.trim();

    await callStoredProcedure('update_environment', [environmentId, sanitizedName, sanitizedUrl]);
    const updated = await getEnvironmentById(environmentId);
    res.json({ environment: updated });
  } catch (error) {
    console.error('Failed to update environment', error);
    res.status(500).json({ error: 'Failed to update environment' });
  }
}

async function deleteEnvironment(req: DeleteRequest, res: Response): Promise<void> {
  const { userId } = req;
  const { environmentId } = req.params;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!environmentId) {
    res.status(400).json({ error: 'environmentId path parameter is required' });
    return;
  }

  try {
    const environment = await getEnvironmentById(environmentId);

    if (!environment) {
      res.status(404).json({ error: 'Environment not found' });
      return;
    }

    if (environment.userId !== userId) {
      res.status(403).json({ error: 'You do not have access to this environment' });
      return;
    }

    await callStoredProcedure('delete_environment', [environmentId]);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete environment', error);
    res.status(500).json({ error: 'Failed to delete environment' });
  }
}

export {
  listEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
};
