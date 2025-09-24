export interface ApiUser {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  tabGroupCount: number;
  tabCount: number;
  environmentCount: number;
}

export interface TabGroup {
  id: string;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TabGroupSummary {
  id: string;
  title: string;
  tabCount: number;
  environmentCount: number;
}

export interface Tab {
  id: string;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface TabWithEnvironments extends Tab {
  environments: Environment[];
}

export interface WorkspaceTabGroup extends TabGroup {
  tabs: TabWithEnvironments[];
}

export interface WorkspaceResponse {
  summary: UserSummary | null;
  tabGroups: WorkspaceTabGroup[];
}

export interface CreateUserPayload {
  name: string;
}

export interface CreateTabGroupPayload {
  title: string;
}

export interface RenameTabGroupPayload {
  title: string;
}

export interface CreateEnvironmentPayload {
  name: string;
  url: string;
}

export interface UpdateEnvironmentPayload {
  name: string;
  url: string;
}

export interface CreateEnvironmentRequest extends CreateEnvironmentPayload {
  tabId: string;
}

export type MoveDirection = 'up' | 'down';

export interface MoveTabGroupPayload {
  direction: MoveDirection;
}

export interface MoveTabPayload {
  direction: MoveDirection;
}

export interface CreateTabPayload {
  tabGroupId: string;
  title: string;
  environment: CreateEnvironmentPayload;
}

export interface RenameTabPayload {
  title: string;
}

export interface HealthResponse {
  status: string;
  database?: string;
}
