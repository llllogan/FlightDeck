import type {
  EnvironmentDetailViewRow,
  TabDetailViewRow,
  TabGroupSummaryRow,
  UserTabGroupViewRow,
} from '../db/resourceAccess';

export interface UserSummaryRow {
  userId: string;
  userName: string;
  tabGroupCount: number;
  tabCount: number;
  environmentCount: number;
}

export function serializeUserSummary(row: UserSummaryRow) {
  return {
    id: row.userId,
    name: row.userName,
    tabGroupCount: row.tabGroupCount,
    tabCount: row.tabCount,
    environmentCount: row.environmentCount,
  };
}

export type CompleteTabGroupRow = UserTabGroupViewRow & {
  tabGroupId: string;
  tabGroupTitle: string;
  tabGroupCreatedAt: Date;
  tabGroupUpdatedAt: Date;
};

export function isCompleteTabGroupRow(row: UserTabGroupViewRow): row is CompleteTabGroupRow {
  return Boolean(
    row.tabGroupId &&
      row.tabGroupTitle &&
      row.tabGroupCreatedAt &&
      row.tabGroupUpdatedAt,
  );
}

export function serializeTabGroup(row: CompleteTabGroupRow) {
  return {
    id: row.tabGroupId,
    title: row.tabGroupTitle,
    createdAt: row.tabGroupCreatedAt,
    updatedAt: row.tabGroupUpdatedAt,
  };
}

export function serializeTab(row: TabDetailViewRow) {
  return {
    id: row.tabId,
    title: row.tabTitle,
    createdAt: row.tabCreatedAt,
    updatedAt: row.tabUpdatedAt,
  };
}

export function serializeEnvironment(row: EnvironmentDetailViewRow) {
  return {
    id: row.environmentId,
    name: row.environmentName,
    url: row.environmentUrl,
    createdAt: row.environmentCreatedAt,
    updatedAt: row.environmentUpdatedAt,
  };
}

export function serializeTabGroupSummary(row: TabGroupSummaryRow) {
  return {
    id: row.tabGroupId,
    title: row.tabGroupTitle,
    tabCount: row.tabCount,
    environmentCount: row.environmentCount,
  };
}
