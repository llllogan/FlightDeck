import type { Request, Response } from 'express';
import { callStoredProcedure } from '../db/helpers';
import {
  getUserById,
  getTabGroupById,
  getLatestTabGroupForUser,
  listTabGroupsForUser,
  getTabGroupSummaryForUser,
  listTabsForTabGroup,
} from '../db/resourceAccess';
import type {
  CreateTabGroupRequest,
  MoveTabGroupRequest,
  RenameTabGroupRequest,
} from '../models/requestBodies';
import { isCompleteTabGroupRow, serializeTab, serializeTabGroup, serializeTabGroupSummary } from '../serializers';
import { sanitizeTextInput } from '../utils/sanitizers';
import type {
  CreateRequest,
  DeleteRequest,
  ListResponse,
  MoveRequest,
  RenameRequest,
  SummaryResponse,
  TabsByGroupResponse,
  TabsRequest,
} from '../types/controllers/tabGroups';

function ensureUserContext(req: Request, res: Response): string | null {
  const userId = req.userId;

  if (!userId) {
    res.status(500).json({ error: 'User context not initialized' });
    return null;
  }

  return userId;
}

function ensureTabGroupContext(req: Request, res: Response) {
  const tabGroup = req.tabGroup;

  if (!tabGroup) {
    res.status(500).json({ error: 'Tab group context not initialized' });
    return null;
  }

  return tabGroup;
}

async function listTabGroups(req: Request, res: ListResponse): Promise<void> {
  const userId = ensureUserContext(req, res);

  if (!userId) {
    return;
  }

  try {
    const groups = await listTabGroupsForUser(userId);
    const tabGroups = groups.filter(isCompleteTabGroupRow).map(serializeTabGroup);

    res.json(tabGroups);
  } catch (error) {
    console.error('Failed to list tab groups', error);
    res.status(500).json({ error: 'Failed to list tab groups' });
  }
}

async function createTabGroup(req: CreateRequest, res: Response): Promise<void> {
  const userId = ensureUserContext(req, res);

  if (!userId) {
    return;
  }

  const sanitizedTitle = sanitizeTextInput(req.body?.title);

  if (!sanitizedTitle) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await callStoredProcedure('create_tab_group', [userId, sanitizedTitle]);
    const createdGroup = await getLatestTabGroupForUser(userId);

    if (!createdGroup) {
      res.status(201).json({ message: 'Tab group created but could not retrieve record' });
      return;
    }

    if (!isCompleteTabGroupRow(createdGroup)) {
      res.status(201).json({ message: 'Tab group created but could not retrieve record' });
      return;
    }

    res.status(201).json(serializeTabGroup(createdGroup));
  } catch (error) {
    console.error('Failed to create tab group', error);
    res.status(500).json({ error: 'Failed to create tab group' });
  }
}

async function renameTabGroup(req: RenameRequest, res: Response): Promise<void> {
  const tabGroup = ensureTabGroupContext(req, res);

  if (!tabGroup) {
    return;
  }
  const sanitizedTitle = sanitizeTextInput(req.body?.title);

  if (!sanitizedTitle) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  try {
    const tabGroupId = tabGroup.tabGroupId;

    if (!tabGroupId) {
      res.status(500).json({ error: 'Tab group record is missing an identifier' });
      return;
    }

    await callStoredProcedure('rename_tab_group', [tabGroupId, sanitizedTitle]);
    const updated = await getTabGroupById(tabGroupId);

    if (!updated || !isCompleteTabGroupRow(updated)) {
      res.status(200).json({ message: 'Tab group renamed but could not retrieve record' });
      return;
    }

    res.json(serializeTabGroup(updated));
  } catch (error) {
    console.error('Failed to rename tab group', error);
    res.status(500).json({ error: 'Failed to rename tab group' });
  }
}

async function deleteTabGroup(req: DeleteRequest, res: Response): Promise<void> {
  const tabGroup = ensureTabGroupContext(req, res);

  if (!tabGroup) {
    return;
  }

  try {
    const tabGroupId = tabGroup.tabGroupId;

    if (!tabGroupId) {
      res.status(500).json({ error: 'Tab group record is missing an identifier' });
      return;
    }

    await callStoredProcedure('delete_tab_group', [tabGroupId]);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete tab group', error);
    res.status(500).json({ error: 'Failed to delete tab group' });
  }
}

async function moveTabGroup(req: MoveRequest, res: Response): Promise<void> {
  const tabGroup = ensureTabGroupContext(req, res);

  if (!tabGroup) {
    return;
  }
  const { direction } = req.body;

  if (direction !== 'up' && direction !== 'down') {
    res.status(400).json({ error: 'direction must be "up" or "down"' });
    return;
  }

  try {
    const tabGroupId = tabGroup.tabGroupId;

    if (!tabGroupId) {
      res.status(500).json({ error: 'Tab group record is missing an identifier' });
      return;
    }

    await callStoredProcedure('move_tab_group', [tabGroupId, direction]);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to reorder tab group', error);
    res.status(500).json({ error: 'Failed to reorder tab group' });
  }
}

async function getTabGroupSummary(req: Request, res: SummaryResponse): Promise<void> {
  const userId = ensureUserContext(req, res);

  if (!userId) {
    return;
  }

  try {
    const summary = await getTabGroupSummaryForUser(userId);
    const formatted = summary.map(serializeTabGroupSummary);
    res.json(formatted);
  } catch (error) {
    console.error('Failed to fetch tab group summary', error);
    res.status(500).json({ error: 'Failed to fetch tab group summary' });
  }
}

async function listTabsForGroup(req: TabsRequest, res: TabsByGroupResponse): Promise<void> {
  const tabGroup = ensureTabGroupContext(req, res);

  if (!tabGroup) {
    return;
  }

  try {
    const tabGroupId = tabGroup.tabGroupId;

    if (!tabGroupId) {
      res.status(500).json({ error: 'Tab group record is missing an identifier' });
      return;
    }

    const tabs = await listTabsForTabGroup(tabGroupId);
    const formatted = tabs.map(serializeTab);
    res.json(formatted);
  } catch (error) {
    console.error('Failed to list tabs for tab group', error);
    res.status(500).json({ error: 'Failed to list tabs for tab group' });
  }
}

export {
  listTabGroups,
  createTabGroup,
  renameTabGroup,
  deleteTabGroup,
  moveTabGroup,
  getTabGroupSummary,
  listTabsForGroup,
};
