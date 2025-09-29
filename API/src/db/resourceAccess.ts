import type { RowDataPacket } from 'mysql2/promise';
import { callStoredProcedure, queryAll, querySingle } from './helpers';

export interface UserRecord extends RowDataPacket {
  id: string;
  name: string;
  role: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAuthRecord extends UserRecord {
  passwordHash: string | null;
}

export interface UserTabGroupViewRow extends RowDataPacket {
  userId: string;
  userName: string;
  tabGroupId: string | null;
  tabGroupTitle: string | null;
  tabGroupSortOrder: number | null;
  tabGroupCreatedAt: Date | null;
  tabGroupUpdatedAt: Date | null;
}

export interface TabDetailViewRow extends RowDataPacket {
  tabId: string;
  tabTitle: string;
  tabSortOrder: number;
  tabCreatedAt: Date;
  tabUpdatedAt: Date;
  tabGroupId: string;
  tabGroupTitle: string;
  userId: string;
  userName: string;
}

export interface EnvironmentDetailViewRow extends RowDataPacket {
  environmentId: string;
  environmentName: string;
  environmentUrl: string;
  environmentCreatedAt: Date;
  environmentUpdatedAt: Date;
  tabId: string;
  tabTitle: string;
  tabGroupId: string;
  tabGroupTitle: string;
  userId: string;
  userName: string;
}

export interface TabGroupSummaryRow extends RowDataPacket {
  tabGroupId: string;
  tabGroupTitle: string;
  userId: string;
  userName: string;
  tabCount: number;
  environmentCount: number;
}

export interface TabSearchViewRow extends RowDataPacket {
  userId: string;
  userName: string;
  tabId: string;
  tabTitle: string;
  tabSortOrder: number;
  tabCreatedAt: Date;
  tabUpdatedAt: Date;
  tabGroupId: string;
  tabGroupTitle: string;
  tabGroupSortOrder: number;
  tabGroupCreatedAt: Date;
  tabGroupUpdatedAt: Date;
  environmentId: string | null;
  environmentName: string | null;
  environmentUrl: string | null;
  environmentCreatedAt: Date | null;
  environmentUpdatedAt: Date | null;
}

export async function getUserById(userId: string): Promise<UserRecord | undefined> {
  return querySingle<UserRecord>(
    'SELECT id, name, role, createdAt, updatedAt FROM users WHERE id = ?',
    [userId],
  );
}

export async function getUserWithPasswordByName(name: string): Promise<UserAuthRecord | undefined> {
  return querySingle<UserAuthRecord>(
    'SELECT id, name, role, passwordHash, createdAt, updatedAt FROM users WHERE name = ? LIMIT 1',
    [name],
  );
}

export async function listUsers(): Promise<UserRecord[]> {
  return queryAll<UserRecord>(
    'SELECT id, name, role, createdAt, updatedAt FROM users ORDER BY createdAt ASC',
  );
}

interface UpdateUserOptions {
  name?: string;
  role?: string | null;
  passwordHash?: string | null;
  updateName: boolean;
  updateRole: boolean;
  updatePassword: boolean;
}

export async function updateUser(
  userId: string,
  options: UpdateUserOptions,
): Promise<void> {
  const { name, role, passwordHash, updateName, updateRole, updatePassword } = options;

  await callStoredProcedure('update_user', [
    userId,
    name ?? null,
    role ?? null,
    passwordHash ?? null,
    updateName ? 1 : 0,
    updateRole ? 1 : 0,
    updatePassword ? 1 : 0,
  ]);
}

export async function getTabGroupById(tabGroupId: string): Promise<UserTabGroupViewRow | undefined> {
  return querySingle<UserTabGroupViewRow>(
    'SELECT * FROM user_tabgroups_view WHERE tabGroupId = ?',
    [tabGroupId],
  );
}

export async function getLatestTabGroupForUser(userId: string): Promise<UserTabGroupViewRow | undefined> {
  return querySingle<UserTabGroupViewRow>(
    'SELECT * FROM user_tabgroups_view WHERE userId = ? ORDER BY tabGroupCreatedAt DESC LIMIT 1',
    [userId],
  );
}

export async function listTabGroupsForUser(userId: string): Promise<UserTabGroupViewRow[]> {
  return queryAll<UserTabGroupViewRow>(
    'SELECT * FROM user_tabgroups_view WHERE userId = ? ORDER BY tabGroupSortOrder ASC, tabGroupCreatedAt ASC',
    [userId],
  );
}

export async function getTabById(tabId: string): Promise<TabDetailViewRow | undefined> {
  return querySingle<TabDetailViewRow>('SELECT * FROM tab_detail_view WHERE tabId = ?', [tabId]);
}

export async function getLatestTabForGroup(tabGroupId: string): Promise<TabDetailViewRow | undefined> {
  return querySingle<TabDetailViewRow>(
    'SELECT * FROM tab_detail_view WHERE tabGroupId = ? ORDER BY tabCreatedAt DESC LIMIT 1',
    [tabGroupId],
  );
}

export async function listTabsForTabGroup(tabGroupId: string): Promise<TabDetailViewRow[]> {
  return queryAll<TabDetailViewRow>(
    'SELECT * FROM tab_detail_view WHERE tabGroupId = ? ORDER BY tabSortOrder ASC, tabCreatedAt ASC',
    [tabGroupId],
  );
}

export async function getEnvironmentById(environmentId: string): Promise<EnvironmentDetailViewRow | undefined> {
  return querySingle<EnvironmentDetailViewRow>(
    'SELECT * FROM environment_detail_view WHERE environmentId = ?',
    [environmentId],
  );
}

export async function getLatestEnvironmentForTab(tabId: string): Promise<EnvironmentDetailViewRow | undefined> {
  return querySingle<EnvironmentDetailViewRow>(
    'SELECT * FROM environment_detail_view WHERE tabId = ? ORDER BY environmentCreatedAt DESC LIMIT 1',
    [tabId],
  );
}

export async function getTabGroupSummaryForUser(userId: string): Promise<TabGroupSummaryRow[]> {
  return queryAll<TabGroupSummaryRow>(
    'SELECT * FROM tabgroup_summary_view WHERE userId = ?',
    [userId],
  );
}

export async function listEnvironmentsForTab(tabId: string): Promise<EnvironmentDetailViewRow[]> {
  return queryAll<EnvironmentDetailViewRow>('SELECT * FROM environment_detail_view WHERE tabId = ?', [tabId]);
}

export async function searchTabsForUser(userId: string, query: string): Promise<TabSearchViewRow[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const [resultSet] = await callStoredProcedure<RowDataPacket[][]>('search_user_tabs', [userId, trimmed]);
  if (!Array.isArray(resultSet)) {
    return [];
  }

  return resultSet as TabSearchViewRow[];
}
