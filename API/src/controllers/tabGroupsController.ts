import { Request, Response } from 'express';
import { callStoredProcedure } from '../db/helpers';
import {
  getUserById,
  getTabGroupById,
  getLatestTabGroupForUser,
  listTabGroupsForUser,
  getTabGroupSummaryForUser,
  listTabsForTabGroup,
  type UserTabGroupViewRow,
  type TabGroupSummaryRow,
} from '../db/resourceAccess';
import type {
  CreateTabGroupRequest,
  MoveTabGroupRequest,
  RenameTabGroupRequest,
} from '../models/requestBodies';
import { isCompleteTabGroupRow, serializeTab, serializeTabGroup, serializeTabGroupSummary } from '../serializers';

type SerializedTabGroup = ReturnType<typeof serializeTabGroup>;
type SerializedTabGroupSummary = ReturnType<typeof serializeTabGroupSummary>;
type SerializedTab = ReturnType<typeof serializeTab>;

type ListResponse = Response<SerializedTabGroup[] | { error: string }>;

type SummaryResponse = Response<SerializedTabGroupSummary[] | { error: string }>;

type TabsByGroupResponse = Response<SerializedTab[] | { error: string }>;

type CreateRequest = Request<unknown, unknown, Partial<CreateTabGroupRequest>>;

type RenameParams = { tabGroupId: string };

type RenameRequest = Request<RenameParams, unknown, Partial<RenameTabGroupRequest>>;

type DeleteRequest = Request<RenameParams>;

type MoveRequest = Request<RenameParams, unknown, Partial<MoveTabGroupRequest>>;

type TabsRequestParams = { tabGroupId: string };

type TabsRequest = Request<TabsRequestParams>;

async function listTabGroups(req: Request, res: ListResponse): Promise<void> {
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
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
  const { userId } = req;
  const { title } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const sanitizedTitle = title.trim();
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
  const { userId } = req;
  const { tabGroupId } = req.params;
  const { title } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!tabGroupId) {
    res.status(400).json({ error: 'tabGroupId path parameter is required' });
    return;
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  try {
    const existing = await getTabGroupById(tabGroupId);

    if (!existing) {
      res.status(404).json({ error: 'Tab group not found' });
      return;
    }

    if (existing.userId !== userId) {
      res.status(403).json({ error: 'You do not have access to this tab group' });
      return;
    }

    await callStoredProcedure('rename_tab_group', [tabGroupId, title.trim()]);
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
  const { userId } = req;
  const { tabGroupId } = req.params;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!tabGroupId) {
    res.status(400).json({ error: 'tabGroupId path parameter is required' });
    return;
  }

  try {
    const existing = await getTabGroupById(tabGroupId);

    if (!existing) {
      res.status(404).json({ error: 'Tab group not found' });
      return;
    }

    if (existing.userId !== userId) {
      res.status(403).json({ error: 'You do not have access to this tab group' });
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
  const { userId } = req;
  const { tabGroupId } = req.params;
  const { direction } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!tabGroupId) {
    res.status(400).json({ error: 'tabGroupId path parameter is required' });
    return;
  }

  if (direction !== 'up' && direction !== 'down') {
    res.status(400).json({ error: 'direction must be "up" or "down"' });
    return;
  }

  try {
    const existing = await getTabGroupById(tabGroupId);

    if (!existing) {
      res.status(404).json({ error: 'Tab group not found' });
      return;
    }

    if (existing.userId !== userId) {
      res.status(403).json({ error: 'You do not have access to this tab group' });
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
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
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
  const { userId } = req;
  const { tabGroupId } = req.params;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  if (!tabGroupId) {
    res.status(400).json({ error: 'tabGroupId path parameter is required' });
    return;
  }

  try {
    const tabGroup = await getTabGroupById(tabGroupId);

    if (!tabGroup || tabGroup.userId !== userId) {
      res.status(404).json({ error: 'Tab group not found' });
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
