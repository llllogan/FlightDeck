import { Request, Response } from 'express';
import { callStoredProcedure } from '../db/helpers';
import {
  getTabGroupById,
  getTabById,
  getLatestTabForGroup,
  getLatestEnvironmentForTab,
} from '../db/resourceAccess';
import type { CreateTabRequest, MoveTabRequest, RenameTabRequest } from '../models/requestBodies';
import { serializeEnvironment, serializeTab } from '../serializers';

type SerializedTab = ReturnType<typeof serializeTab>;
type SerializedEnvironment = ReturnType<typeof serializeEnvironment>;

type CreateRequest = Request<unknown, unknown, Partial<CreateTabRequest>>;

type TabParams = { tabId: string };

type RenameRequest = Request<TabParams, unknown, Partial<RenameTabRequest>>;

type DeleteRequest = Request<TabParams>;

type MoveRequest = Request<TabParams, unknown, Partial<MoveTabRequest>>;

async function createTab(req: CreateRequest, res: Response): Promise<void> {
  const { userId } = req;
  const { tabGroupId, title, environment } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!tabGroupId || typeof tabGroupId !== 'string') {
    res.status(400).json({ error: 'tabGroupId is required' });
    return;
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  if (!environment || typeof environment !== 'object') {
    res.status(400).json({ error: 'environment payload is required' });
    return;
  }

  const { name, url } = environment;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Environment name is required' });
    return;
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    res.status(400).json({ error: 'Environment url is required' });
    return;
  }

  try {
    const tabGroup = await getTabGroupById(tabGroupId);

    if (!tabGroup) {
      res.status(404).json({ error: 'Tab group not found' });
      return;
    }

    if (tabGroup.userId !== userId) {
      res.status(403).json({ error: 'You do not have access to this tab group' });
      return;
    }

    const sanitizedTitle = title.trim();
    const sanitizedName = name.trim();
    const sanitizedUrl = url.trim();

    await callStoredProcedure('create_tab', [tabGroupId, sanitizedTitle]);
    const createdTab = await getLatestTabForGroup(tabGroupId);

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
  const { userId } = req;
  const { tabId } = req.params;
  const { title } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!tabId) {
    res.status(400).json({ error: 'tabId path parameter is required' });
    return;
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'Title is required' });
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

    await callStoredProcedure('rename_tab', [tabId, title.trim()]);
    const updated = await getTabById(tabId);

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
  const { userId } = req;
  const { tabId } = req.params;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!tabId) {
    res.status(400).json({ error: 'tabId path parameter is required' });
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

    await callStoredProcedure('delete_tab', [tabId]);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete tab', error);
    res.status(500).json({ error: 'Failed to delete tab' });
  }
}

async function moveTab(req: MoveRequest, res: Response): Promise<void> {
  const { userId } = req;
  const { tabId } = req.params;
  const { direction } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!tabId) {
    res.status(400).json({ error: 'tabId path parameter is required' });
    return;
  }

  if (direction !== 'up' && direction !== 'down') {
    res.status(400).json({ error: 'direction must be "up" or "down"' });
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

    await callStoredProcedure('move_tab', [tabId, direction]);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to reorder tab', error);
    res.status(500).json({ error: 'Failed to reorder tab' });
  }
}

export { createTab, renameTab, deleteTab, moveTab };
