import { Request, Response } from 'express';
import { callStoredProcedure, querySingle } from '../db/helpers';
import type { CreateUserRequest } from '../models/requestBodies';
import type { UserRecord, UserTabGroupViewRow } from '../db/resourceAccess';
import { listTabGroupsForUser } from '../db/resourceAccess';

interface UserSummaryRow {
  userId: string;
  userName: string;
  tabGroupCount: number;
  tabCount: number;
  environmentCount: number;
}

type CreateUserRequestHandler = Request<unknown, unknown, Partial<CreateUserRequest>>;

type EmptyRequest = Request;

type SummaryResponse = Response<UserSummaryRow | { error: string }>;

type TabGroupsResponse = Response<UserTabGroupViewRow[] | { error: string }>;

type StandardResponse = Response<Record<string, unknown>>;

export async function createUser(req: CreateUserRequestHandler, res: StandardResponse): Promise<void> {
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

    res.status(201).json({ user: createdUser });
  } catch (error) {
    console.error('Failed to create user', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

export async function deleteUser(req: EmptyRequest, res: Response): Promise<void> {
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

export async function getUserSummary(req: EmptyRequest, res: SummaryResponse): Promise<void> {
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  try {
    const summary = await querySingle<UserSummaryRow>(
      'SELECT * FROM user_hierarchy_summary_view WHERE userId = ?',
      [userId],
    );

    if (!summary) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(summary);
  } catch (error) {
    console.error('Failed to fetch user summary', error);
    res.status(500).json({ error: 'Failed to fetch user summary' });
  }
}

export async function getUserTabGroups(req: EmptyRequest, res: TabGroupsResponse): Promise<void> {
  const { userId } = req;

  if (!userId) {
    res.status(400).json({ error: 'Missing user context' });
    return;
  }

  try {
    const rows = await listTabGroupsForUser(userId);
    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch user tab groups', error);
    res.status(500).json({ error: 'Failed to fetch user tab groups' });
  }
}
