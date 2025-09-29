import { Request, Response } from 'express';
import { hash as hashPassword } from 'bcryptjs';
import { callStoredProcedure, querySingle } from '../db/helpers';
import type { CreateUserRequest, UpdateUserRequest } from '../models/requestBodies';
import type { UserRecord } from '../db/resourceAccess';
import {
  listUsers as listUsersFromDb,
  listTabGroupsForUser,
  listTabsForTabGroup,
  listEnvironmentsForTab,
  getUserById as getUserByIdFromDb,
  updateUser as updateUserInDb,
} from '../db/resourceAccess';
import {
  isCompleteTabGroupRow,
  serializeEnvironment,
  serializeTab,
  serializeTabGroup,
  serializeUser,
  serializeUserSummary,
  type UserSummaryRow as UserSummaryRowData,
} from '../serializers';

type CreateUserRequestHandler = Request<Record<string, never>, unknown, Partial<CreateUserRequest>>;
type UpdateUserRequestHandler = Request<{ userId: string }, Record<string, never>, Partial<UpdateUserRequest>>;

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

type SerializedUser = ReturnType<typeof serializeUser>;
type StandardResponse = Response<SerializedUser | Record<string, unknown>>;

type UsersResponse = Response<SerializedUser[] | { error: string }>;

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureUserContext(req: Request, res: Response): string | null {
  const userId = req.userId;

  if (!userId) {
    res.status(500).json({ error: 'User context not initialized' });
    return null;
  }

  return userId;
}

async function listUsers(_req: EmptyRequest, res: UsersResponse): Promise<void> {
  try {
    const users = await listUsersFromDb();
    res.json(users.map(serializeUser));
  } catch (error) {
    console.error('Failed to list users', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
}

async function createUser(req: CreateUserRequestHandler, res: StandardResponse): Promise<void> {
  const { name, role, password } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  try {
    const sanitizedName = name.trim();
    const sanitizedRole =
      typeof role === 'string'
        ? role.trim() || null
        : role === null
          ? null
          : undefined;

    if (sanitizedRole === undefined && role !== undefined) {
      res.status(400).json({ error: 'Role must be a string or null.' });
      return;
    }

    let passwordHash: string | null = null;
    if (typeof password === 'string') {
      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        res.status(400).json({ error: 'Password cannot be empty.' });
        return;
      }
      passwordHash = await hashPassword(trimmedPassword, 10);
    } else if (password === null) {
      passwordHash = null;
    } else if (password !== undefined) {
      res.status(400).json({ error: 'Password must be a string or null.' });
      return;
    }

    await callStoredProcedure('create_user', [sanitizedName, sanitizedRole ?? null, passwordHash]);

    const createdUser = await querySingle<UserRecord>(
      'SELECT id, name, role, createdAt, updatedAt FROM users WHERE name = ? ORDER BY createdAt DESC LIMIT 1',
      [sanitizedName],
    );

    if (!createdUser) {
      res.status(201).json({ message: 'User created but could not retrieve record' });
      return;
    }

    res.status(201).json(serializeUser(createdUser));
  } catch (error) {
    console.error('Failed to create user', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

async function updateUserDetails(req: UpdateUserRequestHandler, res: StandardResponse): Promise<void> {
  const { userId } = req.params;

  if (!userId || !UUID_V4_REGEX.test(userId)) {
    res.status(400).json({ error: 'Invalid user id' });
    return;
  }

  const body = req.body ?? {};
  const hasName = Object.prototype.hasOwnProperty.call(body, 'name');
  const hasRole = Object.prototype.hasOwnProperty.call(body, 'role');
  const hasPassword = Object.prototype.hasOwnProperty.call(body, 'password');

  if (!hasName && !hasRole && !hasPassword) {
    res.status(400).json({ error: 'At least one field (name, role, password) must be provided.' });
    return;
  }

  let sanitizedName: string | undefined;
  if (hasName) {
    const value = body.name;
    if (typeof value !== 'string' || !value.trim()) {
      res.status(400).json({ error: 'Name must be a non-empty string.' });
      return;
    }
    sanitizedName = value.trim();
  }

  let sanitizedRole: string | null | undefined;
  if (hasRole) {
    const value = body.role;
    if (value === null) {
      sanitizedRole = null;
    } else if (typeof value === 'string') {
      sanitizedRole = value.trim() || null;
    } else {
      res.status(400).json({ error: 'Role must be a string or null.' });
      return;
    }
  }

  let passwordHash: string | null | undefined;
  if (hasPassword) {
    const value = body.password;
    if (value === null) {
      passwordHash = null;
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        res.status(400).json({ error: 'Password cannot be empty.' });
        return;
      }
      passwordHash = await hashPassword(trimmed, 10);
    } else {
      res.status(400).json({ error: 'Password must be a string or null.' });
      return;
    }
  }

  try {
    await updateUserInDb(userId, {
      name: sanitizedName,
      role: sanitizedRole,
      passwordHash,
      updateName: hasName,
      updateRole: hasRole,
      updatePassword: hasPassword,
    });

    const updatedUser = await getUserByIdFromDb(userId);

    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(serializeUser(updatedUser));
  } catch (error) {
    console.error('Failed to update user', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

async function deleteUserById(req: Request<{ userId: string }>, res: Response): Promise<void> {
  const { userId } = req.params;

  if (!userId || !UUID_V4_REGEX.test(userId)) {
    res.status(400).json({ error: 'Invalid user id' });
    return;
  }

  try {
    const existingUser = await querySingle<UserRecord>(
      'SELECT id, name, role, createdAt, updatedAt FROM users WHERE id = ?',
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

async function getUserSummary(req: Request, res: SummaryResponse): Promise<void> {
  const userId = ensureUserContext(req, res);

  if (!userId) {
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

async function getUserTabGroups(req: Request, res: TabGroupsResponse): Promise<void> {
  const userId = ensureUserContext(req, res);

  if (!userId) {
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

async function getUserWorkspace(req: Request, res: WorkspaceResponse): Promise<void> {
  const userId = ensureUserContext(req, res);

  if (!userId) {
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

export {
  listUsers,
  createUser,
  updateUserDetails,
  deleteUserById,
  getUserSummary,
  getUserTabGroups,
  getUserWorkspace,
};
