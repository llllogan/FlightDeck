import { Request, Response } from 'express';
import { callStoredProcedure, querySingle } from '../db/helpers';
import type { CreateUserRequest } from '../models/requestBodies';
import type { UserRecord } from '../db/resourceAccess';
import { listTabGroupsForUser } from '../db/resourceAccess';
import {
  isCompleteTabGroupRow,
  serializeTabGroup,
  serializeUserSummary,
  type UserSummaryRow as UserSummaryRowData,
} from '../serializers';

type CreateUserRequestHandler = Request<unknown, unknown, Partial<CreateUserRequest>>;

type EmptyRequest = Request;

type SerializedUserSummary = ReturnType<typeof serializeUserSummary>;
type SerializedTabGroup = ReturnType<typeof serializeTabGroup>;

type SummaryResponse = Response<SerializedUserSummary | { error: string }>;

type TabGroupsResponse = Response<SerializedTabGroup[] | { error: string }>;

type StandardResponse = Response<Record<string, unknown>>;

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

export { createUser, deleteUser, getUserSummary, getUserTabGroups };
