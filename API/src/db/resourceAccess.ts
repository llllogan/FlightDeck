import type { RowDataPacket } from 'mysql2/promise';
import { callStoredProcedure, fetchAllFromProcedure, fetchSingleFromProcedure } from './helpers';

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
  return fetchSingleFromProcedure<UserRecord>('get_user_by_id', [userId]);
}

export async function getUserWithPasswordByName(name: string): Promise<UserAuthRecord | undefined> {
  return fetchSingleFromProcedure<UserAuthRecord>('get_user_with_password_by_name', [name]);
}

export async function getUserWithPasswordById(userId: string): Promise<UserAuthRecord | undefined> {
  return fetchSingleFromProcedure<UserAuthRecord>('get_user_with_password_by_id', [userId]);
}

export async function getUserByName(name: string): Promise<UserRecord | undefined> {
  return fetchSingleFromProcedure<UserRecord>('get_user_by_name', [name]);
}

export async function listUsers(): Promise<UserRecord[]> {
  return fetchAllFromProcedure<UserRecord>('list_users');
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
  return fetchSingleFromProcedure<UserTabGroupViewRow>('get_tab_group_by_id', [tabGroupId]);
}

export async function getLatestTabGroupForUser(userId: string): Promise<UserTabGroupViewRow | undefined> {
  return fetchSingleFromProcedure<UserTabGroupViewRow>('get_latest_tab_group_for_user', [userId]);
}

export async function listTabGroupsForUser(userId: string): Promise<UserTabGroupViewRow[]> {
  return fetchAllFromProcedure<UserTabGroupViewRow>('list_tab_groups_for_user', [userId]);
}

export async function getTabById(tabId: string): Promise<TabDetailViewRow | undefined> {
  return fetchSingleFromProcedure<TabDetailViewRow>('get_tab_by_id', [tabId]);
}

export async function getLatestTabForGroup(tabGroupId: string): Promise<TabDetailViewRow | undefined> {
  return fetchSingleFromProcedure<TabDetailViewRow>('get_latest_tab_for_group', [tabGroupId]);
}

export async function listTabsForTabGroup(tabGroupId: string): Promise<TabDetailViewRow[]> {
  return fetchAllFromProcedure<TabDetailViewRow>('list_tabs_for_tab_group', [tabGroupId]);
}

export async function getEnvironmentById(environmentId: string): Promise<EnvironmentDetailViewRow | undefined> {
  return fetchSingleFromProcedure<EnvironmentDetailViewRow>('get_environment_by_id', [environmentId]);
}

export async function getLatestEnvironmentForTab(tabId: string): Promise<EnvironmentDetailViewRow | undefined> {
  return fetchSingleFromProcedure<EnvironmentDetailViewRow>('get_latest_environment_for_tab', [tabId]);
}

export async function getTabGroupSummaryForUser(userId: string): Promise<TabGroupSummaryRow[]> {
  return fetchAllFromProcedure<TabGroupSummaryRow>('get_tab_group_summary_for_user', [userId]);
}

export async function listEnvironmentsForTab(tabId: string): Promise<EnvironmentDetailViewRow[]> {
  return fetchAllFromProcedure<EnvironmentDetailViewRow>('list_environments_for_tab', [tabId]);
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
