import type { Request, Response } from 'express';
import { callStoredProcedure } from '../db/helpers';
import { getTabById, getLatestTabForGroup, getLatestEnvironmentForTab } from '../db/resourceAccess';
import type { CreateTabRequest, MoveTabRequest, RenameTabRequest } from '../models/requestBodies';
import { serializeEnvironment, serializeTab } from '../serializers';
import { sanitizeTextInput } from '../utils/sanitizers';
import type {
  CreateRequest,
  DeleteRequest,
  MoveRequest,
  RenameRequest,
  SerializedEnvironment,
  SerializedTab,
} from '../types/controllers/tabs';

function ensureTabGroupContext(req: Request, res: Response) {
  const tabGroup = req.tabGroup;

  if (!tabGroup) {
    res.status(500).json({ error: 'Tab group context not initialized' });
    return null;
  }

  return tabGroup;
}

function ensureTabContext(req: Request, res: Response) {
  const tab = req.tab;

  if (!tab) {
    res.status(500).json({ error: 'Tab context not initialized' });
    return null;
  }

  return tab;
}

async function createTab(req: CreateRequest, res: Response): Promise<void> {
  const tabGroup = ensureTabGroupContext(req, res);

  if (!tabGroup) {
    return;
  }
  const sanitizedTitle = sanitizeTextInput(req.body?.title);

  if (!sanitizedTitle) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  const environment = req.body?.environment;

  if (!environment || typeof environment !== 'object') {
    res.status(400).json({ error: 'environment payload is required' });
    return;
  }

  const { name, url } = environment;
  const sanitizedName = sanitizeTextInput(name);

  if (!sanitizedName) {
    res.status(400).json({ error: 'Environment name is required' });
    return;
  }

  const sanitizedUrl = sanitizeTextInput(url, { maxLength: 2048 });

  if (!sanitizedUrl) {
    res.status(400).json({ error: 'Environment url is required' });
    return;
  }

  try {
    const resolvedTabGroupId = tabGroup.tabGroupId;

    if (!resolvedTabGroupId) {
      res.status(500).json({ error: 'Tab group record is missing an identifier' });
      return;
    }

    await callStoredProcedure('create_tab', [resolvedTabGroupId, sanitizedTitle]);
    const createdTab = await getLatestTabForGroup(resolvedTabGroupId);

    if (!createdTab) {
      res.status(201).json({ message: 'Tab created but could not retrieve record' });
      return;
    }

    await callStoredProcedure('create_environment', [createdTab.tabId, sanitizedName, sanitizedUrl]);
    const createdEnvironment = await getLatestEnvironmentForTab(createdTab.tabId);

    const serializedTab = serializeTab(createdTab);
    const response: SerializedTab & { environment?: SerializedEnvironment } = serializedTab;

    if (createdEnvironment) {
      response.environment = serializeEnvironment(createdEnvironment);
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Failed to create tab', error);
    res.status(500).json({ error: 'Failed to create tab' });
  }
}

async function renameTab(req: RenameRequest, res: Response): Promise<void> {
  const tab = ensureTabContext(req, res);

  if (!tab) {
    return;
  }
  const sanitizedTitle = sanitizeTextInput(req.body?.title);

  if (!sanitizedTitle) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  try {
    await callStoredProcedure('rename_tab', [tab.tabId, sanitizedTitle]);
    const updated = await getTabById(tab.tabId);

    if (!updated) {
      res.status(500).json({ error: 'Failed to load updated tab' });
      return;
    }

    res.json(serializeTab(updated));
  } catch (error) {
    console.error('Failed to rename tab', error);
    res.status(500).json({ error: 'Failed to rename tab' });
  }
}

async function deleteTab(req: DeleteRequest, res: Response): Promise<void> {
  const tab = ensureTabContext(req, res);

  if (!tab) {
    return;
  }

  try {
    await callStoredProcedure('delete_tab', [tab.tabId]);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete tab', error);
    res.status(500).json({ error: 'Failed to delete tab' });
  }
}

async function moveTab(req: MoveRequest, res: Response): Promise<void> {
  const tab = ensureTabContext(req, res);

  if (!tab) {
    return;
  }
  const { direction } = req.body;

  if (direction !== 'up' && direction !== 'down') {
    res.status(400).json({ error: 'direction must be "up" or "down"' });
    return;
  }

  try {
    await callStoredProcedure('move_tab', [tab.tabId, direction]);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to reorder tab', error);
    res.status(500).json({ error: 'Failed to reorder tab' });
  }
}

export { createTab, renameTab, deleteTab, moveTab };
