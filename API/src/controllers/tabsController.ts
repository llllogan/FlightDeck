import { Request, Response } from 'express';
import { callStoredProcedure } from '../db/helpers';
import {
  getTabGroupById,
  getTabById,
  getLatestTabForGroup,
  listTabsForUser,
  type TabDetailViewRow,
} from '../db/resourceAccess';
import type { CreateTabRequest, RenameTabRequest } from '../models/requestBodies';

type ListResponse = Response<TabDetailViewRow[] | { error: string }>;

type CreateRequest = Request<unknown, unknown, Partial<CreateTabRequest>>;

type TabParams = { tabId: string };

type RenameRequest = Request<TabParams, unknown, Partial<RenameTabRequest>>;

type DeleteRequest = Request<TabParams>;

export async function listTabs(req: Request, res: ListResponse): Promise<void> {
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  try {
    const tabs = await listTabsForUser(userId);
    res.json(tabs);
  } catch (error) {
    console.error('Failed to list tabs', error);
    res.status(500).json({ error: 'Failed to list tabs' });
  }
}

export async function createTab(req: CreateRequest, res: Response): Promise<void> {
  const { userId } = req;
  const { tabGroupId, title } = req.body;

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

    await callStoredProcedure('create_tab', [tabGroupId, title.trim()]);
    const created = await getLatestTabForGroup(tabGroupId);

    if (!created) {
      res.status(201).json({ message: 'Tab created but could not retrieve record' });
      return;
    }

    res.status(201).json({ tab: created });
  } catch (error) {
    console.error('Failed to create tab', error);
    res.status(500).json({ error: 'Failed to create tab' });
  }
}

export async function renameTab(req: RenameRequest, res: Response): Promise<void> {
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
    res.json({ tab: updated });
  } catch (error) {
    console.error('Failed to rename tab', error);
    res.status(500).json({ error: 'Failed to rename tab' });
  }
}

export async function deleteTab(req: DeleteRequest, res: Response): Promise<void> {
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
