import { Request, Response } from 'express';
import { callStoredProcedure, querySingle } from '../db/helpers';
import type { CreateUserRequest } from '../models/requestBodies';
import type { UserRecord } from '../db/resourceAccess';
import {
  listUsers as listUsersFromDb,
  listTabGroupsForUser,
  listTabsForTabGroup,
  listEnvironmentsForTab,
} from '../db/resourceAccess';
import {
  isCompleteTabGroupRow,
  serializeTabGroup,
  serializeUserSummary,
  serializeTab,
  serializeEnvironment,
  type UserSummaryRow as UserSummaryRowData,
} from '../serializers';

type CreateUserRequestHandler = Request<unknown, unknown, Partial<CreateUserRequest>>;

type EmptyRequest = Request;

type SerializedUserSummary = ReturnType<typeof serializeUserSummary>;
type SerializedTabGroup = ReturnType<typeof serializeTabGroup>;
type SerializedTab = ReturnType<typeof serializeTab>;
type SerializedEnvironment = ReturnType<typeof serializeEnvironment>;

type WorkspaceTab = SerializedTab & { environments: SerializedEnvironment[] };
type WorkspaceTabGroup = SerializedTabGroup & { tabs: WorkspaceTab[] };
type WorkspacePayload = {
  summary: SerializedUserSummary | null;
  tabGroups: WorkspaceTabGroup[];
};
type WorkspaceResponse = Response<WorkspacePayload | { error: string }>;

type SummaryResponse = Response<SerializedUserSummary | { error: string }>;

type TabGroupsResponse = Response<SerializedTabGroup[] | { error: string }>;

type StandardResponse = Response<UserRecord | Record<string, unknown>>;

type UsersResponse = Response<UserRecord[] | { error: string }>;

async function listUsers(_req: EmptyRequest, res: UsersResponse): Promise<void> {
  try {
    const users = await listUsersFromDb();
    res.json(users);
  } catch (error) {
    console.error('Failed to list users', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
}

async function createUser(req: CreateUserRequestHandler, res: StandardResponse): Promise<void> {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  try {
    const sanitizedName = name.trim();
    await callStoredProcedure('create_user', [sanitizedName]);

    const createdUser = await querySingle<UserRecord>(
      'SELECT id, name, createdAt, updatedAt FROM users WHERE name = ? ORDER BY createdAt DESC LIMIT 1',
      [sanitizedName],
    );

    if (!createdUser) {
      res.status(201).json({ message: 'User created but could not retrieve record' });
      return;
    }

    res.status(201).json(createdUser);
  } catch (error) {
    console.error('Failed to create user', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

async function deleteUser(req: EmptyRequest, res: Response): Promise<void> {
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  try {
    const existingUser = await querySingle<UserRecord>(
      'SELECT id, name, createdAt, updatedAt FROM users WHERE id = ?',
      [userId],
    );
    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await callStoredProcedure('delete_user', [userId]);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete user', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

async function getUserSummary(req: EmptyRequest, res: SummaryResponse): Promise<void> {
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  try {
    const summary = await querySingle<UserSummaryRowData>(
      'SELECT * FROM user_hierarchy_summary_view WHERE userId = ?',
      [userId],
    );

    if (!summary) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(serializeUserSummary(summary));
  } catch (error) {
    console.error('Failed to fetch user summary', error);
    res.status(500).json({ error: 'Failed to fetch user summary' });
  }
}

async function getUserTabGroups(req: EmptyRequest, res: TabGroupsResponse): Promise<void> {
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  try {
    const rows = await listTabGroupsForUser(userId);
    const tabGroups = rows.filter(isCompleteTabGroupRow).map(serializeTabGroup);

    res.json(tabGroups);
  } catch (error) {
    console.error('Failed to fetch user tab groups', error);
    res.status(500).json({ error: 'Failed to fetch user tab groups' });
  }
}

async function getUserWorkspace(req: EmptyRequest, res: WorkspaceResponse): Promise<void> {
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  try {
    const [summaryRow, tabGroupRows] = await Promise.all([
      querySingle<UserSummaryRowData>(
        'SELECT * FROM user_hierarchy_summary_view WHERE userId = ?',
        [userId],
      ),
      listTabGroupsForUser(userId),
    ]);

    if (!summaryRow) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const tabGroups = await Promise.all(
      tabGroupRows
        .filter(isCompleteTabGroupRow)
        .map(async (row) => {
          const tabs = await listTabsForTabGroup(row.tabGroupId);

          const tabsWithEnvironments = await Promise.all(
            tabs.map(async (tab) => {
              const environments = await listEnvironmentsForTab(tab.tabId);
              return {
                ...serializeTab(tab),
                environments: environments.map(serializeEnvironment),
              };
            }),
          );

          return {
            ...serializeTabGroup(row),
            tabs: tabsWithEnvironments,
          };
        }),
    );

    res.json({
      summary: serializeUserSummary(summaryRow),
      tabGroups,
    });
  } catch (error) {
    console.error('Failed to load workspace', error);
    res.status(500).json({ error: 'Failed to load workspace' });
  }
}

export { listUsers, createUser, deleteUser, getUserSummary, getUserTabGroups, getUserWorkspace };
