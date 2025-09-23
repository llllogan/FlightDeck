import { queryAll, querySingle } from './helpers';

export interface UserRecord {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTabGroupViewRow {
  userId: string;
  userName: string;
  tabGroupId: string | null;
  tabGroupTitle: string | null;
  tabGroupCreatedAt: Date | null;
  tabGroupUpdatedAt: Date | null;
}

export interface TabDetailViewRow {
  tabId: string;
  tabTitle: string;
  tabCreatedAt: Date;
  tabUpdatedAt: Date;
  tabGroupId: string;
  tabGroupTitle: string;
  userId: string;
  userName: string;
}

export interface EnvironmentDetailViewRow {
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

export interface TabGroupSummaryRow {
  tabGroupId: string;
  tabGroupTitle: string;
  userId: string;
  userName: string;
  tabCount: number;
  environmentCount: number;
}

export async function getUserById(userId: string): Promise<UserRecord | undefined> {
  return querySingle<UserRecord>('SELECT id, name, createdAt, updatedAt FROM users WHERE id = ?', [userId]);
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
  return queryAll<UserTabGroupViewRow>('SELECT * FROM user_tabgroups_view WHERE userId = ?', [userId]);
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

export async function listTabsForUser(userId: string): Promise<TabDetailViewRow[]> {
  return queryAll<TabDetailViewRow>('SELECT * FROM tab_detail_view WHERE userId = ?', [userId]);
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

export async function listEnvironmentsForUser(userId: string): Promise<EnvironmentDetailViewRow[]> {
  return queryAll<EnvironmentDetailViewRow>('SELECT * FROM environment_detail_view WHERE userId = ?', [userId]);
}

export async function getTabGroupSummaryForUser(userId: string): Promise<TabGroupSummaryRow[]> {
  return queryAll<TabGroupSummaryRow>(
    'SELECT * FROM tabgroup_summary_view WHERE userId = ?',
    [userId],
  );
}
